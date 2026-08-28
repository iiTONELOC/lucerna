const UINT32_RANGE = 2 ** 32;

export const randomIndex = (length: number): number => {
  const [randomValue = 0] = crypto.getRandomValues(new Uint32Array(1));

  return Math.floor((randomValue / UINT32_RANGE) * length);
};
