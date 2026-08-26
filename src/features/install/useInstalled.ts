import { useEffect, useState } from 'react';
import { isInstalled, watchInstalled } from '../pwa/installed.ts';

export const useInstalled = (): boolean => {
  const [installed, setInstalled] = useState(isInstalled);

  useEffect(() => watchInstalled(() => setInstalled(isInstalled())), []);

  return installed;
};
