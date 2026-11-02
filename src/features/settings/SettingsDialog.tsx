import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { ChoiceGroup } from '../../components/ChoiceGroup.tsx';
import { RedLetterNoticeText } from '../../components/RedLetterNotice.tsx';
import {
  BIBLE_CHOICES,
  LANGUAGE_CHOICES,
  LanguageChoice,
  deviceLanguageTags,
  editionOf,
  languageName,
  languageOf,
} from '../../content/language.ts';
import { useReading, type ReadingSnapshot } from '../../content/reading.ts';
import { ReflectionStatus } from '../../content/schema.ts';
import { useDialogOpen, useReturnFocus } from '../../shared/focus.ts';
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
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import {
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  CLOSE_BUTTON_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  NAV_CLASS_NAME,
} from '../../styles.ts';
import { BIBLE_EDITION_LABEL } from '../library/model.ts';
import { ReaderSample } from '../library/ReaderSurface.tsx';
import { AboutSettings, type AboutSettingsProps } from './AboutSettings.tsx';
import { DiagnosticsSettings } from './DiagnosticsSettings.tsx';
import { SettingsScope, SettingsTab } from './model.ts';
import { KeyName } from '../../shared/keyboard.ts';

const SETTINGS_TITLE_ID = 'settings-title';
const SETTINGS_CARD_MINIMUM_HEIGHT = 320;
const SETTINGS_CARD_MAXIMUM_VIEWPORT_SHARE = 0.85;
const SETTINGS_CARD_KEYBOARD_STEP = 24;
const UPDATE_CHECKS_LABEL = (reading: ReadingSnapshot): Readonly<Record<UpdateChecks, string>> => ({
  [UpdateChecks.OnLoad]: reading.wording.settings.whenOpens,
  [UpdateChecks.WhileOpen]: reading.wording.settings.alsoWhileOpen,
});
const UPDATE_CHECKS_DESCRIPTION = (
  reading: ReadingSnapshot,
): Readonly<Record<UpdateChecks, string>> => ({
  [UpdateChecks.OnLoad]: reading.wording.settings.onLoadNote,
  [UpdateChecks.WhileOpen]: reading.wording.settings.whileOpenNote,
});
const READING_SPEED_ID = 'reading-speed';
const READING_SPEED_LABEL = (reading: ReadingSnapshot): ReadonlyMap<number, string> =>
  new Map([
    [ReadingSpeed.Unhurried, reading.wording.settings.speeds.unhurried],
    [ReadingSpeed.Steady, reading.wording.settings.speeds.steady],
    [ReadingSpeed.Brisk, reading.wording.settings.speeds.brisk],
  ]);
const readingSpeedName = (reading: ReadingSnapshot, readingSpeed: number): string =>
  READING_SPEED_LABEL(reading).get(readingSpeed) ?? reading.wording.settings.custom;
const TEXT_SCALE_LABEL = (reading: ReadingSnapshot): Readonly<Record<TextScale, string>> => ({
  [TextScale.Small]: reading.wording.settings.textScales.small,
  [TextScale.Standard]: reading.wording.settings.textScales.standard,
  [TextScale.Comfortable]: reading.wording.settings.textScales.comfortable,
  [TextScale.Large]: reading.wording.settings.textScales.large,
  [TextScale.ExtraLarge]: reading.wording.settings.textScales.extraLarge,
  [TextScale.Maximum]: reading.wording.settings.textScales.maximum,
});
const TEXT_SCALE_VALUES: readonly TextScale[] = Object.values(TextScale);

const TAB_CLASS_NAME = `min-h-11 border-b-2 border-transparent px-1 ${BODY_CLASS_NAME} text-muted transition-colors hover:text-foreground aria-selected:border-accent aria-selected:text-accent-current focus-ring`;

const SETTINGS_TAB_LABEL = (reading: ReadingSnapshot): Readonly<Record<SettingsTab, string>> => ({
  [SettingsTab.Rosary]: reading.wording.views.rosary,
  [SettingsTab.Library]: reading.wording.views.library,
  [SettingsTab.General]: reading.wording.settings.general,
  [SettingsTab.About]: reading.wording.about.title,
});

const defaultTabOf = (scope: SettingsScope): SettingsTab =>
  scope === SettingsScope.Reader ? SettingsTab.Library : SettingsTab.Rosary;

const readingSpeedLabel = (reading: ReadingSnapshot, readingSpeed: number): string => {
  const multiplier = String(Number(readingSpeed.toFixed(2)));

  return `${readingSpeedName(reading, readingSpeed)} · ${multiplier}×`;
};

const openingDurationLabel = (
  reading: ReadingSnapshot,
  openingDuration: OpeningDuration,
): string =>
  openingDuration === OpeningDuration.Manual
    ? reading.wording.settings.noTimeout
    : reading.wording.settings.seconds(openingDuration);

const openingDurationNote = (reading: ReadingSnapshot, openingDuration: OpeningDuration): string =>
  openingDuration === OpeningDuration.Manual
    ? reading.wording.settings.waits
    : reading.wording.settings.continuesOnOwn;

const languageChoiceLabel = (reading: ReadingSnapshot, choice: LanguageChoice): string =>
  choice === LanguageChoice.System
    ? reading.wording.settings.followSystem
    : languageName(languageOf(choice, deviceLanguageTags()));

const THEME_VALUES: readonly Theme[] = [Theme.EternalLight, Theme.Parchment, Theme.System];

const THEME_LABEL = (reading: ReadingSnapshot): Readonly<Record<Theme, string>> => ({
  [Theme.EternalLight]: reading.wording.settings.dark,
  [Theme.Parchment]: reading.wording.settings.parchment,
  [Theme.System]: reading.wording.settings.followSystem,
});

const ROSARY_DISPLAY_LABEL = (
  reading: ReadingSnapshot,
): Readonly<Record<RosaryDisplay, string>> => ({
  [RosaryDisplay.FullRosary]: reading.wording.settings.fullRosary,
  [RosaryDisplay.CurrentDecade]: reading.wording.prayer.currentDecade,
});

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

const CARD_KEY_STEP: Readonly<Record<string, number>> = {
  ArrowUp: SETTINGS_CARD_KEYBOARD_STEP,
  ArrowDown: -SETTINGS_CARD_KEYBOARD_STEP,
};

const useCardResize = (dialogRef: RefObject<HTMLDialogElement | null>) => {
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const dragRef = useRef<CardDrag | null>(null);
  const resize = (height: number): void => setCardHeight(clampCardHeight(height));
  const cardStyle: CSSProperties | undefined =
    cardHeight === null ? undefined : { height: `${String(cardHeight)}px`, maxHeight: 'none' };
  const finishResize = (event: ReactPointerEvent<HTMLElement>): void => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  };

  return {
    cardStyle,
    handleProps: {
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
        const step = CARD_KEY_STEP[event.key];
        const current = dialogRef.current?.getBoundingClientRect().height;

        if (step !== undefined) {
          event.preventDefault();
        }

        if (step !== undefined && current !== undefined) {
          resize(current + step);
        }
      },
      onPointerCancel: finishResize,
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        const dialog = dialogRef.current;

        if (dialog !== null) {
          const startHeight = dialog.getBoundingClientRect().height;
          dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startHeight };
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      },
      onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
        const drag = dragRef.current;

        if (drag?.pointerId === event.pointerId) {
          resize(drag.startHeight + drag.startY - event.clientY);
        }
      },
      onPointerUp: finishResize,
    },
  };
};

function ResizeHandle({ handleProps }: { readonly handleProps: object }) {
  const { wording } = useReading();
  return (
    <div
      aria-label={wording.settings.resize}
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
  const { wording } = useReading();
  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-hairline px-5 lg:px-8">
      <h2
        className={`${NAV_CLASS_NAME} font-medium focus:outline-none`}
        id={SETTINGS_TITLE_ID}
        ref={headingRef}
        tabIndex={-1}
      >
        {wording.navigation.settings}
      </h2>
      <ResizeHandle handleProps={handleProps} />
      <button
        aria-label={wording.settings.close}
        className={CLOSE_BUTTON_CLASS_NAME}
        onClick={onClose}
        title={wording.settings.close}
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
  const reading = useReading();
  const textScaleIndex = TEXT_SCALE_VALUES.indexOf(value);

  return (
    <SettingsGroup legend={legend}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-3">
        <span aria-hidden="true" className="font-display text-sm text-muted">
          A
        </span>
        <input
          aria-label={legend}
          aria-valuetext={TEXT_SCALE_LABEL(reading)[value]}
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
          {TEXT_SCALE_LABEL(reading)[value]}
        </output>
      </div>
      {children}
    </SettingsGroup>
  );
}

function TextScaleSettings() {
  const { wording } = useReading();
  const { preferences, setPreference } = usePreferences();

  return (
    <TextScaleGroup
      legend={wording.settings.appTextSize}
      onChange={(textScale) => setPreference('textScale', textScale)}
      value={preferences.textScale}
    >
      <SettingsNote>{wording.settings.appliesAll}</SettingsNote>
      <p className={`pt-2 ${BODY_CLASS_NAME} text-secondary`}>{wording.about.description}</p>
    </TextScaleGroup>
  );
}

type EnumPreferenceKey =
  | 'bibleChoice'
  | 'language'
  | 'openingDuration'
  | 'readerFace'
  | 'readerGround'
  | 'rosaryDisplay'
  | 'theme'
  | 'updateChecks';

type ChoiceSettingProps<Key extends EnumPreferenceKey> = {
  readonly children?: ReactNode;
  readonly labelOf: (value: Preferences[Key]) => string;
  readonly legend: string;
  readonly noteOf?: (value: Preferences[Key]) => ReactNode;
  readonly preferenceKey: Key;
  readonly values: readonly Preferences[Key][];
};

function ChoiceSetting<Key extends EnumPreferenceKey>({
  children,
  labelOf,
  legend,
  noteOf,
  preferenceKey,
  values,
}: ChoiceSettingProps<Key>) {
  const { preferences, setPreference } = usePreferences();
  const selected = preferences[preferenceKey];

  return (
    <SettingsGroup legend={legend}>
      <ChoiceGroup
        label={legend}
        labelOf={labelOf}
        onSelect={(value) => setPreference(preferenceKey, value)}
        selected={selected}
        values={values}
      />
      {children}
      {noteOf === undefined ? null : <SettingsNote>{noteOf(selected)}</SettingsNote>}
    </SettingsGroup>
  );
}

function RedLetterSettings() {
  const reading = useReading();
  return (
    <SettingsGroup legend={reading.wording.library.scripture}>
      <PreferenceSwitch
        description={reading.wording.settings.redLetterNote}
        label={reading.wording.references.redLetter}
        preferenceKey="showRedLetter"
      />
      <SettingsNote>
        <RedLetterNoticeText notice={reading.catalog.bible.redLetter.notice} />
      </SettingsNote>
    </SettingsGroup>
  );
}

function ReaderSettings() {
  const reading = useReading();
  const { preferences, setPreference } = usePreferences();

  return (
    <div>
      <TextScaleGroup
        legend={reading.wording.settings.readingTextSize}
        onChange={(textScale) => setPreference('readerTextScale', textScale)}
        value={preferences.readerTextScale}
      />
      <ChoiceSetting
        labelOf={(face) =>
          face === ReaderFace.Garamond ? 'Garamond' : reading.wording.settings.sansSerif
        }
        legend={reading.wording.settings.readingFont}
        preferenceKey="readerFace"
        values={Object.values(ReaderFace)}
      />
      <ChoiceSetting
        labelOf={(ground) => reading.wording.settings[ground]}
        legend={reading.wording.settings.readingPage}
        noteOf={() => reading.wording.settings.appliesBooks}
        preferenceKey="readerGround"
        values={Object.values(ReaderGround)}
      />
      <SettingsGroup legend={reading.wording.settings.readingPreview}>
        <div className="pt-3">
          <ReaderSample>{reading.wording.about.description}</ReaderSample>
        </div>
      </SettingsGroup>
      <RedLetterSettings />
    </div>
  );
}

function LanguageSettings() {
  const reading = useReading();
  const marking = reading.catalog.aiTranslation;

  return (
    <ChoiceSetting
      labelOf={languageChoiceLabel.bind(undefined, reading)}
      legend={reading.wording.settings.language}
      preferenceKey="language"
      values={LANGUAGE_CHOICES}
    >
      {marking === null ? null : (
        <>
          <PreferenceSwitch
            description={reading.wording.settings.aiTranslationsNote}
            label={reading.wording.settings.aiTranslations}
            preferenceKey="aiTranslations"
          />
          <SettingsNote>
            <RedLetterNoticeText notice={marking.notice} />
          </SettingsNote>
        </>
      )}
    </ChoiceSetting>
  );
}

function ReadingSpeedPresets() {
  const reading = useReading();
  const { preferences, setPreference } = usePreferences();

  return (
    <ChoiceGroup
      label={reading.wording.settings.speedPresets}
      labelOf={readingSpeedName.bind(undefined, reading)}
      onSelect={(readingSpeed) => setPreference('readingSpeed', readingSpeed)}
      selected={preferences.readingSpeed}
      values={READING_SPEED_PRESETS}
    />
  );
}

function ReadingSpeedSlider() {
  const reading = useReading();
  const { preferences, setPreference } = usePreferences();

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-3">
      <span aria-hidden="true" className="font-display text-citation text-muted">
        0.5×
      </span>
      <input
        aria-labelledby={READING_SPEED_ID}
        aria-valuetext={readingSpeedLabel(reading, preferences.readingSpeed)}
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
        {readingSpeedLabel(reading, preferences.readingSpeed)}
      </output>
    </div>
  );
}

function GuidedPlaybackSettings() {
  const { wording } = useReading();
  return (
    <SettingsGroup legend={wording.settings.guidedPrayer}>
      <p className={`pt-2 ${BODY_CLASS_NAME} text-foreground`} id={READING_SPEED_ID}>
        {wording.settings.readingSpeed}
      </p>
      <ReadingSpeedPresets />
      <ReadingSpeedSlider />
      <SettingsNote>{wording.settings.guidedNote}</SettingsNote>
    </SettingsGroup>
  );
}

function RosaryBeadsSettings() {
  const { wording } = useReading();
  const { preferences, resolvedTheme, setPreference } = usePreferences();
  const material = effectiveBeadMaterial(preferences, resolvedTheme);

  return (
    <SettingsGroup legend={wording.settings.beadMaterial}>
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
            <span className={CITATION_CLASS_NAME}>{wording.settings.materials[beadMaterial]}</span>
          </button>
        ))}
      </div>
    </SettingsGroup>
  );
}

type BooleanPreferenceKey = {
  readonly [Key in PreferenceKey]: Preferences[Key] extends boolean ? Key : never;
}[PreferenceKey];

type PreferenceSwitchProps = {
  readonly description: string;
  readonly label: string;
  readonly preferenceKey: BooleanPreferenceKey;
};

function PreferenceSwitch({ description, label, preferenceKey }: PreferenceSwitchProps) {
  const { preferences, setPreference } = usePreferences();

  return (
    <label className="grid min-h-14 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-t border-hairline py-3">
      <span className={`${BODY_CLASS_NAME} text-foreground`}>{label}</span>
      <span className={`${CITATION_CLASS_NAME} text-muted`}>{description}</span>
      <input
        checked={preferences[preferenceKey]}
        className="peer sr-only"
        onChange={(event) => setPreference(preferenceKey, event.currentTarget.checked)}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="relative col-start-2 row-span-2 row-start-1 h-5 w-9 rounded-full bg-border transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-foreground after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
      />
    </label>
  );
}

type DisplayChoice = PreferenceSwitchProps & {
  readonly playback?: Pick<PreferenceSwitchProps, 'label' | 'preferenceKey'>;
};

const offeringsMapped = (reading: ReadingSnapshot): boolean =>
  reading.catalog.rosary.mysterySets.some(({ mysteries }) =>
    mysteries.some(({ reflection }) => reflection.status === ReflectionStatus.Mapped),
  );

const offeringsChoice = (reading: ReadingSnapshot): DisplayChoice => ({
  label: reading.wording.settings.decadeOfferings,
  description: reading.wording.settings.offeringsNote,
  preferenceKey: 'showDecadeOfferings',
  playback: {
    label: reading.wording.settings.includeOfferings,
    preferenceKey: 'readDecadeOfferings',
  },
});

const DISPLAY_CHOICES = (reading: ReadingSnapshot): readonly DisplayChoice[] => [
  {
    label: reading.wording.settings.scriptureReadings,
    description: reading.wording.settings.scriptureReadingsNote,
    preferenceKey: 'showScriptureReadings',
  },
  {
    label: reading.wording.settings.mysteryFruits,
    description: reading.wording.settings.fruitsNote,
    preferenceKey: 'showMysteryFruits',
    playback: { label: reading.wording.settings.includeFruits, preferenceKey: 'readMysteryFruits' },
  },
  {
    label: reading.wording.prayer.guidance,
    description: reading.wording.settings.guidanceNote,
    preferenceKey: 'showGuidance',
    playback: { label: reading.wording.settings.includeGuidance, preferenceKey: 'readGuidance' },
  },
  ...(offeringsMapped(reading) ? [offeringsChoice(reading)] : []),
  {
    label: reading.wording.settings.decorativeInitials,
    description: reading.wording.settings.initialsNote,
    preferenceKey: 'showDropCaps',
  },
];

function DisplayChoiceRow({ playback, ...choice }: DisplayChoice) {
  const { wording } = useReading();
  const { preferences } = usePreferences();
  const shown = preferences[choice.preferenceKey];

  return (
    <>
      <PreferenceSwitch {...choice} />
      {playback !== undefined && shown ? (
        <div className="pl-6">
          <PreferenceSwitch description={wording.settings.allowTime} {...playback} />
        </div>
      ) : null}
    </>
  );
}

function DisplaySettings() {
  const reading = useReading();
  return (
    <SettingsGroup legend={reading.wording.settings.duringPrayer}>
      {DISPLAY_CHOICES(reading).map((choice) => (
        <DisplayChoiceRow key={choice.preferenceKey} {...choice} />
      ))}
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
  const reading = useReading();
  return (
    <ChoiceGroup
      className="flex shrink-0 flex-wrap gap-x-5 border-b border-hairline px-5 lg:px-8"
      itemClassName={TAB_CLASS_NAME}
      label={reading.wording.settings.sections}
      labelOf={(tab) => SETTINGS_TAB_LABEL(reading)[tab]}
      onSelect={onSelect}
      selected={selected}
      tabs
      values={Object.values(SettingsTab)}
    />
  );
}

function RosaryTab() {
  const reading = useReading();
  return (
    <>
      <SettingsGroup legend={reading.wording.references.prayers}>
        <PreferenceSwitch
          description={reading.wording.settings.fatimaNote}
          label={reading.wording.settings.fatimaLabel}
          preferenceKey="includeFatimaPrayer"
        />
      </SettingsGroup>
      <DisplaySettings />
      <GuidedPlaybackSettings />
      <ChoiceSetting
        labelOf={(display) => ROSARY_DISPLAY_LABEL(reading)[display]}
        legend={reading.wording.settings.rosaryDisplay}
        noteOf={() => reading.wording.settings.currentDecadeNote}
        preferenceKey="rosaryDisplay"
        values={Object.values(RosaryDisplay)}
      />
      <RosaryBeadsSettings />
    </>
  );
}

function GeneralTab() {
  const reading = useReading();
  return (
    <>
      <LanguageSettings />
      <ChoiceSetting
        labelOf={(choice) => BIBLE_EDITION_LABEL(reading)[editionOf(reading.language, choice)]}
        legend={reading.wording.settings.bibleChoice}
        noteOf={() => reading.wording.settings.bibleChoiceNote}
        preferenceKey="bibleChoice"
        values={BIBLE_CHOICES}
      />
      <ChoiceSetting
        labelOf={(theme) => THEME_LABEL(reading)[theme]}
        legend={reading.wording.settings.appAppearance}
        noteOf={() => reading.wording.settings.followSystemNote}
        preferenceKey="theme"
        values={THEME_VALUES}
      />
      <TextScaleSettings />
      <ChoiceSetting
        labelOf={openingDurationLabel.bind(undefined, reading)}
        legend={reading.wording.settings.openingTimeout}
        noteOf={openingDurationNote.bind(undefined, reading)}
        preferenceKey="openingDuration"
        values={Object.values(OpeningDuration)}
      />
      <SettingsGroup legend={reading.wording.settings.externalLinks}>
        <PreferenceSwitch
          description={reading.wording.settings.askNote}
          label={reading.wording.settings.askLabel}
          preferenceKey="confirmExternalLinks"
        />
      </SettingsGroup>
      <ChoiceSetting
        labelOf={(updateChecks) => UPDATE_CHECKS_LABEL(reading)[updateChecks]}
        legend={reading.wording.settings.updates}
        noteOf={(updateChecks) => UPDATE_CHECKS_DESCRIPTION(reading)[updateChecks]}
        preferenceKey="updateChecks"
        values={Object.values(UpdateChecks)}
      />
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
  readonly onOpenPrivacy: () => void;
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
        if (event.key === KeyName.Escape) {
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
        onOpenPrivacy={props.onOpenPrivacy}
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
