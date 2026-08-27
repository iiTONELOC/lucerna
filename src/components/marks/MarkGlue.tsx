import type { ReactNode } from 'react';

export function MarkGlue({ children }: { readonly children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>;
}
