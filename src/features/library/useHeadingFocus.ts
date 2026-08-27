import { useEffect, useRef, type RefObject } from 'react';

export const useHeadingFocus = (focusKey: string): RefObject<HTMLHeadingElement | null> => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [focusKey]);

  return headingRef;
};
