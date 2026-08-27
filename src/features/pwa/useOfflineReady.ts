import { useEffect, useState } from 'react';
import { whenOfflineReady } from './registration.ts';

export const useOfflineReady = (): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    void whenOfflineReady().then(() => {
      if (active) {
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return ready;
};
