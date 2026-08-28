import { classNames } from '../../shared/classNames.ts';
import { AmbientScrim } from './model.ts';

const IMAGE_CLASS_NAME: Readonly<Record<AmbientScrim, string | undefined>> = {
  [AmbientScrim.Ground]: 'opacity-[0.52]!',
  [AmbientScrim.Focus]: undefined,
};

export function AmbientGround({
  scrim = AmbientScrim.Ground,
  source,
}: {
  readonly scrim?: AmbientScrim;
  readonly source: string;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        alt=""
        className={classNames(
          'art-ambient absolute inset-0 size-full object-cover',
          IMAGE_CLASS_NAME[scrim],
        )}
        src={source}
      />
      <div className={`${scrim} absolute inset-0`} />
    </div>
  );
}
