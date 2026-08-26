import type { TrackEdges } from '../shared/useHorizontalTrack.ts';
import { Chevron } from './icons/Chevron.tsx';
import { ChevronDirection } from './icons/model.ts';

const EDGE_CONTROL_CLASS_NAME =
  'pointer-events-none absolute inset-y-0 z-10 flex w-10 items-center justify-center bg-background/70 text-accent-current opacity-0 backdrop-blur-xs transition-opacity focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none group-hover:pointer-events-auto group-hover:opacity-100 [&:focus-visible>span]:ring-2 [&:focus-visible>span]:ring-accent [&:hover>span]:bg-background/85';

const EDGE_GLYPH_CLASS_NAME =
  'flex size-8 items-center justify-center rounded-full bg-background/70 shadow-sm ring-1 ring-hairline backdrop-blur-sm transition-colors';

type TrackEdgeControlsProps = {
  readonly edges: TrackEdges;
  readonly onStep: (direction: number) => void;
};

type EdgeControlProps = {
  readonly direction: ChevronDirection;
  readonly onStep: () => void;
};

function EdgeControl({ direction, onStep }: EdgeControlProps) {
  const back = direction === ChevronDirection.Left;
  const label = back ? 'Previous works' : 'More works';

  return (
    <button
      aria-label={label}
      className={`${EDGE_CONTROL_CLASS_NAME} ${back ? 'left-0 rounded-l-xl' : 'right-0 rounded-r-xl'}`}
      onClick={onStep}
      title={label}
      type="button"
    >
      <span className={EDGE_GLYPH_CLASS_NAME}>
        <Chevron className="size-5" direction={direction} />
      </span>
    </button>
  );
}

export function TrackEdgeControls({ edges, onStep }: TrackEdgeControlsProps) {
  return (
    <>
      {edges.atStart ? null : (
        <EdgeControl direction={ChevronDirection.Left} onStep={() => onStep(-1)} />
      )}
      {edges.atEnd ? null : (
        <EdgeControl direction={ChevronDirection.Right} onStep={() => onStep(1)} />
      )}
    </>
  );
}
