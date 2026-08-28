import type { ReactNode } from 'react';

export const runText = (text: string, className: string | undefined): ReactNode =>
  className === undefined ? text : <span className={className}>{text}</span>;
