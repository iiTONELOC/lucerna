import type { RefObject } from 'react';
import { ViewHeader } from '../../components/layout.tsx';

export function ReaderHeader({
  eyebrow,
  headingRef,
  subtitle,
  tight = false,
  title,
}: {
  readonly eyebrow: string;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly subtitle?: string | undefined;
  readonly tight?: boolean;
  readonly title: string;
}) {
  return (
    <ViewHeader
      className={`items-center gap-3 pt-6 text-center ${tight ? 'pb-4' : 'pb-8'}`}
      eyebrow={eyebrow}
      headingRef={headingRef}
      subtitle={subtitle}
      title={title}
    />
  );
}
