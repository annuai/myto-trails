// Turns Lucide icons (the set the Myto phone app draws with) into Android vector
// drawables, so Myto Dash's chrome matches the app stroke for stroke.
//
//   node tools/lucide-to-vector.mjs ../../node_modules/lucide-react-native/dist/esm/icons
//
// Writes app/src/main/res/drawable/ic_*.xml. Each icon keeps Lucide's 24-unit
// viewport, 2-unit round strokes, and carries `android:tint="@color/icon_tint"`
// so the theme (and BaseActivity.tintIcons) colours it.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICONS = {
  ic_home: 'house', ic_apps: 'layout-grid', ic_audio: 'music', ic_radio: 'radio', ic_phone: 'phone',
  ic_nav: 'navigation', ic_settings: 'settings', ic_wifi: 'wifi',
  ic_play: ['play', 'fill'], ic_pause: ['pause', 'fill'], ic_skip_next: 'skip-forward', ic_skip_previous: 'skip-back',
  ic_volume: 'volume-2', ic_volume_off: 'volume-x', ic_add: 'plus', ic_back: 'arrow-left',
  ic_arrow_up: 'arrow-up', ic_arrow_down: 'arrow-down', ic_check: 'check', ic_visible: 'eye', ic_hidden: 'eye-off',
  ic_reset: 'rotate-ccw', ic_android_auto: 'car-front', ic_carplay: 'monitor-smartphone',
  ic_wx_clear: 'sun', ic_wx_partly: 'cloud-sun', ic_wx_cloudy: 'cloud', ic_wx_fog: 'cloud-fog',
  ic_wx_rain: 'cloud-rain', ic_wx_snow: 'cloud-snow', ic_wx_thunder: 'cloud-lightning',
};

const src = process.argv[2];
if (!src) throw new Error('usage: node tools/lucide-to-vector.mjs <lucide icons dir>');
const out = join(dirname(fileURLToPath(import.meta.url)), '../app/src/main/res/drawable');

/** Reads `node: [...]` from a Lucide .mjs file without executing it. */
function iconNode(name) {
  const text = readFileSync(join(src, `${name}.mjs`), 'utf8');
  // Renamed icons are one-line re-exports of the new name ("music" → "eighth-notes").
  const alias = !text.includes('node:') && text.match(/from '\.\/([a-z0-9-]+)\.mjs'/);
  if (alias) return iconNode(alias[1]);
  const start = text.indexOf('[', text.indexOf('node:'));
  let depth = 0; let end = start;
  for (; end < text.length; end++) {
    if (text[end] === '[') depth++;
    else if (text[end] === ']' && --depth === 0) break;
  }
  const body = text.slice(start, end + 1);
  // The node list is plain JS literals (strings and objects with unquoted keys): quote the keys and parse it as JSON.
  try {
    return JSON.parse(body.replace(/([{,]\s*)([a-zA-Z0-9_]+):/g, '$1"$2":'));
  } catch (e) {
    throw new Error(`${name}: ${e.message}: ${body.slice(0, 120)}`);
  }
}

const n = (v) => Number(v);
const fmt = (v) => String(Math.round(v * 1000) / 1000);

/**
 * Re-emits SVG path data with every number separated. Android's PathParser
 * misreads packed arc flags ("a1 1 0 011 1"), which Lucide occasionally emits,
 * so arcs are rebuilt token by token.
 */
function normalisePath(d) {
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)/g;
  const out = [];
  let cmd = null; let argIndex = 0;
  const tokens = [];
  // Arc flags can be single packed digits, so split those before the generic number match.
  for (let i = 0; i < d.length;) {
    const ch = d[i];
    if (/[MmLlHhVvCcSsQqTtAaZz]/.test(ch)) { tokens.push(ch); i++; cmd = ch; argIndex = 0; continue; }
    if (/[\s,]/.test(ch)) { i++; continue; }
    if ((cmd === 'a' || cmd === 'A') && (argIndex % 7 === 3 || argIndex % 7 === 4) && (ch === '0' || ch === '1')) {
      tokens.push(ch); i++; argIndex++; continue;
    }
    re.lastIndex = i;
    const m = re.exec(d);
    if (!m || m.index !== i) throw new Error(`bad path near ${d.slice(i, i + 10)}`);
    // Leading-dot numbers (".5") crash the path parser on some older Android builds (lint: InvalidVectorPath).
    tokens.push(m[0].replace(/^(-?)\./, '$10.')); i += m[0].length; argIndex++;
  }
  for (const t of tokens) out.push(t);
  return out.join(' ').replace(/ ([MmLlHhVvCcSsQqTtAaZz]) /g, '$1').trim();
}

function toPath([tag, a]) {
  switch (tag) {
    case 'path': return normalisePath(a.d);
    case 'circle': { const [cx, cy, r] = [n(a.cx), n(a.cy), n(a.r)]; return `M${fmt(cx - r)},${fmt(cy)} a${r},${r} 0 1 0 ${fmt(2 * r)},0 a${r},${r} 0 1 0 ${fmt(-2 * r)},0 z`; }
    case 'ellipse': { const [cx, cy, rx, ry] = [n(a.cx), n(a.cy), n(a.rx), n(a.ry)]; return `M${fmt(cx - rx)},${fmt(cy)} a${rx},${ry} 0 1 0 ${fmt(2 * rx)},0 a${rx},${ry} 0 1 0 ${fmt(-2 * rx)},0 z`; }
    case 'line': return `M${a.x1},${a.y1} L${a.x2},${a.y2}`;
    case 'polyline': case 'polygon': {
      const p = a.points.trim().split(/[\s,]+/);
      let s = `M${p[0]},${p[1]}`;
      for (let i = 2; i < p.length; i += 2) s += ` L${p[i]},${p[i + 1]}`;
      return tag === 'polygon' ? `${s} z` : s;
    }
    case 'rect': {
      const [x, y, w, h] = [n(a.x ?? 0), n(a.y ?? 0), n(a.width), n(a.height)];
      const r = Math.min(n(a.rx ?? a.ry ?? 0), w / 2, h / 2);
      if (!r) return `M${x},${y} h${w} v${h} h${-w} z`;
      return `M${fmt(x + r)},${y} h${fmt(w - 2 * r)} a${r},${r} 0 0 1 ${r},${r} v${fmt(h - 2 * r)} a${r},${r} 0 0 1 ${-r},${r} h${fmt(-(w - 2 * r))} a${r},${r} 0 0 1 ${-r},${-r} v${fmt(-(h - 2 * r))} a${r},${r} 0 0 1 ${r},${-r} z`;
    }
    default: throw new Error(`unsupported element ${tag}`);
  }
}

for (const [file, spec] of Object.entries(ICONS)) {
  const [name, mode] = Array.isArray(spec) ? spec : [spec, 'stroke'];
  const fill = mode === 'fill' ? '@android:color/white' : '@android:color/transparent';
  const paths = iconNode(name).map((el) =>
    `    <path\n        android:fillColor="${fill}"\n        android:strokeColor="@android:color/white"\n        android:strokeWidth="2"\n        android:strokeLineCap="round"\n        android:strokeLineJoin="round"\n        android:pathData="${toPath(el)}" />`).join('\n');
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<!-- Lucide "${name}" (ISC licence), generated by tools/lucide-to-vector.mjs. Do not edit by hand. -->\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="24dp" android:height="24dp"\n    android:viewportWidth="24" android:viewportHeight="24"\n    android:tint="@color/icon_tint">\n${paths}\n</vector>\n`;
  writeFileSync(join(out, `${file}.xml`), xml);
}
console.log(`wrote ${Object.keys(ICONS).length} icons`);
