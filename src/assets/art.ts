import { assetResolverFor } from './resolve.ts';

const resolveArtFile = assetResolverFor(
  import.meta.glob<string>('./art/*.avif', { eager: true, query: '?url', import: 'default' }),
  './art/',
  'art',
);

export const resolveArtAsset = (file: string): string => {
  const filename = file.split('/').pop();

  if (filename === undefined || filename.length === 0) {
    throw new Error(`Invalid art asset path: ${file}`);
  }

  return resolveArtFile(filename);
};
