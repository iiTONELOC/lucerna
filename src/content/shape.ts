import { isRecord, type UnknownRecord } from '../shared/guards.ts';

export class ContentSchemaError extends Error {
  override readonly name = 'ContentSchemaError';

  constructor(path: string) {
    super(`Invalid devotional content at ${path}`);
  }
}

export const invalid = (path: string): never => {
  throw new ContentSchemaError(path);
};

export type Parser<Value> = (value: unknown, path: string) => Value;

export type FieldSpec<Value, Optional extends boolean> = {
  readonly optional: Optional;
  readonly parse: Parser<Value>;
};

type Spec = Readonly<Record<string, FieldSpec<unknown, boolean>>>;

type ValueOf<Field> = Field extends FieldSpec<infer Value, boolean> ? Value : never;

type RequiredKeys<S extends Spec> = {
  readonly [Key in keyof S as S[Key] extends FieldSpec<unknown, false> ? Key : never]: ValueOf<
    S[Key]
  >;
};

type OptionalKeys<S extends Spec> = {
  readonly [Key in keyof S as S[Key] extends FieldSpec<unknown, true> ? Key : never]?: ValueOf<
    S[Key]
  >;
};

type Flatten<Value> = { readonly [Key in keyof Value]: Value[Key] };

export type Shaped<S extends Spec> = Flatten<RequiredKeys<S> & OptionalKeys<S>>;

type Tagged<Tag extends string, S extends Spec> = Shaped<S> & { readonly kind: Tag };

type Variant<Value> = { readonly tags: readonly unknown[]; readonly parse: Parser<Value> };

type Enumeration = Readonly<Record<string, string | number>>;

export const joinPath = (path: string, key: string): string =>
  path === '' ? key : `${path}.${key}`;

export const recordFrom = (value: unknown, path: string): UnknownRecord =>
  isRecord(value) ? value : invalid(path);

export const arrayFrom = (value: unknown, path: string): readonly unknown[] =>
  Array.isArray(value) ? value : invalid(path);

const nested = <Value>(parse: Parser<Value>): FieldSpec<Value, false> => ({
  optional: false,
  parse,
});

const membersOf = (enumeration: Enumeration): readonly unknown[] =>
  Object.entries(enumeration)
    .filter(([key]) => Number.isNaN(Number(key)))
    .map(([, member]) => member);

export const field = {
  nested,
  string: (): FieldSpec<string, false> =>
    nested((value, path) =>
      typeof value === 'string' && value.length > 0 ? value : invalid(path),
    ),
  integer: (minimum: number): FieldSpec<number, false> =>
    nested((value, path) =>
      typeof value === 'number' && Number.isInteger(value) && value >= minimum
        ? value
        : invalid(path),
    ),
  boolean: (): FieldSpec<boolean, false> =>
    nested((value, path) => (typeof value === 'boolean' ? value : invalid(path))),
  literal: <Value extends string | number>(expected: Value): FieldSpec<Value, false> =>
    nested((value, path) => (value === expected ? expected : invalid(path))),
  member: <Enum extends Enumeration>(
    enumeration: Enum,
  ): FieldSpec<Enum[Extract<keyof Enum, string>], false> => {
    const members = membersOf(enumeration);
    const isMember = (value: unknown): value is Enum[Extract<keyof Enum, string>] =>
      members.includes(value);

    return nested((value, path) => (isMember(value) ? value : invalid(path)));
  },
  array: <Value>(item: FieldSpec<Value, false>): FieldSpec<readonly Value[], false> =>
    nested((value, path) =>
      arrayFrom(value, path).map((entry, index) => item.parse(entry, `${path}[${index}]`)),
    ),
  record: <Value>(
    item: FieldSpec<Value, false>,
  ): FieldSpec<Readonly<Record<string, Value>>, false> =>
    nested((value, path) =>
      Object.fromEntries(
        Object.entries(recordFrom(value, path)).map(([key, entry]) => [
          key,
          item.parse(entry, joinPath(path, key)),
        ]),
      ),
    ),
  optional: <Value>(item: FieldSpec<Value, false>): FieldSpec<Value, true> => ({
    optional: true,
    parse: item.parse,
  }),
};

export const refine = <Value>(
  item: FieldSpec<Value, false>,
  check: (value: Value, path: string) => void,
): FieldSpec<Value, false> =>
  nested((value, path) => {
    const parsed = item.parse(value, path);
    check(parsed, path);

    return parsed;
  });

export const nonEmpty = <Value>(
  item: FieldSpec<readonly Value[], false>,
): FieldSpec<readonly Value[], false> =>
  refine(item, (list, path) => {
    if (list.length === 0) {
      invalid(path);
    }
  });

export const shape =
  <S extends Spec>(spec: S): Parser<Shaped<S>> =>
  (value, path) => {
    const record = recordFrom(value, path);
    const parsed: UnknownRecord = {};

    for (const [key, item] of Object.entries(spec)) {
      const raw = record[key];

      if (raw !== undefined || !item.optional) {
        parsed[key] = item.parse(raw, joinPath(path, key));
      }
    }

    return parsed as Shaped<S>; // every key above was parsed by its own FieldSpec
  };

export const variant = <Tag extends string, S extends Spec>(
  tags: readonly Tag[],
  spec: S,
): Variant<Tagged<Tag, S>> => {
  const parseFields = shape(spec);

  return {
    tags,
    parse: (value, path) => {
      const kind = tags.find((tag) => tag === recordFrom(value, path)['kind']);

      return kind === undefined
        ? invalid(joinPath(path, 'kind'))
        : { kind, ...parseFields(value, path) };
    },
  };
};

export const taggedUnion =
  <Values extends readonly unknown[]>(variants: {
    readonly [Index in keyof Values]: Variant<Values[Index]>;
  }): Parser<Values[number]> =>
  (value, path) => {
    const kind = recordFrom(value, path)['kind'];
    const found = variants.find((candidate) => candidate.tags.includes(kind));

    return found === undefined ? invalid(joinPath(path, 'kind')) : found.parse(value, path);
  };

export const stringFrom = (record: UnknownRecord, key: string, path: string): string =>
  field.string().parse(record[key], joinPath(path, key));

export const positiveIntegerFrom = (record: UnknownRecord, key: string, path: string): number =>
  field.integer(1).parse(record[key], joinPath(path, key));
