/** Site-relative media paths (/photos/..., /videos/...) live under public/ in the object store; absolute URLs pass through. */
export function resolveMediaUrl(url: string, publicBaseUrl?: string | null): string {
  if (!publicBaseUrl || !/^\/(photos|videos)\//.test(url)) return url;
  return `${publicBaseUrl.replace(/\/+$/, "")}/public${url}`;
}
