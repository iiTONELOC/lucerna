import { assetResolverFor } from './resolve.ts';

export const resolveInstallAsset = assetResolverFor(
  import.meta.glob<string>('./install/*.avif', { eager: true, query: '?url', import: 'default' }),
  './install/',
  'install',
);
