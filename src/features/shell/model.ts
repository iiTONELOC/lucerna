export enum ApplicationView {
  Rosary = 'rosary',
  Gallery = 'gallery',
  Library = 'library',
  References = 'references',
}

export const APPLICATION_VIEWS = Object.values(ApplicationView);

export const applicationViewLabel = (view: ApplicationView): string =>
  `${view.charAt(0).toUpperCase()}${view.slice(1)}`;
