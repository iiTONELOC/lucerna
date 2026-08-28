import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

export type Measurement<Value> = {
  readonly initial: Value;
  readonly same: (previous: Value, next: Value) => boolean;
};

export const useResizeMeasure = <Value>(
  target: RefObject<Element | null>,
  measure: () => Value,
  measurement: Measurement<Value>,
  key: unknown,
): readonly [Value, () => void] => {
  const [value, setValue] = useState(measurement.initial);
  const { same } = measurement;
  const remeasure = useCallback((): void => {
    setValue((previous) => {
      const next = measure();

      return same(previous, next) ? previous : next;
    });
  }, [measure, same]);

  useLayoutEffect(() => {
    remeasure();

    const element = target.current;

    if (element === null || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(remeasure);

    observer.observe(element);

    return () => observer.disconnect();
  }, [key, remeasure, target]);

  return [value, remeasure];
};
