import { useCallback, type RefObject } from 'react';
import { useResizeMeasure, type Measurement } from '../../shared/useResizeMeasure.ts';

const startingAt = (initial: number): Measurement<number> => ({ initial, same: Object.is });

const HEIGHT_MEASUREMENT = startingAt(0);

const COLUMNS_MEASUREMENT = startingAt(1);

export const useSupportHeight = (support: RefObject<HTMLElement | null>): number => {
  const measure = useCallback(() => support.current?.offsetHeight ?? 0, [support]);

  return useResizeMeasure(support, measure, HEIGHT_MEASUREMENT, support)[0];
};

export const useMysteryColumns = (
  picker: RefObject<HTMLElement | null>,
  probe: RefObject<HTMLElement | null>,
): number => {
  const measure = useCallback((): number => {
    const natural = probe.current?.offsetWidth ?? 0;
    const width = picker.current?.clientWidth ?? 0;

    return natural > 0 && natural * 2 <= width ? 2 : 1;
  }, [picker, probe]);

  return useResizeMeasure(picker, measure, COLUMNS_MEASUREMENT, probe)[0];
};
