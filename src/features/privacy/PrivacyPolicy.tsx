import { COPYRIGHT_OWNER, MAILING_ADDRESS, PRIVACY_EMAIL } from '../../appMetadata.ts';
import { BackButton } from '../../components/buttons/BackButton.tsx';
import { FocusPage } from '../../components/layout.tsx';
import { SupportEmailLink } from '../../components/links/SupportEmailLink.tsx';
import { Language } from '../../content/language.ts';
import { useReading } from '../../content/reading.ts';
import {
  ENGLISH_WORDING,
  type PolicyBlock,
  type PolicySection,
  type PrivacyText,
} from '../../content/wording/english.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import {
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';

export const PRIVACY_HASH = '#privacy';

const PRIVACY_TITLE_ID = 'privacy-title';
const TEXT_CLASS_NAME = `${BODY_CLASS_NAME} text-secondary`;
const LABEL_CLASS_NAME = 'font-semibold text-foreground';
const LIST_CLASS_NAME = `${TEXT_CLASS_NAME} flex list-decimal flex-col gap-1 pl-6`;
const SECTION_HEADING_CLASS_NAME = `${SUBTITLE_CLASS_NAME} border-b border-hairline pb-2 font-semibold text-foreground uppercase`;
const SUBSECTION_HEADING_CLASS_NAME = `${BODY_CLASS_NAME} font-semibold text-foreground underline underline-offset-4`;

const usePrivacyText = (): PrivacyText => {
  const { wording } = useReading();
  const { preferences } = usePreferences();

  return wording.privacy.translationNote !== undefined && !preferences.aiTranslations
    ? ENGLISH_WORDING.privacy
    : wording.privacy;
};

const blockKeyOf = (block: PolicyBlock): string => {
  if (typeof block === 'string') {
    return block;
  }

  return 'items' in block ? block.items.join() : PRIVACY_EMAIL;
};

function PolicyBlockView({ block }: { readonly block: PolicyBlock }) {
  if (typeof block === 'string') {
    return <p className={TEXT_CLASS_NAME}>{block}</p>;
  }

  if ('items' in block) {
    return (
      <ol className={LIST_CLASS_NAME}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }

  return (
    <p className={TEXT_CLASS_NAME}>
      {COPYRIGHT_OWNER}
      <br />
      <SupportEmailLink email={PRIVACY_EMAIL} />
      <br />
      {MAILING_ADDRESS}
    </p>
  );
}

function PolicyBlocks({ blocks }: { readonly blocks: readonly PolicyBlock[] }) {
  return blocks.map((block) => <PolicyBlockView block={block} key={blockKeyOf(block)} />);
}

function PolicySectionView({ section }: { readonly section: PolicySection }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className={SECTION_HEADING_CLASS_NAME}>{section.heading}</h2>
      <PolicyBlocks blocks={section.blocks} />
      {section.subsections?.map((subsection) => (
        <section className="flex flex-col gap-3 pt-1" key={subsection.heading}>
          <h3 className={SUBSECTION_HEADING_CLASS_NAME}>{subsection.heading}</h3>
          <PolicyBlocks blocks={subsection.blocks} />
        </section>
      ))}
    </section>
  );
}

function PolicyHeader({ text }: { readonly text: PrivacyText }) {
  return (
    <header className="flex flex-col gap-4 text-center">
      <h1
        className={`${TITLE_CLASS_NAME} border-b border-hairline pb-4 uppercase`}
        id={PRIVACY_TITLE_ID}
      >
        {text.title}
      </h1>
      {text.translationNote === undefined ? null : (
        <p className={`${CITATION_CLASS_NAME} text-muted`}>{text.translationNote}</p>
      )}
      <p className={TEXT_CLASS_NAME}>
        <span className={LABEL_CLASS_NAME}>{text.websiteTypeLabel}</span> {text.websiteType}
        <br />
        <span className={LABEL_CLASS_NAME}>{text.effectiveLabel}</span> {text.effectiveDate}
      </p>
    </header>
  );
}

export function PrivacyPolicy({ onBack }: { readonly onBack: () => void }) {
  const { wording } = useReading();
  const text = usePrivacyText();

  return (
    <FocusPage labelledBy={PRIVACY_TITLE_ID}>
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-5 pb-16 sm:px-6 lg:px-8 lg:pt-10"
        lang={text === wording.privacy ? undefined : Language.English}
      >
        <BackButton onBack={onBack} />
        <PolicyHeader text={text} />
        <p className={TEXT_CLASS_NAME}>
          {text.owner}
          <br />
          <span className={LABEL_CLASS_NAME}>{text.contactLabel}</span> <SupportEmailLink />
          <br />
          {MAILING_ADDRESS}
        </p>
        {text.sections.map((section) => (
          <PolicySectionView key={section.heading} section={section} />
        ))}
      </div>
    </FocusPage>
  );
}
