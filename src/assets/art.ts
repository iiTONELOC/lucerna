import { AssetError, AssetErrorCode, assetResolverFor } from "./resolve.ts";

const ART_ASSET_KIND = "art";
const HERO_ART_ASSET_KIND = "hero art";

const resolveArtFile = assetResolverFor(
  import.meta.glob<string>("./art/*.avif", { eager: true, query: "?url", import: "default" }),
  "./art/",
  ART_ASSET_KIND,
);

const resolveHeroArtFile = assetResolverFor(
  import.meta.glob<string>("./art/hero/*.avif", { eager: true, query: "?url", import: "default" }),
  "./art/hero/",
  HERO_ART_ASSET_KIND,
);

const artFilenameOf = (file: string, kind: string): string => {
  const filename = file.split("/").pop();

  if (filename === undefined || filename.length === 0) {
    throw new AssetError(AssetErrorCode.InvalidPath, kind, file);
  }

  return filename;
};

export const resolveArtAsset = (file: string): string =>
  resolveArtFile(artFilenameOf(file, ART_ASSET_KIND));

export const resolveHeroArtAsset = (file: string): string =>
  resolveHeroArtFile(artFilenameOf(file, HERO_ART_ASSET_KIND));
