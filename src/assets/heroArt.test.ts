import { expect, test } from "bun:test";
import { contentCatalog } from "../content/catalog.ts";

const HERO_DIRECTORY = new URL("./art/hero/", import.meta.url);

const heroPool = contentCatalog.rosary.mysterySets.flatMap(({ mysteries }) =>
  mysteries.flatMap(({ artworks }) => artworks),
);

test.each(heroPool.map(({ id, file }) => [id, file]))(
  "%s has a hero copy",
  async (_id, file) => {
    const name = file.split("/").pop() ?? file;
    expect(await Bun.file(new URL(name, HERO_DIRECTORY)).exists()).toBe(true);
  },
);
