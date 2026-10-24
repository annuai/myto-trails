/** Generated stand-in for a trail photo: layered ridgelines in a colour picked from the trail's slug. Decorative only. */
const PALETTES = [
  ["var(--art-1-sky)", "var(--art-1-far)", "var(--art-1-mid)", "var(--art-1-near)"],
  ["var(--art-2-sky)", "var(--art-2-far)", "var(--art-2-mid)", "var(--art-2-near)"],
  ["var(--art-3-sky)", "var(--art-3-far)", "var(--art-3-mid)", "var(--art-3-near)"],
  ["var(--art-4-sky)", "var(--art-4-far)", "var(--art-4-mid)", "var(--art-4-near)"],
  ["var(--art-5-sky)", "var(--art-5-far)", "var(--art-5-mid)", "var(--art-5-near)"],
  ["var(--art-6-sky)", "var(--art-6-far)", "var(--art-6-mid)", "var(--art-6-near)"],
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
      <circle cx="122" cy="26" r="11" fill="var(--color-on-art)" opacity="0.55" />
      <path d="M0 62 28 40 48 56 74 30 104 58 130 42 160 60V100H0z" fill={far} />
      <path d="M0 74 24 58 50 70 82 50 112 72 140 60 160 70V100H0z" fill={mid} />
      <path d="M0 88 30 76 62 86 98 72 132 86 160 78V100H0z" fill={near} />
      <path d="M20 96c20-8 38-2 58-8s38-14 62-6" fill="none" stroke="var(--color-on-art)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
    </svg>
  );
}
