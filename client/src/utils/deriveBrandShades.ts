/**
 * Derives the full navy/gold shade ramp (as "R G B" channel strings, ready for
 * `rgb(var(--x))`) from a primary (accent) and secondary (dark base) hex color.
 * The app is a dark theme, so `secondary` is treated as the mid-dark background
 * (navy-800) and other navy steps are derived around it.
 */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex color: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
const lighten = ([r, g, b]: number[], amt: number): number[] =>
  [r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt];
const darken = ([r, g, b]: number[], amt: number): number[] =>
  [r * (1 - amt), g * (1 - amt), b * (1 - amt)];
const channels = (rgb: number[]): string => rgb.map(clamp).join(' ');
/** Mix two RGB arrays at t=0.5 (equal blend). */
const mix = (a: [number, number, number], b: [number, number, number]): number[] =>
  [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

export function deriveBrandShades(
  primaryHex: string,
  secondaryHex: string,
  textHex: string,
): Record<string, string> {
  const primary = hexToRgb(primaryHex);
  const secondary = hexToRgb(secondaryHex);
  const text = hexToRgb(textHex);
  return {
    '--gold-400': channels(lighten(primary, 0.18)),
    '--gold-500': channels(primary),
    '--gold-600': channels(darken(primary, 0.25)),
    '--navy-900': channels(darken(secondary, 0.25)),
    '--navy-800': channels(secondary),
    '--navy-700': channels(lighten(secondary, 0.12)),
    '--navy-600': channels(lighten(secondary, 0.22)),
    '--navy-500': channels(lighten(secondary, 0.35)),
    '--slate-text': channels(text),
    '--slate-muted': channels(mix(text, secondary)),
  };
}
