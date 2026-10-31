import type { CSSProperties, RefObject } from 'react';
import { classNames } from '../../shared/classNames.ts';
import { effectiveBeadMaterial } from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { AmbientGround } from '../../components/art/AmbientGround.tsx';
import { ViewHeader } from '../../components/layout.tsx';
import {
  usePrayerFocusSession,
  type DrapeProps,
  type HeadingProps,
  type PrayerFocusProps,
  type PrayerFocusSession,
} from './prayerSession.ts';
import { pendantLeftOf } from './usePendantOverhang.ts';
import { SCROLL_FALLBACK_MAXIMUM_HEIGHT } from './usePrayerFit.ts';
import { Drape, DrapeBandSizer } from './PrayerDrape.tsx';
import { ArtworkPage } from './ArtworkPage.tsx';
import { PrayerReadingPage, TAIL_CLEARANCE_CLASS_NAME } from './ReadingPage.tsx';
import { PrayerControls } from './PrayerControls.tsx';
import { useLandscape } from '../../shared/useLandscape.ts';
import { decadeViewOf } from './decadeStrand.ts';

const ARTWORK_MINIMUM_HEIGHT = 200;

const STAGE_MAXIMUM_HEIGHT = 896;

const LANDSCAPE_STAGE_MINIMUM_HEIGHT = 516;

type StageStyle = CSSProperties & {
  readonly '--drape-aspect': string;
  readonly '--prayer-stage-maximum-height': string;
  readonly '--prayer-stage-minimum-height': string;
  readonly '--prayer-artwork-minimum-height': string;
  readonly '--drape-pendant-left': string;
  readonly '--prayer-landscape-minimum-height': string;
  readonly '--drape-inset': string;
  readonly '--reading-page-maximum': string;
  readonly '--tail-clearance': string;
};

const stageStyleOf = (drape: DrapeProps): StageStyle => ({
  '--drape-aspect':
    String(drape.geometry.viewBox.width) + ' / ' + String(drape.geometry.viewBox.height),
  '--prayer-stage-maximum-height': String(STAGE_MAXIMUM_HEIGHT) + 'px',
  '--prayer-stage-minimum-height': String(SCROLL_FALLBACK_MAXIMUM_HEIGHT) + 'px',
  '--prayer-artwork-minimum-height': String(ARTWORK_MINIMUM_HEIGHT) + 'px',
  '--drape-pendant-left': String(pendantLeftOf(drape.geometry)),
  '--prayer-landscape-minimum-height': String(LANDSCAPE_STAGE_MINIMUM_HEIGHT) + 'px',
  '--drape-inset': 'calc(var(--spacing) * 4)',
  '--reading-page-maximum': decadeViewOf(drape)
    ? '65ch'
    : `calc(${String(drape.geometry.viewBox.width)}px + 2 * var(--drape-inset))`,
  '--tail-clearance': decadeViewOf(drape)
    ? 'calc(var(--spacing) * 6)'
    : 'calc((1 - var(--drape-pendant-left)) * (100% - 2 * var(--drape-inset)) + var(--drape-inset) + 0.5rem)',
});

function PrayerHeading({
  dense,
  headingRef,
  rubric,
  title,
}: HeadingProps & {
  readonly dense: boolean;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <ViewHeader
      className={classNames(
        'relative z-10 col-start-1 row-start-1 min-w-0 gap-1 landscape:row-start-2',
        TAIL_CLEARANCE_CLASS_NAME,
        dense
          ? 'px-4 pt-3 pb-2 landscape:px-5 landscape:pt-3 landscape:pb-1'
          : 'px-4 pt-2 pb-1 sm:px-6 sm:pt-3 landscape:px-6 landscape:pt-4 landscape:pb-2 spread:px-8 spread:pt-8 spread:pb-4',
      )}
      eyebrow={rubric}
      headingRef={headingRef}
      title={title}
      titleClassName="wrap-break-word"
    />
  );
}

function PrayerBook({ session }: { readonly session: PrayerFocusSession }) {
  const { display, drape, fit, onOpenArtwork, refs } = session;
  const landscape = useLandscape();

  return (
    <div
      ref={refs.surface}
      className={classNames(
        'relative grid max-h-full min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-outline bg-background/45 shadow-2xl backdrop-blur-sm in-data-[theme=light]:shadow-none landscape:grid-cols-[minmax(0,min(calc(100%/1.92),var(--reading-page-maximum)))_minmax(0,1fr)] landscape:grid-rows-[max-content_max-content_minmax(0,1fr)]',
        fit.showArtwork
          ? 'grid-rows-[max-content_minmax(var(--prayer-artwork-minimum-height),1fr)_minmax(0,max-content)]'
          : 'grid-rows-[max-content_max-content_minmax(0,1fr)]',
      )}
      data-layout-region="surface"
    >
      <PrayerHeading
        dense={fit.dense}
        headingRef={refs.heading}
        rubric={display.heading.rubric}
        title={display.heading.title}
      />
      <ArtworkPage
        artwork={display.artwork}
        artworkRef={refs.artwork}
        drape={drape}
        drapeRef={refs.drape}
        notes={{
          guidedPlayback: session.playback,
          offering: display.offering,
          onOpenReference: session.onOpenReference,
          showGuidance: fit.showGuidance,
          step: display.step,
        }}
        notesCollision={session.notesCollision}
        notesRef={refs.notes}
        onOpenArtwork={onOpenArtwork}
        showArtwork={fit.showArtwork}
        source={display.source}
      />
      {landscape && !decadeViewOf(drape) ? (
        <>
          <DrapeBandSizer
            className="col-start-1 row-start-1 mx-(--drape-inset) mt-(--drape-inset) w-[calc(100%-2*var(--drape-inset))]"
            geometry={drape.geometry}
          />
          <Drape
            {...drape}
            className="inset-x-(--drape-inset) top-(--drape-inset) col-start-1 col-end-2 row-start-1 row-end-4"
            drapeRef={refs.drape}
          />
        </>
      ) : null}
      <PrayerReadingPage session={session} />
    </div>
  );
}

function PrayerFocusStage({ session }: { readonly session: PrayerFocusSession }) {
  const { controls, display, drape, fit, preferences, refs } = session;
  const { resolvedTheme } = usePreferences();

  return (
    <section
      ref={refs.stage}
      aria-label="Rosary prayer"
      className="scroll-region relative h-full min-h-0 overflow-hidden text-foreground landscape:overflow-y-auto"
      data-bead-material={effectiveBeadMaterial(preferences, resolvedTheme)}
      style={stageStyleOf(drape)}
    >
      <AmbientGround source={display.source} />

      <div
        className={classNames(
          'relative z-10 mx-auto flex h-full w-full max-w-160 flex-col pt-safe-top pb-safe-bottom landscape:max-w-360',
          fit.dense ? 'py-2 sm:p-2' : 'py-2 sm:p-3 landscape:p-2 spread:p-5',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col landscape:my-auto landscape:h-full landscape:max-h-(--prayer-stage-maximum-height) landscape:min-h-(--prayer-landscape-minimum-height)">
          <PrayerBook session={session} />
          <PrayerControls actions={controls.actions} state={controls.state} />
        </div>
      </div>
    </section>
  );
}

export function PrayerFocus(props: PrayerFocusProps) {
  const session = usePrayerFocusSession(props);

  return <PrayerFocusStage session={session} />;
}
