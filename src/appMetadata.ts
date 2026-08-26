import packageMetadata from '../package.json';

export const APP_NAME = 'Lucerna';
export const APP_DESCRIPTION = 'An offline Rosary prayer and devotional art companion.';
export const APP_VERSION = packageMetadata.version;
export const SUPPORT_EMAIL = 'lucerna@wedefendit.com';
export const COPYRIGHT_OWNER = packageMetadata.author;
export const COPYRIGHT_NOTICE = `© ${new Date().getFullYear()} ${COPYRIGHT_OWNER}`;
export const TRADEMARK_NOTICE = `${APP_NAME}™ is a trademark of ${COPYRIGHT_OWNER}.`;
export const APPLICATION_LICENSE = 'All rights reserved.';
export const APPLICATION_LICENSE_DETAIL =
  'No license is granted to copy, modify, or redistribute the application source or original design.';
export const CONTENT_RIGHTS_DETAIL =
  'Bundled devotional texts and artworks retain the source and rights information recorded with their credits.';
