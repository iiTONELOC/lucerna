export const MARK_CLASS_NAME = 'font-display text-mark leading-mark tracking-mark';

export const TITLE_CLASS_NAME =
  'font-display text-title leading-title tracking-title font-medium text-foreground';

export const NAV_CLASS_NAME = 'font-display text-nav leading-nav tracking-nav';

export const SUBTITLE_CLASS_NAME =
  'small-caps font-display text-subtitle leading-subtitle tracking-subtitle';

export const SCRIPTURE_CLASS_NAME = 'font-display text-scripture leading-scripture text-secondary';

export const CITATION_CLASS_NAME = 'font-display text-citation leading-citation';

export const BODY_CLASS_NAME = 'font-display text-body leading-body';

export const CHAPTER_CLASS_NAME =
  'font-display text-chapter leading-chapter font-medium text-foreground';

export const EYEBROW_CLASS_NAME = `${SUBTITLE_CLASS_NAME} font-semibold text-accent-current`;

export const ACCENT_BUTTON_CLASS_NAME = `focus-ring min-h-11 w-fit rounded border border-accent bg-transparent px-5 py-2 ${SUBTITLE_CLASS_NAME} text-accent transition-colors hover:bg-accent hover:text-accent-foreground`;

export const INLINE_LINK_CLASS_NAME = `focus-ring inline-flex min-h-11 w-fit items-center text-accent-current underline decoration-hairline underline-offset-4 transition-colors hover:decoration-accent ${CITATION_CLASS_NAME}`;

export const HORIZONTAL_TRACK_CLASS_NAME =
  'flex min-w-0 cursor-grab overflow-x-auto overscroll-x-contain px-2 py-1 select-none active:cursor-grabbing scrollbar-none [&::-webkit-scrollbar]:hidden';

export const AMBIENT_SCRIM_CLASS_NAME =
  'absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_44%,color-mix(in_srgb,var(--theme-background)_80%,transparent)_100%),color-mix(in_srgb,var(--theme-background)_34%,transparent)]';

export const READING_CLASS_NAME = 'font-reading text-reading leading-reading text-secondary';

export const APPARATUS_CLASS_NAME = 'font-reading text-citation leading-citation';

export const TOUCH_LINK_CLASS_NAME =
  "focus-ring relative underline decoration-hairline underline-offset-4 transition-colors after:absolute after:-inset-y-3.5 after:inset-x-0 after:content-['']";

export const SUPERSCRIPT_CLASS_NAME = 'align-super text-[0.7em] leading-none';

export const SUPERSCRIPT_BUTTON_CLASS_NAME = `${SUPERSCRIPT_CLASS_NAME} pr-1 pl-0.5 text-accent-current transition-colors hover:text-accent-strong focus-ring`;
