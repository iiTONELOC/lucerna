import { ChevronDirection } from './model.ts';

const CHEVRON_PATH: Record<ChevronDirection, string> = {
  [ChevronDirection.Left]: 'M15 5 L8 12 L15 19',
  [ChevronDirection.Right]: 'M9 5 L16 12 L9 19',
};

type ChevronProps = {
  readonly className?: string;
  readonly direction: ChevronDirection;
};

export function Chevron({ className, direction }: ChevronProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d={CHEVRON_PATH[direction]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}
