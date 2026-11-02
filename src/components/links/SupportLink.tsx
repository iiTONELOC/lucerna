import type { ReactNode } from 'react';
import { SUPPORT_PAYMENT_URL } from '../../appMetadata.ts';
import { useReading } from '../../content/reading.ts';
import { ExternalLink } from './ExternalLink.tsx';

export const QUIET_LINK_CLASS_NAME =
  'focus-ring underline decoration-hairline underline-offset-4 transition-colors hover:text-foreground';

export function SupportLink({
  children,
  className,
}: {
  readonly children?: ReactNode;
  readonly className: string;
}) {
  const { wording } = useReading();
  return (
    <ExternalLink className={className} href={SUPPORT_PAYMENT_URL}>
      {children ?? wording.support.link}
    </ExternalLink>
  );
}
