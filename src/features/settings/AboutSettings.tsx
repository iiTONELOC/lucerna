import { APP_NAME, APP_VERSION, COPYRIGHT_NOTICE, COPYRIGHT_OWNER } from '../../appMetadata.ts';
import { DetailList } from '../../components/layout.tsx';
import { SupportEmailLink } from '../../components/links/SupportEmailLink.tsx';
import { SupportLink } from '../../components/links/SupportLink.tsx';
import { useReading } from '../../content/reading.ts';
import {
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  INLINE_LINK_CLASS_NAME,
} from '../../styles.ts';

const ABOUT_TITLE_ID = 'settings-about-title';

function ApplicationDetails() {
  const { wording } = useReading();
  return (
    <DetailList
      className="items-baseline pt-4"
      rows={[
        [wording.about.version, APP_VERSION],
        [wording.about.copyright, `${COPYRIGHT_NOTICE}. ${wording.about.allRightsReserved}`],
        [wording.about.license, wording.about.licenseDetail],
        [wording.about.support, <SupportEmailLink key="support" />],
      ]}
      termClassName={EYEBROW_CLASS_NAME}
    />
  );
}

function ApplicationInformation() {
  const { wording } = useReading();
  return (
    <>
      <div className="pt-3">
        <p className={`${BODY_CLASS_NAME} text-foreground`}>{APP_NAME}</p>
        <p className={`${CITATION_CLASS_NAME} text-secondary`}>{wording.about.description}</p>
      </div>
      <ApplicationDetails />
      <p className={`pt-3 ${CITATION_CLASS_NAME} text-muted`}>{wording.about.contentRights}</p>
      <p className={`pt-3 ${CITATION_CLASS_NAME} text-muted`}>
        {wording.about.trademark(APP_NAME, COPYRIGHT_OWNER)}
      </p>
    </>
  );
}

export type AboutSettingsProps = {
  readonly onOpenInstallGuide: () => void;
  readonly onOpenPrivacy: () => void;
  readonly onOpenReferences: () => void;
};

export function AboutSettings({
  onOpenInstallGuide,
  onOpenPrivacy,
  onOpenReferences,
}: AboutSettingsProps) {
  const { wording } = useReading();
  return (
    <section aria-labelledby={ABOUT_TITLE_ID} className="border-t border-hairline pt-4">
      <h3 className={EYEBROW_CLASS_NAME} id={ABOUT_TITLE_ID}>
        {wording.about.title}
      </h3>
      <ApplicationInformation />
      <div className="flex flex-col items-start gap-1 pt-3">
        <SupportLink className={INLINE_LINK_CLASS_NAME} />
        <button className={INLINE_LINK_CLASS_NAME} onClick={onOpenPrivacy} type="button">
          {wording.privacy.link}
        </button>
        <button className={INLINE_LINK_CLASS_NAME} onClick={onOpenReferences} type="button">
          {wording.about.openReferences}
        </button>
        <button className={INLINE_LINK_CLASS_NAME} onClick={onOpenInstallGuide} type="button">
          {wording.install.title}
        </button>
      </div>
    </section>
  );
}
