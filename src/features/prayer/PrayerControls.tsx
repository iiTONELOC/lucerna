import { SettingsButton } from '../../components/buttons/SettingsButton.tsx';
import { useReading } from '../../content/reading.ts';
import { ACTION_TEXT_CLASS_NAME, QUIET_BUTTON_CLASS_NAME } from '../../styles.ts';
import type { ControlsBundle } from './prayerSession.ts';

function PlaybackIcon({ playing }: { readonly playing: boolean }) {
  return playing ? (
    <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 16 16">
      <rect height="12" rx="1" width="3.4" x="3" y="2" />
      <rect height="12" rx="1" width="3.4" x="9.6" y="2" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M4.5 2.5v11l9-5.5z" />
    </svg>
  );
}

function PlaybackButton({
  onToggle,
  playing,
}: {
  readonly onToggle: () => void;
  readonly playing: boolean;
}) {
  const { wording } = useReading();
  const label = playing ? wording.prayer.pauseGuided : wording.prayer.beginGuided;

  return (
    <button
      aria-label={label}
      aria-pressed={playing}
      className="flex size-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-accent-current focus-ring"
      data-playback-control="true"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <PlaybackIcon playing={playing} />
    </button>
  );
}

export function PrayerControls({ actions, state }: ControlsBundle) {
  const { wording } = useReading();
  return (
    <footer
      className="relative z-20 flex min-h-11 shrink-0 items-center gap-1 px-2 sm:min-h-12 sm:px-0 sm:pt-2"
      data-layout-region="controls"
    >
      <button className={`${QUIET_BUTTON_CLASS_NAME} px-2`} onClick={actions.onExit} type="button">
        {wording.prayer.exit}
      </button>

      <PlaybackButton onToggle={actions.onTogglePlayback} playing={state.playing} />
      <SettingsButton onOpen={actions.onOpenSettings} />

      <span className="min-w-0 flex-1" />

      <button
        className={`${QUIET_BUTTON_CLASS_NAME} px-2 disabled:cursor-not-allowed disabled:opacity-30`}
        disabled={state.atStart}
        onClick={actions.onBack}
        type="button"
      >
        {wording.common.back}
      </button>
      <button
        className={`${ACTION_TEXT_CLASS_NAME} px-2 text-accent-current underline decoration-accent-current underline-offset-8 hover:text-accent-strong`}
        onClick={actions.onForward}
        type="button"
      >
        {state.atEnd ? wording.prayer.finish : wording.prayer.continue}
      </button>
    </footer>
  );
}
