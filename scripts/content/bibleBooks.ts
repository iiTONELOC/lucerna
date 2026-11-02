import { BibleTestament } from '../../src/content/schema.ts';

type BibleBookDefinition = {
  readonly code: string;
  readonly name: string;
  readonly spanishName: string;
};

const OLD_TESTAMENT: readonly BibleBookDefinition[] = [
  { code: 'GEN', name: 'Genesis', spanishName: 'Génesis' },
  { code: 'EXO', name: 'Exodus', spanishName: 'Éxodo' },
  { code: 'LEV', name: 'Leviticus', spanishName: 'Levítico' },
  { code: 'NUM', name: 'Numbers', spanishName: 'Números' },
  { code: 'DEU', name: 'Deuteronomy', spanishName: 'Deuteronomio' },
  { code: 'JOS', name: 'Josue', spanishName: 'Josué' },
  { code: 'JDG', name: 'Judges', spanishName: 'Jueces' },
  { code: 'RUT', name: 'Ruth', spanishName: 'Rut' },
  { code: '1SA', name: '1 Kings', spanishName: '1 Reyes' },
  { code: '2SA', name: '2 Kings', spanishName: '2 Reyes' },
  { code: '1KI', name: '3 Kings', spanishName: '3 Reyes' },
  { code: '2KI', name: '4 Kings', spanishName: '4 Reyes' },
  { code: '1CH', name: '1 Paralipomenon', spanishName: '1 Paralipómenos' },
  { code: '2CH', name: '2 Paralipomenon', spanishName: '2 Paralipómenos' },
  { code: 'EZR', name: '1 Esdras', spanishName: '1 Esdras' },
  { code: 'NEH', name: '2 Esdras', spanishName: '2 Esdras' },
  { code: 'TOB', name: 'Tobias', spanishName: 'Tobías' },
  { code: 'JDT', name: 'Judith', spanishName: 'Judit' },
  { code: 'EST', name: 'Esther', spanishName: 'Ester' },
  { code: 'JOB', name: 'Job', spanishName: 'Job' },
  { code: 'PSA', name: 'Psalms', spanishName: 'Salmos' },
  { code: 'PRO', name: 'Proverbs', spanishName: 'Proverbios' },
  { code: 'ECC', name: 'Ecclesiastes', spanishName: 'Eclesiastés' },
  { code: 'SNG', name: 'Canticle of Canticles', spanishName: 'Cantar de los Cantares' },
  { code: 'WIS', name: 'Wisdom', spanishName: 'Sabiduría' },
  { code: 'SIR', name: 'Ecclesiasticus', spanishName: 'Eclesiástico' },
  { code: 'ISA', name: 'Isaias', spanishName: 'Isaías' },
  { code: 'JER', name: 'Jeremias', spanishName: 'Jeremías' },
  { code: 'LAM', name: 'Lamentations', spanishName: 'Lamentaciones' },
  { code: 'BAR', name: 'Baruch', spanishName: 'Baruc' },
  { code: 'EZK', name: 'Ezechiel', spanishName: 'Ezequiel' },
  { code: 'DAN', name: 'Daniel', spanishName: 'Daniel' },
  { code: 'HOS', name: 'Osee', spanishName: 'Oseas' },
  { code: 'JOL', name: 'Joel', spanishName: 'Joel' },
  { code: 'AMO', name: 'Amos', spanishName: 'Amós' },
  { code: 'OBA', name: 'Abdias', spanishName: 'Abdías' },
  { code: 'JON', name: 'Jonas', spanishName: 'Jonás' },
  { code: 'MIC', name: 'Micheas', spanishName: 'Miqueas' },
  { code: 'NAM', name: 'Nahum', spanishName: 'Nahúm' },
  { code: 'HAB', name: 'Habacuc', spanishName: 'Habacuc' },
  { code: 'ZEP', name: 'Sophonias', spanishName: 'Sofonías' },
  { code: 'HAG', name: 'Aggeus', spanishName: 'Ageo' },
  { code: 'ZEC', name: 'Zacharias', spanishName: 'Zacarías' },
  { code: 'MAL', name: 'Malachias', spanishName: 'Malaquías' },
  { code: '1MA', name: '1 Machabees', spanishName: '1 Macabeos' },
  { code: '2MA', name: '2 Machabees', spanishName: '2 Macabeos' },
];

const NEW_TESTAMENT: readonly BibleBookDefinition[] = [
  { code: 'MAT', name: 'Matthew', spanishName: 'Mateo' },
  { code: 'MRK', name: 'Mark', spanishName: 'Marcos' },
  { code: 'LUK', name: 'Luke', spanishName: 'Lucas' },
  { code: 'JHN', name: 'John', spanishName: 'Juan' },
  { code: 'ACT', name: 'Acts of the Apostles', spanishName: 'Hechos de los Apóstoles' },
  { code: 'ROM', name: 'Romans', spanishName: 'Romanos' },
  { code: '1CO', name: '1 Corinthians', spanishName: '1 Corintios' },
  { code: '2CO', name: '2 Corinthians', spanishName: '2 Corintios' },
  { code: 'GAL', name: 'Galatians', spanishName: 'Gálatas' },
  { code: 'EPH', name: 'Ephesians', spanishName: 'Efesios' },
  { code: 'PHP', name: 'Philippians', spanishName: 'Filipenses' },
  { code: 'COL', name: 'Colossians', spanishName: 'Colosenses' },
  { code: '1TH', name: '1 Thessalonians', spanishName: '1 Tesalonicenses' },
  { code: '2TH', name: '2 Thessalonians', spanishName: '2 Tesalonicenses' },
  { code: '1TI', name: '1 Timothy', spanishName: '1 Timoteo' },
  { code: '2TI', name: '2 Timothy', spanishName: '2 Timoteo' },
  { code: 'TIT', name: 'Titus', spanishName: 'Tito' },
  { code: 'PHM', name: 'Philemon', spanishName: 'Filemón' },
  { code: 'HEB', name: 'Hebrews', spanishName: 'Hebreos' },
  { code: 'JAM', name: 'James', spanishName: 'Santiago' },
  { code: '1PE', name: '1 Peter', spanishName: '1 Pedro' },
  { code: '2PE', name: '2 Peter', spanishName: '2 Pedro' },
  { code: '1JN', name: '1 John', spanishName: '1 Juan' },
  { code: '2JN', name: '2 John', spanishName: '2 Juan' },
  { code: '3JN', name: '3 John', spanishName: '3 Juan' },
  { code: 'JUD', name: 'Jude', spanishName: 'Judas' },
  { code: 'REV', name: 'Apocalypse', spanishName: 'Apocalipsis' },
];

export type TestamentDefinition = BibleBookDefinition & {
  readonly testament: BibleTestament;
};

export const BIBLE_DEFINITIONS: readonly TestamentDefinition[] = [
  ...OLD_TESTAMENT.map((definition) => ({ ...definition, testament: BibleTestament.Old })),
  ...NEW_TESTAMENT.map((definition) => ({ ...definition, testament: BibleTestament.New })),
];
