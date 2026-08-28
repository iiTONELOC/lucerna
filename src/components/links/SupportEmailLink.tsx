import { SUPPORT_EMAIL } from '../../appMetadata.ts';
import { UNDERLINE_LINK_CLASS_NAME } from '../../styles.ts';

export function SupportEmailLink() {
  return (
    <a className={`${UNDERLINE_LINK_CLASS_NAME} wrap-break-word`} href={`mailto:${SUPPORT_EMAIL}`}>
      {SUPPORT_EMAIL}
    </a>
  );
}
