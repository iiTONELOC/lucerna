export function SettingsGlyph({ className }: { readonly className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M2 7h11m5 0h4M2 17h4m5 0h11M13 3v8M6 13v8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
