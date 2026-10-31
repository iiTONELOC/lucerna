import type { RefObject } from 'react';
import { classNames } from '../../shared/classNames.ts';
import { activeTargetOf, DrapeAlignment, type DrapeGeometry } from './drape.ts';
import type { DrapeProps } from './prayerSession.ts';
import { DecadeStrand, RosaryDrape } from './RosaryDrape.tsx';
import { decadeStrandOf, strandStyleOf, strandTargetOf } from './decadeStrand.ts';
import { loopBandBottomOf } from './useNotesCollision.ts';

const DRAPE_CLASS_NAME = 'drape-relief pointer-events-none absolute z-30 aspect-(--drape-aspect)';

const MAP_CLASS_NAME = 'top-4 right-4 h-22';

export function Drape({
  className,
  drapeRef,
  ...props
}: DrapeProps & {
  readonly className: string;
  readonly drapeRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={drapeRef} className={`${DRAPE_CLASS_NAME} ${className}`}>
      <div className="pointer-events-none size-full">
        <RosaryDrape
          alignment={DrapeAlignment.TailRight}
          anchors={props.anchors}
          geometry={props.geometry}
          onSelect={props.onSelect}
          prayedThroughBeadIndex={props.prayedThroughBeadIndex}
          target={activeTargetOf(props.geometry, props.anchor)}
        />
      </div>
    </div>
  );
}

export function DrapeBandSizer({
  className,
  geometry,
}: {
  readonly className: string;
  readonly geometry: DrapeGeometry;
}) {
  const bandHeight = loopBandBottomOf(geometry) - geometry.viewBox.y;
  const viewBox = ['0', '0', String(geometry.viewBox.width), String(bandHeight)].join(' ');

  return <svg aria-hidden="true" className={classNames('block', className)} viewBox={viewBox} />;
}

function Strand({ drape, inFlow }: { readonly drape: DrapeProps; readonly inFlow: boolean }) {
  const strand = decadeStrandOf(drape.geometry, drape.decade);

  return (
    <div
      className={classNames(
        'drape-relief z-20 mx-auto max-w-(--strand-natural-width)',
        inFlow ? 'relative min-w-0 flex-1' : 'absolute inset-x-4 bottom-4',
      )}
    >
      <DecadeStrand
        onSelect={drape.onSelect}
        prayedThroughBeadIndex={drape.prayedThroughBeadIndex}
        strand={strand}
        target={strandTargetOf(strand, drape.anchor)}
      />
    </div>
  );
}

export function DecadeBand({
  drape,
  drapeRef,
}: {
  readonly drape: DrapeProps;
  readonly drapeRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex items-end gap-3 px-4 py-2" style={strandStyleOf(drape)}>
      <Strand drape={drape} inFlow />
      <div className="relative aspect-(--drape-aspect) h-22 shrink-0">
        <Drape {...drape} className="inset-0" drapeRef={drapeRef} />
      </div>
    </div>
  );
}

export function DecadeOverlay({
  drape,
  drapeRef,
}: {
  readonly drape: DrapeProps;
  readonly drapeRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <>
      <Strand drape={drape} inFlow={false} />
      <Drape {...drape} className={MAP_CLASS_NAME} drapeRef={drapeRef} />
    </>
  );
}
