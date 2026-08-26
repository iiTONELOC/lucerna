const artImageModules = import.meta.glob("./art/*.avif", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export function resolveArtAsset(file: string): string {
  const filename = file.split("/").pop();

  if (!filename) {
    throw new Error(`Invalid art asset path: ${file}`);
  }

  const assetUrl = artImageModules[`./art/${filename}`];

  if (!assetUrl) {
    throw new Error(`Missing art asset: ${file}`);
  }

  return assetUrl;
}
