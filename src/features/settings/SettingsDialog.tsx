import {
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  NAV_CLASS_NAME,
} from '../../styles.ts';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  BeadMaterial,
  OpeningDuration,
  READING_SPEED_MAXIMUM,
  READING_SPEED_MINIMUM,
  READING_SPEED_PRESETS,
  READING_SPEED_STEP,
  ReaderFace,
  ReaderGround,
  ReadingSpeed,
  RosaryDisplay,
  TextScale,
  Theme,
  UpdateChecks,
  effectiveBeadMaterial,
  type PreferenceKey,
  type Preferences,
} from '../../state/preferences/model.ts';
import { APP_DESCRIPTION } from '../../appMetadata.ts';
import { ReaderSample } from '../library/ReaderSurface.tsx';
import { ChoiceGroup } from '../../components/ChoiceGroup.tsx';
import { RedLetterNoticeText } from '../../components/RedLetterNotice.tsx';
import { contentCatalog } from '../../content/catalog.ts';
import { useDialogOpen, useReturnFocus } from '../../shared/focus.ts';
import { enumLabel } from '../../shared/text.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { SettingsScope, SettingsTab } from './model.ts';
import { AboutSettings, type AboutSettingsProps } from './AboutSettings.tsx';
import { DiagnosticsSettings } from './DiagnosticsSettings.tsx';

const SETTINGS_TITLE_ID = 'settings-title';
const SETTINGS_CARD_MINIMUM_HEIGHT = 320;
const SETTINGS_CARD_MAXIMUM_VIEWPORT_SHARE = 0.85;
const SETTINGS_CARD_KEYBOARD_STEP = 24;
const UPDATE_CHECKS_LABEL: Readonly<Record<UpdateChecks, string>> = {
  [UpdateChecks.OnLoad]: 'When it opens',
  [UpdateChecks.WhileOpen]: 'Also while open',
};
const UPDATE_CHECKS_DESCRIPTION: Readonly<Record<UpdateChecks, string>> = {
  [UpdateChecks.OnLoad]: 'Lucerna looks for a new version once, as it starts.',
  [UpdateChecks.WhileOpen]: 'If Lucerna is installed, the app also looks every twenty minutes.',
};
const READING_SPEED_ID = 'reading-speed';
const TEXT_SCALE_VALUES: readonly TextScale[] = Object.values(TextScale);

const READER_FACE_LABEL: Readonly<Record<ReaderFace, string>> = {
  [ReaderFace.Garamond]: 'Garamond',
  [ReaderFace.Sans]: 'Sans serif',
};
const TAB_CLASS_NAME = `min-h-11 border-b-2 border-transparent px-1 ${BODY_CLASS_NAME} text-muted transition-colors hover:text-foreground aria-selected:border-accent aria-selected:text-accent-current focus-ring`;

const SETTINGS_TAB_LABEL: Readonly<Record<SettingsTab, string>> = {
  [SettingsTab.Rosary]: 'Rosary',
  [SettingsTab.Library]: 'Library',
  [SettingsTab.General]: 'General',
  [SettingsTab.About]: 'About',
};

const defaultTabOf = (scope: SettingsScope): SettingsTab =>
  scope === SettingsScope.Reader ? SettingsTab.Library : SettingsTab.Rosary;

const readingSpeedLabel = (readingSpeed: number): string => {
  const preset = READING_SPEED_PRESETS.find((value) => value === readingSpeed);
  const multiplier = String(Number(readingSpeed.toFixed(2)));

  return `${preset === undefined ? 'Custom' : ReadingSpeed[preset]} · ${multiplier}×`;
};

const openingDurationLabel = (openingDuration: OpeningDuration): string =>
  openingDuration === OpeningDuration.Manual ? 'No timeout' : `${openingDuration} seconds`;

const THEME_VALUES: readonly Theme[] = [Theme.EternalLight, Theme.Parchment, Theme.System];

const THEME_LABEL: Readonly<Record<Theme, string>> = {
  [Theme.EternalLight]: 'Dark',
  [Theme.Parchment]: 'Parchment',
  [Theme.System]: 'Follow system',
};

const ROSARY_DISPLAY_LABEL: Readonly<Record<RosaryDisplay, string>> = {
  [RosaryDisplay.FullRosary]: 'Full rosary',
  [RosaryDisplay.CurrentDecade]: 'Current decade',
};

function SettingsNote({ children }: { readonly children: ReactNode }) {
  return <p className={`pt-2 ${CITATION_CLASS_NAME} text-muted`}>{children}</p>;
}

function SettingsGroup({
  legend,
  children,
}: {
  readonly legend: string;
  readonly children: ReactNode;
}) {
  return (
    <fieldset className="border-t border-hairline py-4">
      <legend className={`px-0 ${EYEBROW_CLASS_NAME}`}>{legend}</legend>
      <div className="[&>label:first-child]:border-t-0">{children}</div>
    </fieldset>
  );
}

type SwitchChoiceProps = {
  readonly label: string;
  readonly description: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
};

function SwitchChoice({ label, description, value, onChange }: SwitchChoiceProps) {
  return (
    <label className="grid min-h-14 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-hairline py-3">
      <span className={`${BODY_CLASS_NAME} text-foreground`}>{label}</span>
      <span className={`${CITATION_CLASS_NAME} text-muted`}>{description}</span>
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

type CardDrag = {
  readonly pointerId: number;
  readonly startY: number;
  readonly startHeight: number;
};

const clampCardHeight = (height: number): number =>
  Math.min(
    Math.max(height, SETTINGS_CARD_MINIMUM_HEIGHT),
    window.innerHeight * SETTINGS_CARD_MAXIMUM_VIEWPORT_SHARE,
  );

type CardResizeContext = {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly dragRef: RefObject<CardDrag | null>;
  readonly setCardHeight: (height: number) => void;
};

const beginCardResize = (
  context: CardResizeContext,
  event: ReactPointerEvent<HTMLElement>,
): void => {
  const dialog = context.dialogRef.current;

  if (dialog === null) {
    return;
  }

  context.dragRef.current = {
    pointerId: event.pointerId,
    startY: event.clientY,
    startHeight: dialog.getBoundingClientRect().height,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
};

const nudgeCardResize = (
  context: CardResizeContext,
  event: ReactKeyboardEvent<HTMLElement>,
): void => {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
    return;
  }

  event.preventDefault();
  const step = event.key === 'ArrowUp' ? SETTINGS_CARD_KEYBOARD_STEP : -SETTINGS_CARD_KEYBOARD_STEP;
  const current = context.dialogRef.current?.getBoundingClientRect().height;

  if (current !== undefined) {
    context.setCardHeight(clampCardHeight(current + step));
  }
};

const cardResizeHandlersOf = (context: CardResizeContext) => {
  const finishResize = (event: ReactPointerEvent<HTMLElement>): void => {
    if (context.dragRef.current?.pointerId === event.pointerId) {
      context.dragRef.current = null;
    }
  };

  return {
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => nudgeCardResize(context, event),
    onPointerCancel: finishResize,
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => beginCardResize(context, event),
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      const drag = context.dragRef.current;

      if (drag !== null && drag.pointerId === event.pointerId) {
        context.setCardHeight(clampCardHeight(drag.startHeight + drag.startY - event.clientY));
      }
    },
    onPointerUp: finishResize,
  };
};

const useCardResize = (dialogRef: RefObject<HTMLDialogElement | null>) => {
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const dragRef = useRef<CardDrag | null>(null);
  const cardStyle: CSSProperties | undefined =
    cardHeight === null ? undefined : { height: `${String(cardHeight)}px`, maxHeight: 'none' };

  return {
    cardStyle,
    handleProps: cardResizeHandlersOf({ dialogRef, dragRef, setCardHeight }),
  };
};

function ResizeHandle({ handleProps }: { readonly handleProps: object }) {
  return (
    <div
      aria-label="Resize settings"
      aria-orientation="horizontal"
      className="flex min-h-11 flex-1 cursor-row-resize touch-none items-center justify-center outline-none focus-ring"
      role="separator"
      tabIndex={0}
      {...handleProps}
    >
      <span aria-hidden="true" className="h-1.5 w-16 rounded-full bg-accent" />
    </div>
  );
}

function useSettingsDialog(open: boolean) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const returnFocus = useReturnFocus();

  useEffect(() => {
    if (open) {
      returnFocus.remember();
    }
  }, [open, returnFocus]);
  useDialogOpen(dialogRef, open, false, () => headingRef.current?.focus());

  return { dialogRef, headingRef, returnFocus };
}

function SettingsHeader({
  handleProps,
  headingRef,
  onClose,
}: {
  readonly handleProps: object;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onClose: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-hairline px-5 lg:px-8">
      <h2
        className={`${NAV_CLASS_NAME} font-medium focus:outline-none`}
        id={SETTINGS_TITLE_ID}
        ref={headingRef}
        tabIndex={-1}
      >
        Settings
      </h2>
      <ResizeHandle handleProps={handleProps} />
      <button
        aria-label="Close settings"
        className="flex size-11 items-center justify-center text-2xl leading-none text-muted transition-colors hover:text-foreground focus-ring"
        onClick={onClose}
        title="Close settings"
        type="button"
      >
        ×
      </button>
    </header>
  );
}

function TextScaleGroup({
  children,
  legend,
  onChange,
  value,
}: {
  readonly children?: ReactNode;
  readonly legend: string;
  readonly onChange: (next: TextScale) => void;
  readonly value: TextScale;
}) {
  const textScaleIndex = TEXT_SCALE_VALUES.indexOf(value);

  return (
    <SettingsGroup legend={legend}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-3">
        <span aria-hidden="true" className="font-display text-sm text-muted">
          A
        </span>
        <input
          aria-label={legend}
          aria-valuetext={enumLabel(TextScale, value)}
          className="focus-ring h-11 w-full cursor-pointer accent-accent"
          max={TEXT_SCALE_VALUES.length - 1}
          min={0}
          onChange={(event) => {
            const textScale = TEXT_SCALE_VALUES[Number(event.currentTarget.value)];

            if (textScale !== undefined) {
              onChange(textScale);
            }
          }}
          step={1}
          type="range"
          value={textScaleIndex}
        />
        <span aria-hidden="true" className="font-display text-2xl text-secondary">
          A
        </span>
        <output className={`col-span-3 text-center ${CITATION_CLASS_NAME} text-muted`}>
          {enumLabel(TextScale, value)}
        </output>
      </div>
      {children}
    </SettingsGroup>
  );
}

function TextScaleSettings() {
  const { preferences, setPreference } = usePreferences();

  return (
    <TextScaleGroup
      legend="App text size"
      onChange={(textScale) => setPreference('textScale', textScale)}
      value={preferences.textScale}
    >
      <SettingsNote>Applies to all app text.</SettingsNote>
      <p className={`pt-2 ${BODY_CLASS_NAME} text-secondary`}>{APP_DESCRIPTION}</p>
    </TextScaleGroup>
  );
}

type EnumPreferenceKey =
  'openingDuration' | 'readerFace' | 'readerGround' | 'rosaryDisplay' | 'theme' | 'updateChecks';

function PreferenceChoices<Key extends EnumPreferenceKey>({
  label,
  labelOf,
  preferenceKey,
  values,
}: {
  readonly label: string;
  readonly labelOf: (value: Preferences[Key]) => string;
  readonly preferenceKey: Key;
  readonly values: readonly Preferences[Key][];
}) {
  const { preferences, setPreference } = usePreferences();

  return (
    <ChoiceGroup
      label={label}
      labelOf={labelOf}
      onSelect={(value) => setPreference(preferenceKey, value)}
      selected={preferences[preferenceKey]}
      values={values}
    />
  );
}

function ReaderFaceSettings() {
  return (
    <SettingsGroup legend="Reading font">
      <PreferenceChoices
        label="Reading font"
        labelOf={(readerFace) => READER_FACE_LABEL[readerFace]}
        preferenceKey="readerFace"
        values={Object.values(ReaderFace)}
      />
    </SettingsGroup>
  );
}

function ReaderGroundSettings() {
  return (
    <SettingsGroup legend="Reading page">
      <PreferenceChoices
        label="Reading page"
        labelOf={(readerGround) => enumLabel(ReaderGround, readerGround)}
        preferenceKey="readerGround"
        values={Object.values(ReaderGround)}
      />
      <SettingsNote>Applies to book pages only.</SettingsNote>
    </SettingsGroup>
  );
}

function RedLetterSettings() {
  return (
    <SettingsGroup legend="Scripture">
      <PreferenceSwitch
        description="Show the words of Christ in red in the Bible and the mystery readings."
        label="Words of Christ in red"
        preferenceKey="showRedLetter"
      />
      <SettingsNote>
        <RedLetterNoticeText notice={contentCatalog.bible.redLetter.notice} />
      </SettingsNote>
    </SettingsGroup>
  );
}

function ReaderSettings() {
  const { preferences, setPreference } = usePreferences();

  return (
    <div>
      <TextScaleGroup
        legend="Reading text size"
        onChange={(textScale) => setPreference('readerTextScale', textScale)}
        value={preferences.readerTextScale}
      />
      <ReaderFaceSettings />
      <ReaderGroundSettings />
      <SettingsGroup legend="Reading preview">
        <div className="pt-3">
          <ReaderSample>{APP_DESCRIPTION}</ReaderSample>
        </div>
      </SettingsGroup>
      <RedLetterSettings />
    </div>
  );
}

function OpeningScreenSettings() {
  const { preferences } = usePreferences();

  return (
    <SettingsGroup legend="Opening screen timeout">
      <PreferenceChoices
        label="Opening screen timeout"
        labelOf={openingDurationLabel}
        preferenceKey="openingDuration"
        values={Object.values(OpeningDuration)}
      />
      <SettingsNote>
        {preferences.openingDuration === OpeningDuration.Manual
          ? 'Waits until you select Continue.'
          : 'Continues on its own after the selected delay.'}
      </SettingsNote>
    </SettingsGroup>
  );
}

function AppearanceSettings() {
  return (
    <SettingsGroup legend="App appearance">
      <PreferenceChoices
        label="App appearance"
        labelOf={(theme) => THEME_LABEL[theme]}
        preferenceKey="theme"
        values={THEME_VALUES}
      />
      <SettingsNote>Follow system uses your device’s light or dark appearance.</SettingsNote>
    </SettingsGroup>
  );
}

function ReadingSpeedPresets() {
  const { preferences, setPreference } = usePreferences();

  return (
    <ChoiceGroup
      label="Reading speed presets"
      labelOf={(readingSpeed) => enumLabel(ReadingSpeed, readingSpeed)}
      onSelect={(readingSpeed) => setPreference('readingSpeed', readingSpeed)}
      selected={preferences.readingSpeed}
      values={READING_SPEED_PRESETS}
    />
  );
}

function ReadingSpeedSlider() {
  const { preferences, setPreference } = usePreferences();

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-3">
      <span aria-hidden="true" className="font-display text-citation text-muted">
        0.5×
      </span>
      <input
        aria-labelledby={READING_SPEED_ID}
        aria-valuetext={readingSpeedLabel(preferences.readingSpeed)}
        className="focus-ring h-11 w-full cursor-pointer accent-accent"
        max={READING_SPEED_MAXIMUM}
        min={READING_SPEED_MINIMUM}
        onChange={(event) => setPreference('readingSpeed', Number(event.currentTarget.value))}
        step={READING_SPEED_STEP}
        type="range"
        value={preferences.readingSpeed}
      />
      <span aria-hidden="true" className="font-display text-citation text-muted">
        2×
      </span>
      <output className={`col-span-3 text-center ${CITATION_CLASS_NAME} text-muted`}>
        {readingSpeedLabel(preferences.readingSpeed)}
      </output>
    </div>
  );
}

function GuidedPlaybackSettings() {
  return (
    <SettingsGroup legend="Guided prayer">
      <p className={`pt-2 ${BODY_CLASS_NAME} text-foreground`} id={READING_SPEED_ID}>
        Reading speed
      </p>
      <ReadingSpeedPresets />
      <ReadingSpeedSlider />
      <SettingsNote>
        Guided prayer moves on by itself after time to read each text; higher speeds allow less
        time.
      </SettingsNote>
    </SettingsGroup>
  );
}

function RosaryDisplaySettings() {
  return (
    <SettingsGroup legend="Rosary display">
      <PreferenceChoices
        label="Rosary display"
        labelOf={(display) => ROSARY_DISPLAY_LABEL[display]}
        preferenceKey="rosaryDisplay"
        values={Object.values(RosaryDisplay)}
      />
      <SettingsNote>
        Current decade shows the beads being prayed, with a small map of the whole rosary.
      </SettingsNote>
    </SettingsGroup>
  );
}

function RosaryBeadsSettings() {
  const { preferences, resolvedTheme, setPreference } = usePreferences();
  const material = effectiveBeadMaterial(preferences, resolvedTheme);

  return (
    <SettingsGroup legend="Bead material">
      <div className="flex flex-wrap gap-5 pt-3">
        {Object.values(BeadMaterial).map((beadMaterial) => (
          <button
            aria-pressed={material === beadMaterial}
            className="group flex min-h-14 min-w-14 flex-col items-center justify-center gap-2 text-muted transition-colors hover:text-foreground aria-pressed:text-foreground focus-ring"
            data-bead-material={beadMaterial}
            key={beadMaterial}
            onClick={() => setPreference('beadMaterial', beadMaterial)}
            type="button"
          >
            <span
              aria-hidden="true"
              className="size-6 rounded-full border border-(--bead-dark) bg-radial-[circle_at_30%_25%] from-(--bead-light) via-(--bead-fill) via-58% to-(--bead-dark) outline-offset-2 outline-accent transition-[outline-color] duration-150 group-aria-pressed:outline"
            />
            <span className={CITATION_CLASS_NAME}>{enumLabel(BeadMaterial, beadMaterial)}</span>
          </button>
        ))}
      </div>
    </SettingsGroup>
  );
}

type BooleanPreferenceKey = {
  readonly [Key in PreferenceKey]: Preferences[Key] extends boolean ? Key : never;
}[PreferenceKey];

type PreferenceSwitchProps = Pick<SwitchChoiceProps, 'description' | 'label'> & {
  readonly preferenceKey: BooleanPreferenceKey;
};

function PreferenceSwitch({ description, label, preferenceKey }: PreferenceSwitchProps) {
  const { preferences, setPreference } = usePreferences();

  return (
    <SwitchChoice
      description={description}
      label={label}
      onChange={(value) => setPreference(preferenceKey, value)}
      value={preferences[preferenceKey]}
    />
  );
}

type DisplayChoice = PreferenceSwitchProps & {
  readonly playback?: Pick<PreferenceSwitchProps, 'label' | 'preferenceKey'>;
};

const PLAYBACK_CHOICE_DESCRIPTION = 'Allow time to read this text before continuing.';

const DISPLAY_CHOICES: readonly DisplayChoice[] = [
  {
    label: 'Scripture readings',
    description: 'Show the brief reading with each mystery.',
    preferenceKey: 'showScriptureReadings',
  },
  {
    label: 'Mystery fruits',
    description: 'Show each mystery’s spiritual fruit.',
    preferenceKey: 'showMysteryFruits',
    playback: { label: 'Include fruits in guided prayer', preferenceKey: 'readMysteryFruits' },
  },
  {
    label: 'Guidance',
    description: 'Show meditation prompts.',
    preferenceKey: 'showGuidance',
    playback: { label: 'Include guidance in guided prayer', preferenceKey: 'readGuidance' },
  },
  {
    label: 'Decade offerings',
    description: 'Show St. Louis de Montfort’s offering with each mystery.',
    preferenceKey: 'showDecadeOfferings',
    playback: {
      label: 'Include offerings in guided prayer',
      preferenceKey: 'readDecadeOfferings',
    },
  },
  {
    label: 'Decorative initials',
    description: 'Enlarge the opening letter when space allows.',
    preferenceKey: 'showDropCaps',
  },
];

function PrayersSettings() {
  return (
    <SettingsGroup legend="Prayers">
      <PreferenceSwitch
        description="Include O My Jesus after each decade."
        label="Fatima prayer"
        preferenceKey="includeFatimaPrayer"
      />
    </SettingsGroup>
  );
}

function DisplayChoiceRow({ playback, ...choice }: DisplayChoice) {
  const { preferences } = usePreferences();
  const shown = preferences[choice.preferenceKey];

  return (
    <>
      <PreferenceSwitch {...choice} />
      {playback !== undefined && shown ? (
        <div className="pl-6">
          <PreferenceSwitch description={PLAYBACK_CHOICE_DESCRIPTION} {...playback} />
        </div>
      ) : null}
    </>
  );
}

function DisplaySettings() {
  return (
    <SettingsGroup legend="During prayer">
      {DISPLAY_CHOICES.map((choice) => (
        <DisplayChoiceRow key={choice.preferenceKey} {...choice} />
      ))}
    </SettingsGroup>
  );
}

function UpdateSettings() {
  const { preferences } = usePreferences();

  return (
    <SettingsGroup legend="Updates">
      <PreferenceChoices
        label="Updates"
        labelOf={(updateChecks) => UPDATE_CHECKS_LABEL[updateChecks]}
        preferenceKey="updateChecks"
        values={Object.values(UpdateChecks)}
      />
      <SettingsNote>{UPDATE_CHECKS_DESCRIPTION[preferences.updateChecks]}</SettingsNote>
    </SettingsGroup>
  );
}

function LinkSettings() {
  return (
    <SettingsGroup legend="External links">
      <PreferenceSwitch
        description="Ask before opening a website outside Lucerna."
        label="Ask before opening websites"
        preferenceKey="confirmExternalLinks"
      />
    </SettingsGroup>
  );
}

function SettingsTabs({
  onSelect,
  selected,
}: {
  readonly onSelect: (tab: SettingsTab) => void;
  readonly selected: SettingsTab;
}) {
  return (
    <ChoiceGroup
      className="flex shrink-0 flex-wrap gap-x-5 border-b border-hairline px-5 lg:px-8"
      itemClassName={TAB_CLASS_NAME}
      label="Settings sections"
      labelOf={(tab) => SETTINGS_TAB_LABEL[tab]}
      onSelect={onSelect}
      selected={selected}
      tabs
      values={Object.values(SettingsTab)}
    />
  );
}

function RosaryTab() {
  return (
    <>
      <PrayersSettings />
      <DisplaySettings />
      <GuidedPlaybackSettings />
      <RosaryDisplaySettings />
      <RosaryBeadsSettings />
    </>
  );
}

function GeneralTab() {
  return (
    <>
      <AppearanceSettings />
      <TextScaleSettings />
      <OpeningScreenSettings />
      <LinkSettings />
      <UpdateSettings />
    </>
  );
}

function AboutTab(props: AboutSettingsProps) {
  return (
    <>
      <AboutSettings {...props} />
      <DiagnosticsSettings />
    </>
  );
}

const TAB_PANEL: Readonly<Record<SettingsTab, (props: AboutSettingsProps) => ReactNode>> = {
  [SettingsTab.Rosary]: RosaryTab,
  [SettingsTab.Library]: ReaderSettings,
  [SettingsTab.General]: GeneralTab,
  [SettingsTab.About]: AboutTab,
};

type SettingsDialogProps = {
  readonly open: boolean;
  readonly scope: SettingsScope;
  readonly onClose: () => void;
  readonly onOpenInstallGuide: () => void;
  readonly onOpenReferences: () => void;
};

export function SettingsDialog(props: SettingsDialogProps) {
  const { dialogRef, headingRef, returnFocus } = useSettingsDialog(props.open);
  const { cardStyle, handleProps } = useCardResize(dialogRef);
  const [tab, setTab] = useState(defaultTabOf(props.scope));

  useEffect(() => {
    if (props.open) {
      setTab(defaultTabOf(props.scope));
    }
  }, [props.open, props.scope]);

  const handleDialogClose = (): void => {
    props.onClose();
    returnFocus.restore();
  };

  return (
    <dialog
      aria-labelledby={SETTINGS_TITLE_ID}
      className="surface-chrome fixed inset-x-0 bottom-0 z-50 m-0 hidden h-[50dvh] w-full max-w-none flex-col rounded-t-xl border border-outline p-0 pb-safe-bottom text-base text-foreground open:flex lg:inset-x-auto lg:right-6 lg:bottom-6 lg:h-[min(70dvh,44rem)] lg:max-w-md lg:rounded-xl"
      style={cardStyle}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
      onClose={handleDialogClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          props.onClose();
        }
      }}
      ref={dialogRef}
    >
      <SettingsHeader handleProps={handleProps} headingRef={headingRef} onClose={props.onClose} />
      <SettingsTabs onSelect={setTab} selected={tab} />
      <SettingsBody
        key={tab}
        onOpenInstallGuide={props.onOpenInstallGuide}
        onOpenReferences={props.onOpenReferences}
        tab={tab}
      />
    </dialog>
  );
}

function SettingsBody({ tab, ...panelProps }: AboutSettingsProps & { readonly tab: SettingsTab }) {
  const Panel = TAB_PANEL[tab];

  return (
    <div
      className="scroll-region min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5 lg:px-8 lg:pb-8"
      role="tabpanel"
    >
      <Panel {...panelProps} />
    </div>
  );
}
