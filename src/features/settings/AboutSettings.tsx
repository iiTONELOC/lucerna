import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_VERSION,
  APPLICATION_LICENSE,
  APPLICATION_LICENSE_DETAIL,
  CONTENT_RIGHTS_DETAIL,
  COPYRIGHT_NOTICE,
  SUPPORT_EMAIL,
  TRADEMARK_NOTICE,
} from '../../appMetadata.ts';
import { INLINE_LINK_CLASS_NAME } from '../../styles.ts';

const ABOUT_TITLE_ID = 'settings-about-title';

function AboutTerm({ children }: { readonly children: string }) {
  return (
    <dt className="small-caps font-display text-subtitle leading-subtitle font-semibold tracking-subtitle text-accent-current">
      {children}
    </dt>
  );
}

function ApplicationDetails() {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 pt-4">
      <AboutTerm>Version</AboutTerm>
      <dd className="font-display text-citation leading-citation text-secondary">{APP_VERSION}</dd>
      <AboutTerm>Copyright</AboutTerm>
      <dd className="font-display text-citation leading-citation text-secondary">
        {COPYRIGHT_NOTICE}. {APPLICATION_LICENSE}
      </dd>
      <AboutTerm>License</AboutTerm>
      <dd className="font-display text-citation leading-citation text-secondary">
        {APPLICATION_LICENSE_DETAIL}
      </dd>
      <AboutTerm>Support</AboutTerm>
      <dd className="min-w-0">
        <a
          className="break-all font-display text-citation leading-citation text-accent-current underline decoration-hairline underline-offset-4 transition-colors hover:decoration-accent"
          href={`mailto:${SUPPORT_EMAIL}`}
        >
          {SUPPORT_EMAIL}
        </a>
      </dd>
    </dl>
  );
}

function ApplicationInformation() {
  return (
    <>
      <div className="pt-3">
        <p className="font-display text-body leading-body text-foreground">{APP_NAME}</p>
        <p className="font-display text-citation leading-citation text-secondary">
          {APP_DESCRIPTION}
        </p>
      </div>
      <ApplicationDetails />
      <p className="pt-3 font-display text-citation leading-citation text-muted">
        {CONTENT_RIGHTS_DETAIL}
      </p>
      <p className="pt-3 font-display text-citation leading-citation text-muted">
        {TRADEMARK_NOTICE}
      </p>
    </>
  );
}

type AboutSettingsProps = {
  readonly onOpenInstallGuide: () => void;
  readonly onOpenReferences: () => void;
};

export function AboutSettings({ onOpenInstallGuide, onOpenReferences }: AboutSettingsProps) {
  return (
    <section aria-labelledby={ABOUT_TITLE_ID} className="border-t border-hairline pt-4">
      <h3
        className="small-caps font-display text-subtitle leading-subtitle font-semibold tracking-subtitle text-accent-current"
        id={ABOUT_TITLE_ID}
      >
        About
      </h3>
      <ApplicationInformation />
      <div className="flex flex-col items-start gap-1 pt-3">
        <button className={INLINE_LINK_CLASS_NAME} onClick={onOpenReferences} type="button">
          Open references
        </button>
        <button className={INLINE_LINK_CLASS_NAME} onClick={onOpenInstallGuide} type="button">
          Add Lucerna to your device
        </button>
      </div>
    </section>
  );
}
