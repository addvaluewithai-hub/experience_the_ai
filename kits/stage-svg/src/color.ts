/** Mixes two #rrggbb colours; t = 0 is a, 1 is b. */
export function mixColor(a: string, b: string, t: number) {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}
export const shade = (color: string, amount: number) => mixColor(color, '#1b1420', amount);
export const tint = (color: string, amount: number) => mixColor(color, '#ffffff', amount);
