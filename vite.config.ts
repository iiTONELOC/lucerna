import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { BibleEditionId, editionAssetPrefixOf, LANGUAGES } from './src/content/language.ts';

const GENERATED_EDITION_MODULE = /\/src\/generated\/([a-z]+)\/([a-z-]+)\//u;

const chunkPrefixOf = (moduleId: string | null | undefined): string => {
  const [, language, edition] = GENERATED_EDITION_MODULE.exec(moduleId ?? '') ?? [];
  const knownLanguage = LANGUAGES.find((candidate) => candidate === language);
  const knownEdition = Object.values(BibleEditionId).find((candidate) => candidate === edition);

  return knownLanguage === undefined || knownEdition === undefined
    ? ''
    : editionAssetPrefixOf(knownLanguage, knownEdition);
};

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash:16][extname]',
        chunkFileNames: (chunk) =>
          `assets/${chunkPrefixOf(chunk.facadeModuleId)}[name]-[hash:16].js`,
        entryFileNames: 'assets/[name]-[hash:16].js',
        hashCharacters: 'hex',
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@data': new URL('./data', import.meta.url).pathname,
    },
  },
});
