const W = 600;
const H = 160;
const PAD = { l: 8, r: 8, t: 8, b: 8 };

/** Elevation against distance, drawn as an SVG with the same numbers offered as a table. */
export function ElevationProfile({ profile }: { profile: { d: number; e: number }[] | null }) {
  if (!profile || profile.length < 2) return null;
  const maxD = profile[profile.length - 1]!.d || 1;
  const es = profile.map((p) => p.e);
  const minE = Math.min(...es);
  const maxE = Math.max(...es);
  const span = maxE - minE || 1;
  const x = (d: number) => PAD.l + (d / maxD) * (W - PAD.l - PAD.r);
  const y = (e: number) => H - PAD.b - ((e - minE) / span) * (H - PAD.t - PAD.b);
  const points = profile.map((p) => `${x(p.d).toFixed(1)},${y(p.e).toFixed(1)}`).join(" ");

  // About ten evenly spaced rows, always including the first and last point.
  const step = Math.max(1, Math.floor((profile.length - 1) / 9));
  const rows = profile.filter((_, i) => i % step === 0 || i === profile.length - 1);

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Elevation profile over ${maxD.toFixed(1)} km, from ${Math.round(minE)} m to ${Math.round(maxE)} m`}
        className="h-auto w-full border border-border bg-surface"
      >
        <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <details>
        <summary className="inline-flex min-h-11 cursor-pointer items-center underline underline-offset-4">Show elevation as a table</summary>
        <table className="mt-2 w-full max-w-sm text-left text-sm">
          <thead>
            <tr>
              <th scope="col" className="py-1 font-medium">Distance</th>
              <th scope="col" className="py-1 font-medium">Elevation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.d} className="border-t border-border">
                <td className="py-1">{p.d.toFixed(1)} km</td>
                <td className="py-1">{Math.round(p.e)} m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
