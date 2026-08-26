export const BUILD_ID_LENGTH = 20;
export const ASSET_FINGERPRINT_LENGTH = 16;

export type BuildArtifact = {
  readonly bytes: Uint8Array;
  readonly path: string;
};

enum PwaArtifactPath {
  BuildMetadata = 'build-meta.json',
  ServiceWorker = 'service-worker.js',
}

const GENERATED_ARTIFACTS: ReadonlySet<string> = new Set([
  PwaArtifactPath.BuildMetadata,
  PwaArtifactPath.ServiceWorker,
]);

const comparePaths = (left: string, right: string): number => left.localeCompare(right);

const isShippedArtifact = (path: string): boolean =>
  !GENERATED_ARTIFACTS.has(path) && !path.endsWith('.map');

export const collectArtifactPaths = async (root: URL): Promise<readonly string[]> => {
  const paths = await Array.fromAsync(
    new Bun.Glob('**/*').scan({ cwd: root.pathname, dot: true, onlyFiles: true }),
  );

  return paths.sort(comparePaths);
};

export const selectIdentityArtifacts = (
  artifacts: readonly BuildArtifact[],
): readonly BuildArtifact[] =>
  artifacts
    .filter(({ path }) => isShippedArtifact(path))
    .sort((left, right) => comparePaths(left.path, right.path));

export const createBuildId = (artifacts: readonly BuildArtifact[]): string => {
  const hash = new Bun.CryptoHasher('sha256');

  for (const artifact of [...artifacts].sort((left, right) =>
    comparePaths(left.path, right.path),
  )) {
    hash.update(artifact.path);
    hash.update('\0');
    hash.update(artifact.bytes);
    hash.update('\0');
  }

  return hash.digest('hex').slice(0, BUILD_ID_LENGTH);
};

export const fingerprintedPathFrom = (artifact: BuildArtifact): string => {
  const extensionStart = artifact.path.lastIndexOf('.');

  if (extensionStart < 0) {
    throw new Error(`Cannot fingerprint an extensionless asset: ${artifact.path}`);
  }

  const hash = new Bun.CryptoHasher('sha256').update(artifact.bytes).digest('hex');

  return `${artifact.path.slice(0, extensionStart)}-${hash.slice(0, ASSET_FINGERPRINT_LENGTH)}${artifact.path.slice(extensionStart)}`;
};

export const createPrecacheUrls = (artifactPaths: readonly string[]): readonly string[] => {
  const urls = artifactPaths
    .filter(isShippedArtifact)
    .map((path) => (path === 'index.html' ? './' : `./${path}`));

  return [...new Set(urls)].sort(comparePaths);
};
