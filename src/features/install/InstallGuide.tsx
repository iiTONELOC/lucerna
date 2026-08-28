import { resolveInstallAsset } from '../../assets/install.ts';
import { BackButton } from '../../components/buttons/BackButton.tsx';
import { FocusPage, ViewHeader } from '../../components/layout.tsx';
import {
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  NAV_CLASS_NAME,
  SCRIPTURE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { INSTALL_SECTIONS, type InstallSection, type InstallStep } from './installGuide.ts';

const INSTALL_TITLE_ID = 'install-title';
const SECTION_LINK_CLASS_NAME = `inline-flex min-h-11 items-center rounded-lg border border-hairline px-3 text-secondary transition-colors hover:border-accent/60 hover:text-accent-current focus-ring ${NAV_CLASS_NAME}`;
const STEP_NUMBER_CLASS_NAME = `flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/50 ${CITATION_CLASS_NAME} text-accent-current`;
function InstallSectionLinks() {
  return (
    <nav aria-label="Devices" className="flex flex-wrap gap-2">
      {INSTALL_SECTIONS.map((section) => (
        <a className={SECTION_LINK_CLASS_NAME} href={`#install-${section.id}`} key={section.id}>
          {section.heading}
        </a>
      ))}
    </nav>
  );
}

function InstallStepItem({
  ordinal,
  step,
}: {
  readonly ordinal: number;
  readonly step: InstallStep;
}) {
  return (
    <li className="flex flex-col gap-3 border-t border-hairline pt-4">
      <p className="flex items-start gap-3">
        <span aria-hidden="true" className={STEP_NUMBER_CLASS_NAME}>
          {ordinal}
        </span>
        <span className={`${SCRIPTURE_CLASS_NAME} text-foreground`}>{step.instruction}</span>
      </p>
      {step.image === undefined ? null : (
        <img
          alt={step.alt ?? step.instruction}
          className="ml-11 w-full max-w-72 rounded-lg border border-hairline sm:max-w-80"
          decoding="async"
          loading="lazy"
          src={resolveInstallAsset(step.image)}
        />
      )}
    </li>
  );
}

function InstallSectionView({ section }: { readonly section: InstallSection }) {
  const headingId = `install-${section.id}`;

  return (
    <section aria-labelledby={headingId} className="scroll-mt-4 border-t border-hairline pt-6">
      <p className={EYEBROW_CLASS_NAME}>{section.browsers}</p>
      <h2 className={`${TITLE_CLASS_NAME} pt-1`} id={headingId}>
        {section.heading}
      </h2>
      {section.note === undefined ? null : (
        <p className={`${CITATION_CLASS_NAME} max-w-prose pt-2 text-muted`}>{section.note}</p>
      )}
      <ol className="mt-4 flex flex-col gap-4 [&>li:first-child]:border-t-0 [&>li:first-child]:pt-0">
        {section.steps.map((step, index) => (
          <InstallStepItem key={step.instruction} ordinal={index + 1} step={step} />
        ))}
      </ol>
    </section>
  );
}

export function InstallGuide({ onBack }: { readonly onBack: () => void }) {
  return (
    <FocusPage labelledBy={INSTALL_TITLE_ID}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pt-5 pb-[60dvh] sm:px-6 lg:px-8 lg:pt-10">
        <BackButton onBack={onBack} />
        <ViewHeader
          eyebrow="Keep Lucerna on your device"
          id={INSTALL_TITLE_ID}
          lede="Lucerna works in a browser. Add it to your device and it opens like any other application."
          title="How to add Lucerna to your device"
        >
          <div className="pt-2">
            <InstallSectionLinks />
          </div>
        </ViewHeader>

        {INSTALL_SECTIONS.map((section) => (
          <InstallSectionView key={section.id} section={section} />
        ))}
      </div>
    </FocusPage>
  );
}
