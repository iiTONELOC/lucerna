import {
  collectArtifactPaths,
  createBuildId,
  createPrecacheUrls,
  fingerprintedPathFrom,
  selectIdentityArtifacts,
  type BuildArtifact,
} from './pwaBuild.ts';
import { addIntegrityToAssetTags, integrityFrom } from './subresourceIntegrity.ts';
import { editionAssetPrefixOf, LANGUAGES, LATIN_EDITION_ID } from '../src/content/language.ts';
import { CodedError } from '../src/shared/codedError.ts';

enum PwaBuildErrorCode {
  MissingArtifact = 'missing-artifact',
  InvalidManifest = 'invalid-manifest',
  InvalidManifestIcons = 'invalid-manifest-icons',
  ServiceWorkerFailed = 'service-worker-failed',
  ServiceWorkerMissing = 'service-worker-missing',
}

const PWA_BUILD_ERROR_MESSAGE: Readonly<Record<PwaBuildErrorCode, string>> = {
  [PwaBuildErrorCode.MissingArtifact]: 'Required PWA build artifact is missing',
  [PwaBuildErrorCode.InvalidManifest]: 'Lucerna web manifest is invalid',
  [PwaBuildErrorCode.InvalidManifestIcons]: 'Lucerna web manifest icons are invalid',
  [PwaBuildErrorCode.ServiceWorkerFailed]: 'Lucerna service-worker build failed',
  [PwaBuildErrorCode.ServiceWorkerMissing]: 'Lucerna service-worker output is missing',
};

class PwaBuildError extends CodedError<PwaBuildErrorCode> {
  constructor(
    code: PwaBuildErrorCode,
    readonly path?: string,
  ) {
    super('PwaBuildError', code, PWA_BUILD_ERROR_MESSAGE[code]);
  }
}

enum RequiredArtifact {
  AppleTouchIcon = 'icons/lucerna-180.png',
  Icon192 = 'icons/lucerna-192.png',
  Icon512 = 'icons/lucerna-512.png',
  Index = 'index.html',
  Manifest = 'manifest.webmanifest',
  MaskableIcon = 'icons/lucerna-maskable-512.png',
}

type BuildMetadata = {
  readonly artifacts: readonly string[];
  readonly buildId: string;
  readonly precacheUrls: readonly string[];
  readonly editionSets: Readonly<Record<string, readonly string[]>>;
};

const EDITION_PREFIXES: readonly string[] = LANGUAGES.map((language) =>
  editionAssetPrefixOf(language, LATIN_EDITION_ID),
);

const editionSetsFrom = (urls: readonly string[]): Readonly<Record<string, readonly string[]>> =>
  Object.fromEntries(
    EDITION_PREFIXES.map((prefix) => [
      prefix,
      urls.filter((url) => url.startsWith(`./assets/${prefix}`)),
    ]),
  );

type ManifestIcon = {
  readonly src: string;
  readonly [member: string]: unknown;
};

type WebManifest = {
  readonly icons: readonly ManifestIcon[];
  readonly [member: string]: unknown;
};

const repositoryRoot = new URL('../', import.meta.url);
const outputDirectory = new URL('dist/', repositoryRoot);
const serviceWorkerEntry = new URL('src/features/pwa/serviceWorker.ts', repositoryRoot);
const serviceWorkerOutput = new URL('service-worker.js', outputDirectory);
const buildMetadataOutput = new URL('build-meta.json', outputDirectory);

const requireArtifact = async (path: RequiredArtifact): Promise<void> => {
  if (!(await Bun.file(new URL(path, outputDirectory)).exists())) {
    throw new PwaBuildError(PwaBuildErrorCode.MissingArtifact, path);
  }
};

const webManifestFrom = (value: unknown): WebManifest => {
  if (typeof value !== 'object' || value === null || !('icons' in value)) {
    throw new PwaBuildError(PwaBuildErrorCode.InvalidManifest);
  }

  const { icons } = value;

  if (!Array.isArray(icons)) {
    throw new PwaBuildError(PwaBuildErrorCode.InvalidManifestIcons);
  }

  const parsedIcons: ManifestIcon[] = [];

  for (const icon of icons) {
    if (
      typeof icon !== 'object' ||
      icon === null ||
      !('src' in icon) ||
      typeof icon.src !== 'string'
    ) {
      throw new PwaBuildError(PwaBuildErrorCode.InvalidManifestIcons);
    }

    parsedIcons.push({ ...icon, src: icon.src });
  }

  return { ...value, icons: parsedIcons };
};

const fingerprintIcons = async (): Promise<void> => {
  const iconPaths = Object.values(RequiredArtifact).filter((path) => path.startsWith('icons/'));
  const replacements = new Map<string, string>();

  for (const path of iconPaths) {
    const source = Bun.file(new URL(path, outputDirectory));
    const artifact = await loadArtifact(path);
    const fingerprintedPath = fingerprintedPathFrom(artifact);

    await Bun.write(new URL(fingerprintedPath, outputDirectory), artifact.bytes);
    await source.delete();
    replacements.set(path, fingerprintedPath);
  }

  const manifestFile = Bun.file(new URL(RequiredArtifact.Manifest, outputDirectory));
  const manifest = webManifestFrom(await manifestFile.json());
  const fingerprintedManifest: WebManifest = {
    ...manifest,
    icons: manifest.icons.map((icon) => ({
      ...icon,
      src: replacements.get(icon.src) ?? icon.src,
    })),
  };
  await Bun.write(manifestFile, `${JSON.stringify(fingerprintedManifest, null, 2)}\n`);

  const indexFile = Bun.file(new URL(RequiredArtifact.Index, outputDirectory));
  let indexHtml = await indexFile.text();

  for (const [sourcePath, fingerprintedPath] of replacements) {
    indexHtml = indexHtml.replaceAll(sourcePath, fingerprintedPath);
  }

  await Bun.write(indexFile, indexHtml);
};

const loadArtifact = async (path: string): Promise<BuildArtifact> => ({
  bytes: new Uint8Array(await Bun.file(new URL(path, outputDirectory)).arrayBuffer()),
  path,
});

const stampAssetIntegrity = async (): Promise<void> => {
  const assetsDirectory = new URL('assets/', outputDirectory);
  const indexFile = Bun.file(new URL(RequiredArtifact.Index, outputDirectory));
  let indexHtml = await indexFile.text();
  const fileNames = await Array.fromAsync(
    new Bun.Glob('*.{css,js}').scan({ cwd: assetsDirectory.pathname }),
  );

  for (const fileName of fileNames.toSorted((left, right) => left.localeCompare(right, 'en-US'))) {
    const bytes = new Uint8Array(await Bun.file(new URL(fileName, assetsDirectory)).arrayBuffer());

    indexHtml = addIntegrityToAssetTags(indexHtml, `./assets/${fileName}`, integrityFrom(bytes));
  }

  await Bun.write(indexFile, indexHtml);
};

const buildPwa = async (): Promise<void> => {
  await Promise.all(Object.values(RequiredArtifact).map(requireArtifact));
  await fingerprintIcons();
  await stampAssetIntegrity();

  const artifactPaths = await collectArtifactPaths(outputDirectory);
  const artifacts = await Promise.all(artifactPaths.map(loadArtifact));
  const identityArtifacts = selectIdentityArtifacts(artifacts);
  const buildId = createBuildId(identityArtifacts);
  const shippedUrls = createPrecacheUrls(identityArtifacts.map(({ path }) => path));
  const editionSets = editionSetsFrom(shippedUrls);
  const editionUrls = new Set(Object.values(editionSets).flat());
  const precacheUrls = shippedUrls.filter((url) => !editionUrls.has(url));
  const serviceWorkerBuild = await Bun.build({
    define: {
      __LUCERNA_BUILD_ID__: JSON.stringify(buildId),
      __LUCERNA_PRECACHE_URLS__: JSON.stringify(precacheUrls),
      __LUCERNA_EDITION_SETS__: JSON.stringify(editionSets),
    },
    entrypoints: [serviceWorkerEntry.pathname],
    format: 'iife',
    minify: true,
    naming: 'service-worker.js',
    outdir: outputDirectory.pathname,
    target: 'browser',
  });

  if (!serviceWorkerBuild.success) {
    for (const log of serviceWorkerBuild.logs) {
      console.error(log);
    }

    throw new PwaBuildError(PwaBuildErrorCode.ServiceWorkerFailed);
  }

  if (!(await Bun.file(serviceWorkerOutput).exists())) {
    throw new PwaBuildError(PwaBuildErrorCode.ServiceWorkerMissing);
  }

  const metadata: BuildMetadata = {
    artifacts: identityArtifacts.map(({ path }) => path),
    buildId,
    precacheUrls,
    editionSets,
  };
  await Bun.write(buildMetadataOutput, `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(`PWA build ${buildId} contains ${precacheUrls.length} offline assets.`);
};

if (import.meta.main) {
  await buildPwa();
}
