import type { RefObject } from 'react';
import { EYEBROW_CLASS_NAME, SUBTITLE_CLASS_NAME, TITLE_CLASS_NAME } from '../../styles.ts';

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
    <header
      className={`flex flex-col items-center gap-3 pt-6 text-center ${tight ? 'pb-4' : 'pb-8'}`}
    >
      <p className={EYEBROW_CLASS_NAME}>{eyebrow}</p>
      <h1 className={`${TITLE_CLASS_NAME} focus:outline-none`} ref={headingRef} tabIndex={-1}>
        {title}
      </h1>
      {subtitle === undefined ? null : (
        <p className={`${SUBTITLE_CLASS_NAME} text-muted`}>{subtitle}</p>
      )}
    </header>
  );
}
