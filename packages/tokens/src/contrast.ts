// WCAG contrast between two colours, used by the colour check to keep text readable.

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h.slice(0, 6), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** The WCAG contrast ratio of two hex colours, from 1 (identical) to 21 (black on white). WCAG AA asks for at least 4.5 for body text. */
export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const [light, dark] = [luminance(foregroundHex), luminance(backgroundHex)].sort((a, b) => b - a) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}
