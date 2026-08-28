export const assetResolverFor =
  (modules: Readonly<Record<string, string>>, prefix: string, kind: string) =>
  (file: string): string => {
    const assetUrl = modules[`${prefix}${file}`];

    if (assetUrl === undefined) {
      throw new Error(`Missing ${kind} asset: ${file}`);
    }

    return assetUrl;
  };
