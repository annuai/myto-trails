/** A club's cover image, or its initials on the accent colour when no cover is set. The name is read out by the heading beside it. */
export function ClubCover({ name, url, className = "h-40" }: { name: string; url: string | null; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`${className} w-full rounded-3xl object-cover`} />
  ) : (
    <div aria-hidden="true" className={`${className} flex w-full items-center justify-center rounded-3xl bg-accent text-4xl font-semibold tracking-widest text-on-art`}>{initials}</div>
  );
}
