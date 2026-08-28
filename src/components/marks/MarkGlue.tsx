import type { ReactNode } from 'react';
import { tailStartOf } from '../../shared/text.ts';
import { runText } from './runText.tsx';

export function MarkGlue({ children }: { readonly children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}

export function GluedTail({
  children,
  className,
  text,
}: {
  readonly children: ReactNode;
  readonly className?: string | undefined;
  readonly text: string;
}) {
  const tailStart = tailStartOf(text);

  return (
    <>
      {runText(text.slice(0, tailStart), className)}
      <MarkGlue>
        {runText(text.slice(tailStart), className)}
        {children}
      </MarkGlue>
    </>
  );
}
