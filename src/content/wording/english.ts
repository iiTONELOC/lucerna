import { COPYRIGHT_OWNER, SITE_HOST } from '../../appMetadata.ts';
import { LiturgicalSeason } from '../schema.ts';
import { BibleEditionId } from '../language.ts';
import { ORDINAL_WORDS } from '../../shared/ordinals.ts';
import { ApplicationView } from '../../features/shell/model.ts';
import { Weekday } from '../../features/rosary/schedule.ts';

const SET_ADJECTIVES: Readonly<Record<string, string>> = {
  joyful: 'Joyful',
  luminous: 'Luminous',
  sorrowful: 'Sorrowful',
  glorious: 'Glorious',
};

export type InstallText = {
  readonly heading: string;
  readonly steps: readonly { readonly instruction: string; readonly alt?: string }[];
  readonly note?: string;
};

const installText = (text: InstallText): InstallText => text;

export type PolicyBlock =
  string | { readonly items: readonly string[] } | { readonly officer: true };

export type PolicySection = {
  readonly heading: string;
  readonly blocks: readonly PolicyBlock[];
  readonly subsections?: readonly PolicySection[];
};

export type PrivacyText = {
  readonly link: string;
  readonly title: string;
  readonly websiteTypeLabel: string;
  readonly websiteType: string;
  readonly effectiveLabel: string;
  readonly effectiveDate: string;
  readonly owner: string;
  readonly contactLabel: string;
  readonly sections: readonly PolicySection[];
  readonly translationNote?: string;
};

export const privacyText = (text: PrivacyText): PrivacyText => text;

export const ENGLISH_WORDING = {
  views: {
    [ApplicationView.Rosary]: 'Rosary',
    [ApplicationView.Gallery]: 'Gallery',
    [ApplicationView.Library]: 'Library',
    [ApplicationView.References]: 'References',
  } satisfies Record<ApplicationView, string>,
  weekdays: {
    [Weekday.Sunday]: 'Sunday',
    [Weekday.Monday]: 'Monday',
    [Weekday.Tuesday]: 'Tuesday',
    [Weekday.Wednesday]: 'Wednesday',
    [Weekday.Thursday]: 'Thursday',
    [Weekday.Friday]: 'Friday',
    [Weekday.Saturday]: 'Saturday',
  } satisfies Record<Weekday, string>,
  seasons: {
    [LiturgicalSeason.Advent]: 'Advent',
    [LiturgicalSeason.Christmas]: 'Christmas',
    [LiturgicalSeason.Lent]: 'Lent',
  } satisfies Record<LiturgicalSeason, string>,
  artworkAlt: (title: string, artist: string): string => `${title} by ${artist}`,
  home: {
    selectedForToday: 'Selected for today',
    begin: 'Begin',
    mysteryArtwork: 'Mystery artwork',
    mysterySets: 'Mystery sets',
    mysteries: 'Mysteries',
    today: 'today',
    collection: 'Lucerna Collection',
    openGallery: 'Open gallery',
  },
  support: {
    link: 'Support Pray Lucerna',
    body: 'Pray Lucerna is free for everyone and works offline, with no ads or tracking. Your support helps pay for maintenance, hosting, and new features.',
    give: 'Give',
    notNow: 'Not now',
    thanks: 'Thank you for supporting Pray Lucerna.',
  },
  common: {
    back: 'Back',
    later: 'Later',
    close: 'Close',
    viewInGallery: 'View in gallery',
    previousWorks: 'Previous works',
    moreWorks: 'More works',
    note: 'Note',
    noteAbout: (keyword: string): string => `Note: ${keyword}`,
    redLetterAbout: 'About the words of Christ marking',
  },
  errors: {
    tryAgain: 'Try again',
    title: 'Something went wrong',
    message: 'Pray Lucerna could not finish this view.',
    eyebrow: 'Error',
    details: 'Diagnostic details',
    emailDiagnostics: 'Email diagnostics',
    copyDiagnostics: 'Copy diagnostics',
    copied: 'Copied',
    copyFailed: 'Copy failed',
    lastReport: 'Last error report',
    clearReport: 'Clear this report',
    diagnostics: 'Diagnostics',
    keepsLastError: 'Pray Lucerna keeps the last error on this device.',
    nothingSent: 'Nothing is sent unless you send it.',
    noError: 'No error has been recorded.',
  },
  update: {
    ready: 'Update ready',
    cached: 'A new version of Pray Lucerna is cached and ready.',
    now: 'Update now',
  },
  prayer: {
    mysteryHeading: (ordinal: number, setId: string): string =>
      `${ORDINAL_WORDS[ordinal - 1] ?? ''} ${SET_ADJECTIVES[setId] ?? ''} Mystery`,
    mysteryPhrase: (title: string): string =>
      title.startsWith('The ') ? `the ${title.slice('The '.length)}` : title,
    decadeInProgress: 'Decade in progress',
    openingPrayer: 'Opening prayer',
    closingPrayer: 'Closing prayer',
    fatimaTitle: 'O My Jesus',
    fruitLabel: 'Fruit of the Mystery',
    meditation: 'Meditation',
    offering: 'Offering',
    guidance: 'Guidance',
    spokenFruit: (fruit: string): string => `Fruit of the Mystery. ${fruit}.`,
    spokenGuidance: (text: string, source: string): string => `Guidance. ${text} ${source}.`,
    spokenOffering: (label: string, text: string): string => `${label}. ${text}`,
    hailMary: 'Hail Mary',
    ourFather: 'Our Father',
    hailMaryCount: (repetition: number, total: number): string =>
      `Hail Mary ${String(repetition)} of ${String(total)}`,
    hailMaryState: (repetition: number, complete: boolean): string =>
      `Hail Mary ${String(repetition)} ${complete ? 'complete' : 'upcoming'}`,
    repetitionProgress: 'Hail Mary repetition progress',
    bead: (kind: string, position: number): string => `${kind} bead ${String(position)}`,
    crucifix: 'Crucifix',
    centerpiece: 'Centerpiece',
    chainLeading: 'Chain before the next bead',
    chainTrailing: 'Chain after the previous bead',
    rosaryProgress: 'Rosary progress',
    currentDecade: 'Current decade',
    prayerText: 'Prayer text',
    devotionalArtwork: 'Devotional artwork',
    exit: 'Exit',
    finish: 'Finish',
    continue: 'Continue',
    pauseGuided: 'Pause guided prayer',
    beginGuided: 'Begin guided prayer',
  },
  gallery: {
    eyebrow: 'Art for contemplation',
    lede: 'Works gathered for prayer and contemplation.',
    title: 'The Lucerna Collection',
    viewBy: 'View by',
    byMystery: 'Mystery',
    byArtist: 'Artist',
    byDate: 'Date',
    dateUnknown: 'Date unknown',
    viewReference: 'View reference',
    artwork: 'Artwork',
    backToCollection: 'Back to the collection',
    next: 'Next',
    previous: 'Previous',
    neighborUnavailable: (direction: string): string => `${direction} artwork unavailable`,
    neighbor: (direction: string, title: string): string => `${direction} artwork: ${title}`,
    viewFullSize: 'View full size',
  },
  library: {
    eyebrow: 'Texts for prayer and study',
    title: 'The Library',
    reader: 'Reader',
    translatedBy: (translator: string): string => `Translated by ${translator}.`,
    scripture: 'Scripture',
    devotions: 'Devotions',
    bibleTitle: 'The Holy Bible',
    bibleEditions: {
      [BibleEditionId.DouayRheims]: 'Douay-Rheims Version',
      [BibleEditionId.ClementineVulgate]: 'Clementine Vulgate, in Latin',
      [BibleEditionId.Scio]: 'Scío de San Miguel Version',
    },
    oldTestament: 'The Old Testament',
    newTestament: 'The New Testament',
    chapters: 'Chapters',
    chapter: (label: string): string => `Chapter ${label}`,
    chapterCount: (count: number): string =>
      count === 1 ? '1 chapter' : `${String(count)} chapters`,
    neighboringBooks: 'Neighboring books',
    previousBook: (name: string): string => `Previous: ${name}`,
    nextBook: (name: string): string => `Next: ${name}`,
  },
  references: {
    title: 'References',
    eyebrow: 'Sources and provenance',
    lede: 'These records identify the texts, guidance, Scripture, and artwork used in Pray Lucerna. Every record is available offline.',
    count: (count: number): string => (count === 1 ? '1 reference' : `${String(count)} references`),
    rosaryText: 'Rosary text',
    scripture: 'Scripture',
    guidance: 'Rosary Guidance',
    apparatus: 'Apparatus',
    artwork: 'Artwork',
    rights: 'Rights',
    rosaryTextDescription:
      'Sources for the prayers, mystery names, weekly schedule, fruits, passage selections, and reflections.',
    scriptureDescription: 'The Bible edition used for the readings.',
    guidanceDescription: 'The instructions behind the prompts shown during prayer.',
    apparatusDescription:
      'The words of Christ marking and the editions cross-referenced to prepare it.',
    artworkDescription:
      'The source record and rights note for every artwork bundled with Pray Lucerna.',
    rightsDescription: 'The open-access policies that govern the bundled image files.',
    prayers: 'Prayers',
    schedule: 'Weekly schedule',
    seasonalSundays: 'Seasonal Sundays',
    setNames: 'Mystery sets',
    mysteries: 'Mysteries',
    mysteryNames: 'Mystery names',
    fruits: 'Fruits',
    passageSelections: 'Passage selections',
    readings: 'Readings',
    reflections: 'Reflections',
    redLetter: 'Words of Christ in red',
    sections: (sections: readonly string[]): string =>
      `${sections.length === 1 ? 'Section' : 'Sections'} ${sections.join(', ')}`,
    prayer: 'Prayer',
    record: 'Record',
    usedIn: 'Where Pray Lucerna uses it',
    citedLocation: 'Cited location',
    reference: 'Reference',
    viewInLibrary: 'View in the Library',
    author: 'Author',
    purpose: 'Purpose',
    translator: 'Translator',
    publisher: 'Publisher',
    published: 'Published',
    openSource: 'Open original source',
    openAlternate: 'Open alternate text',
    openRenewal: 'Open renewal search',
    openRights: 'Open rights policy',
    openDating: 'Open dating source',
    externalLinks: 'External source links',
    date: 'Date',
    collection: 'Collection',
    accession: 'Accession',
    photograph: 'Photograph',
  },
  install: {
    eyebrow: 'Keep Pray Lucerna on your device',
    lede: 'Pray Lucerna works in a browser. Add it to your device and it opens like any other application.',
    title: 'How to add Pray Lucerna to your device',
    devices: 'Devices',
    iphone: installText({
      heading: 'iPhone',
      steps: [
        { instruction: 'Open Pray Lucerna in Safari.' },
        {
          instruction: 'Tap the More button at the bottom right.',
          alt: 'Safari on iPhone with the More button marked at the bottom right',
        },
        { instruction: 'Tap Share.', alt: 'The Safari menu on iPhone with Share marked' },
        {
          instruction: 'Tap More at the end of the row of actions.',
          alt: 'The iPhone share panel with the More button marked in the row of actions',
        },
        {
          instruction: 'Tap Add to Home Screen.',
          alt: 'The expanded iPhone share panel with Add to Home Screen marked',
        },
        {
          instruction: 'Keep Open as Web App switched on, then tap Add.',
          alt: 'The Add to Home Screen panel on iPhone with the Add button marked',
        },
      ],
    }),
    ipad: installText({
      heading: 'iPad',
      steps: [
        { instruction: 'Open Pray Lucerna in Safari.' },
        {
          instruction: 'Tap the Share button at the top right.',
          alt: 'Safari on iPad with the Share button marked at the top right',
        },
        {
          instruction: 'Tap More at the end of the row of actions.',
          alt: 'The iPad share panel with the More button marked in the row of actions',
        },
        {
          instruction: 'Tap Add to Home Screen.',
          alt: 'The expanded iPad share panel with Add to Home Screen marked',
        },
        {
          instruction: 'Keep Open as Web App switched on, then tap Add.',
          alt: 'The Add to Home Screen panel on iPad with the Add button marked',
        },
      ],
    }),
    mac: installText({
      heading: 'Mac',
      steps: [
        { instruction: 'Open Pray Lucerna in Safari.' },
        {
          instruction: 'Click the Share button, then click Add to Dock.',
          alt: 'The Safari share menu on a Mac with Add to Dock marked',
        },
        {
          instruction: 'Type a name, then click Add.',
          alt: 'The Add to Dock panel on a Mac with the Add button marked',
        },
      ],
      note: 'You can also choose File, then Add to Dock. This needs macOS Sonoma or later.',
    }),
    android: installText({
      heading: 'Android',
      steps: [
        { instruction: 'Open Pray Lucerna in Chrome.' },
        {
          instruction: 'Tap the menu button at the top right.',
          alt: 'Chrome on Android with the menu button marked at the top right',
        },
        {
          instruction: 'Tap Add to Home screen.',
          alt: 'The Chrome menu on Android with Add to Home screen marked',
        },
        {
          instruction: 'Tap Install.',
          alt: 'The Add to home screen panel on Android with Install marked',
        },
        {
          instruction: 'Tap Install again to confirm.',
          alt: 'The Install app panel on Android with the Install button marked',
        },
      ],
      note: 'Choose Install, not Create shortcut. A shortcut opens in the browser instead.',
    }),
    desktop: installText({
      heading: 'Windows and Linux',
      steps: [
        { instruction: 'Open Pray Lucerna in the browser.' },
        { instruction: 'Click the install icon at the right of the address bar.' },
        { instruction: 'Click Install.' },
      ],
      note: 'Chrome, Brave, Edge, and Opera work the same way on a Mac.',
    }),
    firefox: installText({
      heading: 'Firefox',
      steps: [
        { instruction: 'Open Pray Lucerna in Firefox on an Android phone or tablet.' },
        { instruction: 'Tap the menu button.' },
        { instruction: 'Tap Install.' },
      ],
      note: 'Firefox on the desktop cannot install web applications. Use Chrome, Brave, Edge, Opera, or Safari.',
    }),
  },
  splash: {
    continue: 'Continue',
    preparing: 'Preparing Pray Lucerna',
  },
  about: {
    title: 'About',
    description: 'An offline Rosary prayer and devotional art companion.',
    version: 'Version',
    copyright: 'Copyright',
    license: 'License',
    support: 'Support',
    allRightsReserved: 'All rights reserved.',
    licenseDetail:
      'No license is granted to copy, modify, or redistribute the application source or original design.',
    contentRights:
      'Bundled devotional texts and artworks retain the source and rights information recorded with their credits.',
    trademark: (name: string, owner: string): string => `${name}™ is a trademark of ${owner}.`,
    openReferences: 'Open references',
  },
  external: {
    title: 'Open an external website?',
    body: 'This page is not part of Pray Lucerna and may require an internet connection.',
    stay: 'Stay here',
    continue: 'Continue',
  },
  settings: {
    whenOpens: 'When it opens',
    alsoWhileOpen: 'Also while open',
    onLoadNote: 'Pray Lucerna looks for a new version once, as it starts.',
    whileOpenNote: 'If Pray Lucerna is installed, the app also looks every twenty minutes.',
    sansSerif: 'Sans serif',
    general: 'General',
    custom: 'Custom',
    noTimeout: 'No timeout',
    dark: 'Dark',
    parchment: 'Parchment',
    followSystem: 'Follow system',
    fullRosary: 'Full rosary',
    resize: 'Resize settings',
    close: 'Close settings',
    appTextSize: 'App text size',
    appliesAll: 'Applies to all app text.',
    readingFont: 'Reading font',
    readingPage: 'Reading page',
    appliesBooks: 'Applies to book pages only.',
    redLetterNote: 'Show the words of Christ in red in the Bible and the mystery readings.',
    readingTextSize: 'Reading text size',
    readingPreview: 'Reading preview',
    openingTimeout: 'Opening screen timeout',
    waits: 'Waits until you select Continue.',
    continuesOnOwn: 'Continues on its own after the selected delay.',
    language: 'Language',
    bibleChoice: 'Bible for readings',
    bibleChoiceNote: 'Used for the mystery readings and the opening verses.',
    appAppearance: 'App appearance',
    followSystemNote: 'Follow system uses your device’s light or dark appearance.',
    speedPresets: 'Reading speed presets',
    guidedPrayer: 'Guided prayer',
    readingSpeed: 'Reading speed',
    guidedNote:
      'Guided prayer moves on by itself after time to read each text; higher speeds allow less time.',
    rosaryDisplay: 'Rosary display',
    currentDecadeNote:
      'Current decade shows the beads being prayed, with a small map of the whole rosary.',
    beadMaterial: 'Bead material',
    allowTime: 'Allow time to read this text before continuing.',
    scriptureReadings: 'Scripture readings',
    scriptureReadingsNote: 'Show the brief reading with each mystery.',
    mysteryFruits: 'Mystery fruits',
    fruitsNote: 'Show each mystery’s spiritual fruit.',
    includeFruits: 'Include fruits in guided prayer',
    guidanceNote: 'Show meditation prompts.',
    includeGuidance: 'Include guidance in guided prayer',
    decadeOfferings: 'Decade offerings',
    offeringsNote: 'Show St. Louis de Montfort’s offering with each mystery.',
    includeOfferings: 'Include offerings in guided prayer',
    decorativeInitials: 'Decorative initials',
    initialsNote: 'Enlarge the opening letter when space allows.',
    fatimaNote: 'Include O My Jesus after each decade.',
    fatimaLabel: 'Fatima prayer',
    duringPrayer: 'During prayer',
    updates: 'Updates',
    externalLinks: 'External links',
    askNote: 'Ask before opening a website outside Pray Lucerna.',
    askLabel: 'Ask before opening websites',
    sections: 'Settings sections',
    seconds: (seconds: string): string => `${seconds} seconds`,
    speeds: { unhurried: 'Unhurried', steady: 'Steady', brisk: 'Brisk' },
    textScales: {
      small: 'Small',
      standard: 'Standard',
      comfortable: 'Comfortable',
      large: 'Large',
      extraLarge: 'Extra Large',
      maximum: 'Maximum',
    },
    materials: { wood: 'Wood', pearl: 'Pearl', obsidian: 'Obsidian', rose: 'Rose' },
    aiTranslations: 'Use AI translations',
    aiTranslationsNote:
      'Shows fruits, guidance, decade offerings and The Secret of the Rosary translated with AI where no Spanish text exists. Each carries a mark.',
    aiTranslated: 'AI translation',
    aiMark: 'AI',
  },
  privacy: privacyText({
    link: 'Privacy Policy',
    title: `${SITE_HOST} Privacy Policy`,
    websiteTypeLabel: 'Type of website:',
    websiteType:
      'Free Catholic prayer website for praying the Rosary, reading Scripture, and viewing sacred art, online or offline',
    effectiveLabel: 'Effective date:',
    effectiveDate: '31st day of October, 2026',
    owner: `${SITE_HOST} (the "Site") is owned and operated by ${COPYRIGHT_OWNER}.`,
    contactLabel: 'Contact:',
    sections: [
      {
        heading: 'Purpose',
        blocks: [
          'The purpose of this privacy policy (this "Privacy Policy") is to inform users of our Site of the following:',
          {
            items: [
              'The personal data we will collect;',
              'Use of collected data;',
              'Who has access to the data collected;',
              'The rights of Site users; and',
              "The Site's cookie policy.",
            ],
          },
          'This Privacy Policy applies in addition to the terms and conditions of our Site.',
        ],
      },
      {
        heading: 'Consent',
        blocks: [
          'By using our Site users agree that they consent to:',
          {
            items: [
              'The conditions set out in this Privacy Policy; and',
              'The collection, use, and retention of the data listed in this Privacy Policy.',
            ],
          },
        ],
      },
      {
        heading: 'How We Use Personal Data',
        blocks: [
          'Data collected on our Site will only be used for the purposes specified in this Privacy Policy or indicated on the relevant pages of our Site. We will not use your data beyond what we disclose in this Privacy Policy.',
        ],
      },
      {
        heading: 'Who We Share Personal Data With',
        blocks: [],
        subsections: [
          {
            heading: 'Employees',
            blocks: [
              'We may disclose user data to any member of our organization who reasonably needs access to user data to achieve the purposes set out in this Privacy Policy.',
            ],
          },
          {
            heading: 'Third Parties',
            blocks: [
              'We may share user data with the following third parties:',
              { items: ['GitHub Pages; and', 'Stripe.'] },
              'We may share the following user data with third parties:',
              {
                items: [
                  'IP address and browser details; and',
                  'Payment card details, email address, billing country and postal code.',
                ],
              },
              'We may share user data with third parties for the following purposes:',
              {
                items: [
                  'Hosting and delivering the website; and',
                  'Processing optional support payments and sending receipts.',
                ],
              },
              'Third parties will not be able to access user data beyond what is reasonably necessary to achieve the given purpose.',
            ],
          },
          {
            heading: 'Other Disclosures',
            blocks: [
              'We will not sell or share your data with other third parties, except in the following cases:',
              {
                items: [
                  'If the law requires it;',
                  'If it is required for any legal proceeding;',
                  'To prove or protect our legal rights; and',
                  'To buyers or potential buyers of this company in the event that we seek to sell the company.',
                ],
              },
              'If you follow hyperlinks from our Site to another Site, please note that we are not responsible for and have no control over their privacy policies and practices.',
            ],
          },
        ],
      },
      {
        heading: 'How Long We Store Personal Data',
        blocks: [
          'User data will be stored until the purpose the data was collected for has been achieved.',
          'You will be notified if your data is kept for longer than this period.',
        ],
      },
      {
        heading: 'How We Protect Your Personal Data',
        blocks: [
          'No personal data is collected. The site is served only over HTTPS.',
          'While we take all reasonable precautions to ensure that user data is secure and that users are protected, there always remains the risk of harm. The Internet as a whole can be insecure at times and therefore we are unable to guarantee the security of user data beyond what is reasonably practical.',
        ],
      },
      {
        heading: 'Children',
        blocks: [
          'The minimum age to use our website is 13 years of age. We do not knowingly collect or use personal data from children under 13 years of age. If we learn that we have collected personal data from a child under 13 years of age, the personal data will be deleted as soon as possible. If a child under 13 years of age has provided us with personal data their parent or guardian may contact our privacy officer.',
        ],
      },
      {
        heading: 'How to Access, Modify, Delete, or Challenge the Data Collected',
        blocks: [
          'If you would like to know if we have collected your personal data, how we have used your personal data, if we have disclosed your personal data and to who we disclosed your personal data, or if you would like your data to be deleted or modified in any way, please contact our privacy officer here:',
          { officer: true },
        ],
      },
      {
        heading: 'Cookie Policy',
        blocks: [
          "A cookie is a small file, stored on a user's hard drive by a website. Its purpose is to collect data relating to the user's browsing habits. You can choose to be notified each time a cookie is transmitted. You can also choose to disable cookies entirely in your internet browser, but this may decrease the quality of your user experience.",
          'We do not use cookies on our Site.',
        ],
      },
      {
        heading: 'Modifications',
        blocks: [
          'This Privacy Policy may be amended from time to time in order to maintain compliance with the law and to reflect any changes to our data collection process. When we amend this Privacy Policy we will update the "Effective Date" at the top of this Privacy Policy. We recommend that our users periodically review our Privacy Policy to ensure that they are notified of any updates. If necessary, we may notify users by email of changes to this Privacy Policy.',
        ],
      },
      {
        heading: 'Contact Information',
        blocks: [
          `If you have any questions, concerns or complaints, you can contact our privacy officer, ${COPYRIGHT_OWNER}, at:`,
          { officer: true },
        ],
      },
    ],
  }),
  navigation: {
    primary: 'Primary',
    settings: 'Settings',
    goToRosary: 'Go to the Rosary',
    rosaryPrayer: 'Rosary prayer',
    reading: 'Reading',
  },
};

export type Wording = typeof ENGLISH_WORDING;
