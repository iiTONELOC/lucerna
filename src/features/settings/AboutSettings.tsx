import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_VERSION,
  APPLICATION_LICENSE,
  APPLICATION_LICENSE_DETAIL,
  CONTENT_RIGHTS_DETAIL,
  COPYRIGHT_NOTICE,
  TRADEMARK_NOTICE,
} from '../../appMetadata.ts';
import { DetailList } from '../../components/layout.tsx';
import { SupportEmailLink } from '../../components/links/SupportEmailLink.tsx';
import {
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  INLINE_LINK_CLASS_NAME,
} from '../../styles.ts';

const ABOUT_TITLE_ID = 'settings-about-title';

function ApplicationDetails() {
  return (
    <DetailList
      className="items-baseline pt-4"
      rows={[
        ['Version', APP_VERSION],
        ['Copyright', `${COPYRIGHT_NOTICE}. ${APPLICATION_LICENSE}`],
        ['License', APPLICATION_LICENSE_DETAIL],
        ['Support', <SupportEmailLink key="support" />],
      ]}
      termClassName={EYEBROW_CLASS_NAME}
    />
  );
}

function ApplicationInformation() {
  return (
    <>
      <div className="pt-3">
        <p className={`${BODY_CLASS_NAME} text-foreground`}>{APP_NAME}</p>
        <p className={`${CITATION_CLASS_NAME} text-secondary`}>{APP_DESCRIPTION}</p>
      </div>
      <ApplicationDetails />
      <p className={`pt-3 ${CITATION_CLASS_NAME} text-muted`}>{CONTENT_RIGHTS_DETAIL}</p>
      <p className={`pt-3 ${CITATION_CLASS_NAME} text-muted`}>{TRADEMARK_NOTICE}</p>
    </>
  );
}

export type AboutSettingsProps = {
  readonly onOpenInstallGuide: () => void;
  readonly onOpenReferences: () => void;
};

export function AboutSettings({ onOpenInstallGuide, onOpenReferences }: AboutSettingsProps) {
  return (
    <section aria-labelledby={ABOUT_TITLE_ID} className="border-t border-hairline pt-4">
      <h3 className={EYEBROW_CLASS_NAME} id={ABOUT_TITLE_ID}>
        About
      </h3>
      <ApplicationInformation />
      <div className="flex flex-col items-start gap-1 pt-3">
        <button className={INLINE_LINK_CLASS_NAME} onClick={onOpenReferences} type="button">
          Open references
        </button>
        <button className={INLINE_LINK_CLASS_NAME} onClick={onOpenInstallGuide} type="button">
          How to add Lucerna to your device
        </button>
      </div>
    </section>
  );
}
