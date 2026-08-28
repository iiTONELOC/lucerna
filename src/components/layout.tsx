import { Fragment, type ReactNode, type RefObject } from 'react';
import { classNames } from '../shared/classNames.ts';
import { useHorizontalTrack } from '../shared/useHorizontalTrack.ts';
import {
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  HORIZONTAL_TRACK_CLASS_NAME,
  SCRIPTURE_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../styles.ts';
import { TrackEdgeControls } from './TrackEdgeControls.tsx';

export function FocusPage({
  children,
  className,
  label,
  labelledBy,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly label?: string;
  readonly labelledBy?: string;
}) {
  return (
    <main
      aria-label={label}
      aria-labelledby={labelledBy}
      className={classNames(
        'scroll-region h-dvh overflow-x-hidden overflow-y-auto bg-background pt-safe-top pb-safe-bottom text-foreground',
        className,
      )}
    >
      {children}
    </main>
  );
}

type ViewHeaderProps = {
  readonly children?: ReactNode;
  readonly className?: string;
  readonly eyebrow?: string;
  readonly headingRef?: RefObject<HTMLHeadingElement | null>;
  readonly id?: string;
  readonly lede?: ReactNode;
  readonly ledeClassName?: string;
  readonly subtitle?: string | undefined;
  readonly title: string;
  readonly titleClassName?: string;
};

export function ViewHeader({
  children,
  className = 'gap-2',
  eyebrow,
  headingRef,
  id,
  lede,
  ledeClassName = SCRIPTURE_CLASS_NAME,
  subtitle,
  title,
  titleClassName,
}: ViewHeaderProps) {
  return (
    <header className={classNames('flex flex-col', className)}>
      {eyebrow === undefined ? null : <p className={EYEBROW_CLASS_NAME}>{eyebrow}</p>}
      <h1
        className={classNames(
          TITLE_CLASS_NAME,
          headingRef !== undefined && 'focus:outline-none',
          titleClassName,
        )}
        id={id}
        ref={headingRef}
        tabIndex={headingRef === undefined ? undefined : -1}
      >
        {title}
      </h1>
      {subtitle === undefined ? null : (
        <p className={`${SUBTITLE_CLASS_NAME} text-muted`}>{subtitle}</p>
      )}
      {lede === undefined ? null : (
        <p className={classNames('max-w-prose', ledeClassName)}>{lede}</p>
      )}
      {children}
    </header>
  );
}

export type DetailRow = readonly [term: string, detail: ReactNode | undefined];

export const DETAIL_TERM_CLASS_NAME = 'small-caps tracking-subtitle text-muted';

const LIST_CLASS_NAME = `grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 ${CITATION_CLASS_NAME}`;

export function DetailList({
  className,
  rows,
  termClassName = DETAIL_TERM_CLASS_NAME,
}: {
  readonly className?: string;
  readonly rows: readonly DetailRow[];
  readonly termClassName?: string;
}) {
  return (
    <dl className={classNames(LIST_CLASS_NAME, className)}>
      {rows.map(([term, detail]) =>
        detail === undefined ? null : (
          <Fragment key={term}>
            <dt className={termClassName}>{term}</dt>
            <dd className="wrap-break-word text-secondary">{detail}</dd>
          </Fragment>
        ),
      )}
    </dl>
  );
}

type ShelfProps = {
  readonly children: ReactNode;
  readonly heading?: string;
  readonly items: readonly unknown[];
  readonly label: string;
  readonly trackClassName?: string;
};

export function Shelf({
  children,
  heading,
  items,
  label,
  trackClassName = 'items-start gap-4',
}: ShelfProps) {
  const { edges, handlers, scrollByPage, trackRef } = useHorizontalTrack<HTMLUListElement>(items);

  return (
    <section className="flex min-w-0 flex-col gap-3">
      {heading === undefined ? null : (
        <h2 className={`${TITLE_CLASS_NAME} border-b border-hairline pb-2`}>{heading}</h2>
      )}
      <div className="group relative flex min-w-0 flex-col @container">
        <ul
          aria-label={label}
          className={classNames(HORIZONTAL_TRACK_CLASS_NAME, 'list-none', trackClassName)}
          ref={trackRef}
          {...handlers}
        >
          {children}
        </ul>
        <TrackEdgeControls edges={edges} onStep={scrollByPage} />
      </div>
    </section>
  );
}
