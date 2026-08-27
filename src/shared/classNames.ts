export const classNames = (...values: readonly (false | string | undefined)[]): string =>
  values.filter(Boolean).join(' ');
