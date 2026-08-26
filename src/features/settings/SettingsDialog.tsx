import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import {
  BeadMaterial,
  OpeningDuration,
  READING_SPEED_MAXIMUM,
  READING_SPEED_MINIMUM,
  READING_SPEED_PRESETS,
  READING_SPEED_STEP,
  ReadingSpeed,
  TextScale,
  UpdateChecks,
} from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { AboutSettings } from './AboutSettings.tsx';
import { DiagnosticsSettings } from './DiagnosticsSettings.tsx';

const SETTINGS_TITLE_ID = 'settings-title';
const UPDATE_CHECKS_LABEL: Readonly<Record<UpdateChecks, string>> = {
  [UpdateChecks.OnLoad]: 'When it opens',
  [UpdateChecks.WhileOpen]: 'Also while open',
};
const UPDATE_CHECKS_DESCRIPTION: Readonly<Record<UpdateChecks, string>> = {
  [UpdateChecks.OnLoad]: 'Lucerna looks for a new version once, as it starts.',
  [UpdateChecks.WhileOpen]: 'If Lucerna is in installed, the app also looks every twenty minutes.',
};
const READING_SPEED_ID = 'reading-speed';
const TEXT_SCALE_VALUES: readonly TextScale[] = Object.values(TextScale);

const TEXT_CHOICE_CLASS_NAME =
  'min-h-11 border-b border-transparent px-1 font-display text-body leading-body text-muted transition-colors hover:text-foreground aria-pressed:border-accent aria-pressed:text-accent-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const enumLabel = (
  domain: Readonly<Record<string, string | number>>,
  value: string | number,
): string => {
  const memberName = Object.entries(domain).find(([, memberValue]) => memberValue === value)?.[0];
  const labelSource = memberName ?? String(value);

  return Array.from(labelSource, (character, index) => {
    const uppercaseLetter =
      character.toUpperCase() === character && character.toLowerCase() !== character;

    return index > 0 && uppercaseLetter ? ' ' + character : character;
  }).join('');
};

const readingSpeedLabel = (readingSpeed: number): string => {
  const preset = READING_SPEED_PRESETS.find((value) => value === readingSpeed);
  const multiplier = String(Number(readingSpeed.toFixed(2)));

  return `${preset === undefined ? 'Custom' : ReadingSpeed[preset]} · ${multiplier}×`;
};

const openingDurationLabel = (openingDuration: OpeningDuration): string =>
  openingDuration === OpeningDuration.Manual ? 'Manual' : `${openingDuration} seconds`;

function SettingsGroup({
  legend,
  children,
}: {
  readonly legend: string;
  readonly children: ReactNode;
}) {
  return (
    <fieldset className="border-t border-hairline py-4">
      <legend className="small-caps px-0 font-display text-subtitle leading-subtitle font-semibold tracking-subtitle text-accent-current">
        {legend}
      </legend>
      <div className="[&>label:first-child]:border-t-0">{children}</div>
    </fieldset>
  );
}

function SwitchChoice({
  label,
  description,
  value,
  onChange,
}: {
  readonly label: string;
  readonly description: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <label className="grid min-h-14 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-hairline py-3">
      <span className="font-display text-body leading-body text-foreground">{label}</span>
      <span className="font-display text-citation leading-citation text-muted">{description}</span>
      <input
        checked={value}
        className="peer sr-only"
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="relative col-start-2 row-span-2 row-start-1 h-5 w-9 rounded-full bg-border transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-foreground after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      />
    </label>
  );
}

type SettingsDialogRefs = {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly returnFocusRef: RefObject<HTMLElement | null>;
};

function useSettingsDialog(open: boolean): SettingsDialogRefs {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocusRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (open && !dialog.open) {
      const activeElement = document.activeElement;
      returnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
      dialog.showModal();
      headingRef.current?.focus();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return { dialogRef, headingRef, returnFocusRef };
}

function SettingsHeader({
  headingRef,
  onClose,
}: {
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onClose: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 pb-4">
      <h2
        className="font-display text-title leading-title font-medium tracking-title focus:outline-none"
        id={SETTINGS_TITLE_ID}
        ref={headingRef}
        tabIndex={-1}
      >
        Settings
      </h2>
      <button
        aria-label="Close settings"
        className="flex size-11 items-center justify-center text-2xl leading-none text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={onClose}
        title="Close settings"
        type="button"
      >
        ×
      </button>
    </header>
  );
}

function TextScaleSettings() {
  const { preferences, setTextScale } = usePreferences();
  const textScaleIndex = TEXT_SCALE_VALUES.indexOf(preferences.textScale);

  return (
    <SettingsGroup legend="Text size">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-3">
        <span aria-hidden="true" className="font-display text-sm text-muted">
          A
        </span>
        <input
          aria-label="Text size"
          aria-valuetext={enumLabel(TextScale, preferences.textScale)}
          className="h-11 w-full cursor-pointer accent-accent"
          max={TEXT_SCALE_VALUES.length - 1}
          min={0}
          onChange={(event) => {
            const textScale = TEXT_SCALE_VALUES[Number(event.currentTarget.value)];

            if (textScale !== undefined) {
              setTextScale(textScale);
            }
          }}
          step={1}
          type="range"
          value={textScaleIndex}
        />
        <span aria-hidden="true" className="font-display text-2xl text-secondary">
          A
        </span>
        <output className="col-span-3 text-center font-display text-citation leading-citation text-muted">
          {enumLabel(TextScale, preferences.textScale)}
        </output>
      </div>
    </SettingsGroup>
  );
}

function OpeningScreenSettings() {
  const { preferences, setOpeningDuration } = usePreferences();

  return (
    <SettingsGroup legend="Opening screen">
      <div className="flex flex-wrap gap-x-5">
        {Object.values(OpeningDuration).map((openingDuration) => (
          <button
            aria-pressed={preferences.openingDuration === openingDuration}
            className={TEXT_CHOICE_CLASS_NAME}
            key={openingDuration}
            onClick={() => setOpeningDuration(openingDuration)}
            type="button"
          >
            {openingDurationLabel(openingDuration)}
          </button>
        ))}
      </div>
    </SettingsGroup>
  );
}

function ReadingSpeedPresets() {
  const { preferences, setReadingSpeed } = usePreferences();

  return (
    <fieldset className="flex min-w-0 flex-wrap gap-x-5 border-0 p-0">
      <legend className="sr-only">Reading speed presets</legend>
      {READING_SPEED_PRESETS.map((readingSpeed) => (
        <button
          aria-pressed={preferences.readingSpeed === readingSpeed}
          className={TEXT_CHOICE_CLASS_NAME}
          key={readingSpeed}
          onClick={() => setReadingSpeed(readingSpeed)}
          type="button"
        >
          {ReadingSpeed[readingSpeed]}
        </button>
      ))}
    </fieldset>
  );
}

function ReadingSpeedSlider() {
  const { preferences, setReadingSpeed } = usePreferences();

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-3">
      <span aria-hidden="true" className="font-display text-citation text-muted">
        0.5×
      </span>
      <input
        aria-labelledby={READING_SPEED_ID}
        aria-valuetext={readingSpeedLabel(preferences.readingSpeed)}
        className="h-11 w-full cursor-pointer accent-accent"
        max={READING_SPEED_MAXIMUM}
        min={READING_SPEED_MINIMUM}
        onChange={(event) => setReadingSpeed(Number(event.currentTarget.value))}
        step={READING_SPEED_STEP}
        type="range"
        value={preferences.readingSpeed}
      />
      <span aria-hidden="true" className="font-display text-citation text-muted">
        2×
      </span>
      <output className="col-span-3 text-center font-display text-citation leading-citation text-muted">
        {readingSpeedLabel(preferences.readingSpeed)}
      </output>
    </div>
  );
}

function GuidedPlaybackSettings() {
  return (
    <SettingsGroup legend="Guided playback">
      <p className="pt-2 font-display text-body leading-body text-foreground" id={READING_SPEED_ID}>
        Reading speed
      </p>
      <ReadingSpeedPresets />
      <ReadingSpeedSlider />
    </SettingsGroup>
  );
}

function RosaryBeadsSettings() {
  const { preferences, setBeadMaterial } = usePreferences();

  return (
    <SettingsGroup legend="Rosary beads">
      <div className="flex flex-wrap gap-5 pt-3">
        {Object.values(BeadMaterial).map((beadMaterial) => (
          <button
            aria-pressed={preferences.beadMaterial === beadMaterial}
            className="group flex min-h-14 min-w-14 flex-col items-center justify-center gap-2 text-muted transition-colors hover:text-foreground aria-pressed:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            data-bead-material={beadMaterial}
            key={beadMaterial}
            onClick={() => setBeadMaterial(beadMaterial)}
            type="button"
          >
            <span
              aria-hidden="true"
              className="size-6 rounded-full border border-(--bead-dark) bg-radial-[circle_at_30%_25%] from-(--bead-light) via-(--bead-fill) via-58% to-(--bead-dark) outline-offset-2 outline-accent transition-[outline-color] duration-150 group-aria-pressed:outline"
            />
            <span className="font-display text-citation leading-citation">
              {enumLabel(BeadMaterial, beadMaterial)}
            </span>
          </button>
        ))}
      </div>
    </SettingsGroup>
  );
}

type RosaryOptionChoice = readonly [
  label: string,
  description: string,
  value: boolean,
  onChange: (next: boolean) => void,
];

function useRosaryOptionChoices(): readonly RosaryOptionChoice[] {
  const {
    preferences,
    setIncludeFatimaPrayer,
    setShowDropCaps,
    setShowGuidance,
    setShowMysteryFruits,
    setShowScriptureReadings,
  } = usePreferences();
  return [
    [
      'Fatima prayer',
      'Include O My Jesus after each decade.',
      preferences.includeFatimaPrayer,
      setIncludeFatimaPrayer,
    ],
    [
      'Scripture readings',
      'Show the brief reading with each mystery.',
      preferences.showScriptureReadings,
      setShowScriptureReadings,
    ],
    [
      'Mystery fruits',
      "Show each mystery's spiritual fruit.",
      preferences.showMysteryFruits,
      setShowMysteryFruits,
    ],
    ['Guidance', 'Show meditation prompts.', preferences.showGuidance, setShowGuidance],
    [
      'Drop caps',
      'Enlarge the opening letter when space allows.',
      preferences.showDropCaps,
      setShowDropCaps,
    ],
  ];
}

function RosaryOptionsSettings() {
  const choices = useRosaryOptionChoices();

  return (
    <SettingsGroup legend="Rosary options">
      {choices.map(([label, description, value, onChange]) => (
        <SwitchChoice
          description={description}
          key={label}
          label={label}
          onChange={onChange}
          value={value}
        />
      ))}
    </SettingsGroup>
  );
}

function UpdateSettings() {
  const { preferences, setUpdateChecks } = usePreferences();

  return (
    <SettingsGroup legend="Updates">
      <div className="flex flex-wrap gap-x-5">
        {Object.values(UpdateChecks).map((updateChecks) => (
          <button
            aria-pressed={preferences.updateChecks === updateChecks}
            className={TEXT_CHOICE_CLASS_NAME}
            key={updateChecks}
            onClick={() => setUpdateChecks(updateChecks)}
            type="button"
          >
            {UPDATE_CHECKS_LABEL[updateChecks]}
          </button>
        ))}
      </div>
      <p className="pt-2 font-display text-citation leading-citation text-muted">
        {UPDATE_CHECKS_DESCRIPTION[preferences.updateChecks]}
      </p>
    </SettingsGroup>
  );
}

function LinkSettings() {
  const { preferences, setConfirmExternalLinks } = usePreferences();

  return (
    <SettingsGroup legend="External links">
      <SwitchChoice
        description="Ask before opening a website outside Lucerna."
        label="Confirm before leaving"
        onChange={setConfirmExternalLinks}
        value={preferences.confirmExternalLinks}
      />
    </SettingsGroup>
  );
}

function SettingsColumns() {
  return (
    <div className="grid lg:grid-cols-2 lg:gap-x-8">
      <div>
        <TextScaleSettings />
        <OpeningScreenSettings />
        <GuidedPlaybackSettings />
        <RosaryBeadsSettings />
      </div>
      <div>
        <RosaryOptionsSettings />
        <LinkSettings />
        <UpdateSettings />
      </div>
    </div>
  );
}

export function SettingsDialog({
  open,
  onClose,
  onOpenInstallGuide,
  onOpenReferences,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onOpenInstallGuide: () => void;
  readonly onOpenReferences: () => void;
}) {
  const { dialogRef, headingRef, returnFocusRef } = useSettingsDialog(open);

  const handleDialogClose = (): void => {
    onClose();
    const returnFocus = returnFocusRef.current;
    returnFocusRef.current = null;

    if (returnFocus?.isConnected) {
      returnFocus.focus();
    }
  };

  return (
    <dialog
      aria-labelledby={SETTINGS_TITLE_ID}
      className="scroll-region surface-chrome m-0 mt-auto max-h-dvh w-full max-w-none overflow-y-auto rounded-t-xl border border-hairline p-0 pt-safe-top pb-safe-bottom text-base text-foreground backdrop:bg-background/80 lg:m-auto lg:max-h-[min(90dvh,44rem)] lg:max-w-3xl lg:rounded-xl"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={handleDialogClose}
      ref={dialogRef}
    >
      <div className="p-5 lg:p-8">
        <SettingsHeader headingRef={headingRef} onClose={onClose} />
        <SettingsColumns />
        <DiagnosticsSettings />
        <AboutSettings
          onOpenInstallGuide={onOpenInstallGuide}
          onOpenReferences={onOpenReferences}
        />
      </div>
    </dialog>
  );
}
