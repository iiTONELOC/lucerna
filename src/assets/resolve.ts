import { CodedError } from '../shared/codedError.ts';

export enum AssetErrorCode {
  MissingAsset = 'missing-asset',
  InvalidPath = 'invalid-path',
}

const ASSET_ERROR_MESSAGE: Readonly<Record<AssetErrorCode, string>> = {
  [AssetErrorCode.MissingAsset]: 'Asset is missing',
  [AssetErrorCode.InvalidPath]: 'Asset path is invalid',
};

export class AssetError extends CodedError<AssetErrorCode> {
  constructor(
    code: AssetErrorCode,
    readonly kind: string,
    readonly file: string,
  ) {
    super('AssetError', code, ASSET_ERROR_MESSAGE[code]);
  }
}

export const assetResolverFor =
  (modules: Readonly<Record<string, string>>, prefix: string, kind: string) =>
  (file: string): string => {
    const assetUrl = modules[`${prefix}${file}`];

    if (assetUrl === undefined) {
      throw new AssetError(AssetErrorCode.MissingAsset, kind, file);
    }

    return assetUrl;
  };
