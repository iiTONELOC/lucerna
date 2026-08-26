const installImageModules = import.meta.glob('./install/*.avif', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function resolveInstallAsset(file: string): string {
  const assetUrl = installImageModules[`./install/${file}`];

  if (assetUrl === undefined) {
    throw new Error(`Missing install asset: ${file}`);
  }

  return assetUrl;
}
