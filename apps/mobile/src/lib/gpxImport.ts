import type { LatLng } from './geo';

export type ImportedRoute = { name: string; points: LatLng[]; waypoints: { name: string; lat: number; lng: number }[] };

const unesc = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').trim();
const attr = (attrs: string, name: string) => { const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`)); return m?.[1] ?? m?.[2]; };
const tag = (body: string, name: string) => { const m = body.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`)); return m ? unesc(m[1]) : undefined; };

/** Elements `<tag lat=".." lon="..">…</tag>` (or self-closing) as position, inner text. */
function* elements(xml: string, name: string): Generator<{ lat: number; lng: number; body: string }> {
  const re = new RegExp(`<${name}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${name}>)`, 'g');
  for (const m of xml.matchAll(re)) {
    const lat = Number(attr(m[1], 'lat')), lng = Number(attr(m[1], 'lon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    yield { lat, lng, body: m[2] ?? '' };
  }
}

/**
 * A GPX file as a route. A small tolerant reader (no DOM, so it also runs in tests): track points when there are
 * any, else route points; every `<wpt>` is a waypoint. Throws when the file has no route to ride.
 */
export function parseGpx(xml: string): ImportedRoute {
  const read = (name: string): LatLng[] => [...elements(xml, name)].map(({ lat, lng, body }) => {
    const ele = Number(tag(body, 'ele')), time = Date.parse(tag(body, 'time') ?? '');
    return { lat, lng, ...(tag(body, 'ele') !== undefined && Number.isFinite(ele) ? { ele } : {}), ...(Number.isFinite(time) ? { t: time } : {}) };
  });
  let points = read('trkpt');
  if (!points.length) points = read('rtept');
  if (points.length < 2) throw new Error('There is no route in this file.');
  const container = xml.match(/<trk\b[\s\S]*?<\/trk>/)?.[0] ?? xml.match(/<rte\b[\s\S]*?<\/rte>/)?.[0] ?? '';
  const name = tag(container.replace(/<trkseg\b[\s\S]*?<\/trkseg>/g, ''), 'name') || tag(xml.match(/<metadata\b[\s\S]*?<\/metadata>/)?.[0] ?? '', 'name') || 'Imported route';
  const waypoints = [...elements(xml.replace(/<(trk|rte)\b[\s\S]*?<\/\1>/g, ''), 'wpt')].map(({ lat, lng, body }, i) => ({ name: tag(body, 'name') || `Waypoint ${i + 1}`, lat, lng }));
  return { name, points, waypoints };
}
