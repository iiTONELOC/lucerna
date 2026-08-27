import { SUPPORT_EMAIL } from '../../appMetadata.ts';

export function SupportEmailLink() {
  return (
    <a
      className="focus-ring wrap-break-word text-accent-current underline decoration-hairline underline-offset-4 transition-colors hover:decoration-accent"
      href={`mailto:${SUPPORT_EMAIL}`}
    >
      {SUPPORT_EMAIL}
    </a>
  );
}
