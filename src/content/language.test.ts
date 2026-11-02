import { expect, test } from 'bun:test';

import { Language, languageFrom, verseLocatorOf } from './language.ts';

test('chooses the first supported language the browser prefers', () => {
  expect(languageFrom(['es-MX', 'en-US'])).toBe(Language.Spanish);
  expect(languageFrom(['en-GB', 'es'])).toBe(Language.English);
  expect(languageFrom(['fr-FR', 'ES-es'])).toBe(Language.Spanish);
});

test('falls back to English when no preferred language is supported', () => {
  expect(languageFrom(['fr-FR', 'de'])).toBe(Language.English);
  expect(languageFrom([])).toBe(Language.English);
});

test('writes verse locators in each language convention', () => {
  expect(verseLocatorOf(Language.English, 1, '26-27')).toBe('1:26-27');
  expect(verseLocatorOf(Language.Spanish, 1, '26-27')).toBe('1,26-27');
});
