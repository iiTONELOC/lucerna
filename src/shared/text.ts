export const tailStartOf = (text: string): number => text.lastIndexOf(' ') + 1;

export const capitalize = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export const enumLabel = (
  domain: Readonly<Record<string, string | number>>,
  value: string | number,
): string => {
  const memberName = Object.entries(domain).find(([, memberValue]) => memberValue === value)?.[0];
  const labelSource = memberName ?? String(value);

  return Array.from(labelSource, (character, index) => {
    const uppercaseLetter =
      character.toUpperCase() === character && character.toLowerCase() !== character;

    return index > 0 && uppercaseLetter ? ' ' + character : character;
  }).join('');
};
