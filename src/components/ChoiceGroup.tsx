import type { ReactNode } from 'react';
import { BODY_CLASS_NAME } from '../styles.ts';

export const CHOICE_CLASS_NAME = `min-h-11 border-b border-transparent px-1 ${BODY_CLASS_NAME} text-muted transition-colors hover:text-foreground aria-pressed:border-accent aria-pressed:text-accent-current focus-ring`;

const GROUP_CLASS_NAME = 'flex flex-wrap gap-x-5';

type ChoiceGroupProps<Value extends string | number> = {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly itemClassName?: string;
  readonly label: string;
  readonly labelOf: (value: Value) => string;
  readonly onSelect: (value: Value) => void;
  readonly selected: Value;
  readonly tabs?: boolean;
  readonly values: readonly Value[];
};

export function ChoiceGroup<Value extends string | number>({
  children,
  className = GROUP_CLASS_NAME,
  itemClassName = CHOICE_CLASS_NAME,
  label,
  labelOf,
  onSelect,
  selected,
  tabs = false,
  values,
}: ChoiceGroupProps<Value>) {
  return (
    <div aria-label={label} className={className} role={tabs ? 'tablist' : 'group'}>
      {children}
      {values.map((value) => {
        const active = value === selected;

        return (
          <button
            aria-pressed={tabs ? undefined : active}
            aria-selected={tabs ? active : undefined}
            className={itemClassName}
            key={value}
            onClick={() => onSelect(value)}
            role={tabs ? 'tab' : undefined}
            type="button"
          >
            {labelOf(value)}
          </button>
        );
      })}
    </div>
  );
}
