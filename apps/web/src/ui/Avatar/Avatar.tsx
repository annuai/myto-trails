/** A rider's picture, or their initials on the accent colour when they have not set one. */
export function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  const style = { width: size, height: size, fontSize: size * 0.4 };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={size} height={size} style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" style={style} className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-on-art">{initials}</span>
  );
}
