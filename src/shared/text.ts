export const tailStartOf = (text: string): number => text.lastIndexOf(' ') + 1;

export const capitalize = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
