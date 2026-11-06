type Nav = { canGoBack: () => boolean; back: () => void; replace: (href: '/' | '/clubs' | '/trips' | '/rides') => void };

/** One step back; if there is nothing behind this screen (opened from a link or a notification), go to `fallback` instead of doing nothing. */
export function goBack(router: Nav, fallback: '/' | '/clubs' | '/trips' | '/rides' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
