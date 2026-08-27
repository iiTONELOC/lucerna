export const integrityFrom = (source: string | Uint8Array): string =>
  `sha384-${new Bun.CryptoHasher('sha384').update(source).digest('base64')}`;

const tagWithIntegrity = (tag: string, integrity: string): string => {
  if (tag.includes(' integrity=')) {
    return tag;
  }

  let securedTag = tag.replace(' crossorigin ', ' crossorigin="anonymous" ');

  if (!securedTag.includes(' crossorigin=')) {
    const closingOffset = securedTag.endsWith('/>') ? 2 : 1;
    securedTag = `${securedTag.slice(0, -closingOffset)} crossorigin="anonymous"${securedTag.slice(-closingOffset)}`;
  }

  const closingOffset = securedTag.endsWith('/>') ? 2 : 1;

  return `${securedTag.slice(0, -closingOffset)} integrity="${integrity}"${securedTag.slice(-closingOffset)}`;
};

export const addIntegrityToAssetTags = (
  html: string,
  assetUrl: string,
  integrity: string,
): string => {
  let securedHtml = html;

  for (const attributeName of ['href', 'src']) {
    const attribute = `${attributeName}="${assetUrl}"`;
    let searchStart = 0;

    while (searchStart < securedHtml.length) {
      const attributeStart = securedHtml.indexOf(attribute, searchStart);

      if (attributeStart < 0) {
        break;
      }

      const tagStart = securedHtml.lastIndexOf('<', attributeStart);
      const tagEnd = securedHtml.indexOf('>', attributeStart);

      if (tagStart < 0 || tagEnd < 0) {
        throw new Error(`Malformed Vite asset tag for ${assetUrl}`);
      }

      const originalTag = securedHtml.slice(tagStart, tagEnd + 1);
      const securedTag = tagWithIntegrity(originalTag, integrity);
      securedHtml = `${securedHtml.slice(0, tagStart)}${securedTag}${securedHtml.slice(tagEnd + 1)}`;
      searchStart = tagStart + securedTag.length;
    }
  }

  return securedHtml;
};
