/** Generated stand-in for a trail photo: layered ridgelines in a colour picked from the trail's slug. Decorative only. */
const PALETTES = [
  ["#c9d6c2", "#8fae8a", "#5b7f63", "#2f4f45"],
  ["#e6d5bd", "#c9a574", "#9b7348", "#5d4630"],
  ["#cfd9e3", "#97adc4", "#5f7f9f", "#34506b"],
  ["#e8d2c8", "#cf9d8a", "#a56a58", "#6a3f35"],
  ["#d9dcc0", "#b4b97d", "#858f4a", "#4d5a2c"],
  ["#d6d1e0", "#a59cc0", "#756a98", "#463d63"],
];

export function paletteFor(slug: string): string[] {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTES[h % PALETTES.length]!;
}

export function PlaceholderArt({ slug, className = "" }: { slug: string; className?: string }) {
  const [sky, far, mid, near] = paletteFor(slug);
  return (
    <svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={className} data-testid="placeholder-art">
      <rect width="160" height="100" fill={sky} />
      <circle cx="122" cy="26" r="11" fill="#ffffff" opacity="0.55" />
      <path d="M0 62 28 40 48 56 74 30 104 58 130 42 160 60V100H0z" fill={far} />
      <path d="M0 74 24 58 50 70 82 50 112 72 140 60 160 70V100H0z" fill={mid} />
      <path d="M0 88 30 76 62 86 98 72 132 86 160 78V100H0z" fill={near} />
      <path d="M20 96c20-8 38-2 58-8s38-14 62-6" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
    </svg>
  );
}
