import { AMBIENT_SCRIM_CLASS_NAME } from '../../styles.ts';

export function AmbientGround({ source }: { readonly source: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        alt=""
        className="art-ambient absolute inset-0 size-full object-cover opacity-[0.52]!"
        src={source}
      />
      <div className={AMBIENT_SCRIM_CLASS_NAME} />
    </div>
  );
}
