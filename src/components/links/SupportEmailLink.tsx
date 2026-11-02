import { SUPPORT_EMAIL } from '../../appMetadata.ts';
import { UNDERLINE_LINK_CLASS_NAME } from '../../styles.ts';

export function SupportEmailLink({ email = SUPPORT_EMAIL }: { readonly email?: string }) {
  return (
    <a className={`${UNDERLINE_LINK_CLASS_NAME} wrap-break-word`} href={`mailto:${email}`}>
      {email}
    </a>
  );
}
