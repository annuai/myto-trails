#!/usr/bin/env node
// Offline region build pipeline (laptop only, run per region about monthly).
//
// Usage: node tooling/offline-regions/build.mjs <regionId> [--maxzoom 13] [--upload]
//
// Required CLIs and files:
//   osmium     osmium-tool (brew install osmium-tool)
//   java       17+, to run Planetiler
//   PLANETILER_JAR  path to planetiler.jar (https://github.com/onthegomap/planetiler/releases),
//                   its default profile is OpenMapTiles
//   INDIA_PBF  path to the cached Geofabrik India extract (default offline-regions/cache/india-latest.osm.pbf,
//              from https://download.geofabrik.de/asia/india-latest.osm.pbf); never downloaded by this script
//   OUT_DIR    output folder (default offline-regions/out, git-ignored)
// For --upload also set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
// (see .env.example). Uploads <id>.pmtiles and <id>.places.sqlite to public/regions/<id>/<version>/ and rewrites
// the region's entry in public/regions/manifest.json (published URLs omit the public/ prefix).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { buildRow } from './places.ts';

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { regionId: null, maxzoom: 13, upload: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--upload') args.upload = true;
    else if (a === '--maxzoom') args.maxzoom = Number(argv[++i]);
    else if (a.startsWith('--maxzoom=')) args.maxzoom = Number(a.split('=')[1]);
    else if (!a.startsWith('--') && !args.regionId) args.regionId = a;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.regionId) throw new Error('Usage: build.mjs <regionId> [--maxzoom 13] [--upload]');
  if (!Number.isInteger(args.maxzoom) || args.maxzoom < 1 || args.maxzoom > 15) throw new Error('--maxzoom must be 1..15');
  return args;
}

function need(cmd, versionArg = '--version') {
  try {
    execFileSync(cmd, [versionArg], { stdio: 'ignore' });
  } catch {
    throw new Error(`Required tool not found on PATH: ${cmd}`);
  }
}

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const runIn = (cwd, cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', cwd }); // Planetiler writes data/ and tmp files to cwd

function sha256(file) {
  return new Promise((resolveHash, reject) => {
    const h = createHash('sha256');
    createReadStream(file)
      .on('data', (c) => h.update(c))
      .on('error', reject)
      .on('end', () => resolveHash(h.digest('hex')));
  });
}

// geojsonseq lines are RS-prefixed JSON features; polygons use the centre of their bounding box.
function centre(geometry) {
  if (geometry.type === 'Point') return { lng: geometry.coordinates[0], lat: geometry.coordinates[1] };
  const pts = [];
  const walk = (c) => (typeof c[0] === 'number' ? pts.push(c) : c.forEach(walk));
  walk(geometry.coordinates);
  if (!pts.length) return null;
  let w = Infinity, e = -Infinity, so = Infinity, n = -Infinity;
  for (const [x, y] of pts) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < so) so = y;
    if (y > n) n = y;
  }
  return { lng: (w + e) / 2, lat: (so + n) / 2 };
}

async function writeSearchDb(dbPath, geojsonSeqPath, stateName) {
  rmSync(dbPath, { force: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE places(id INTEGER PRIMARY KEY, name TEXT, alt TEXT, kind TEXT, detail TEXT, lat REAL, lng REAL, rank INTEGER);
    CREATE VIRTUAL TABLE places_fts USING fts5(name, alt, content='places', tokenize='unicode61 remove_diacritics 2', prefix='2 3 4');
  `);
  const insert = db.prepare('INSERT INTO places(name, alt, kind, detail, lat, lng, rank) VALUES (?,?,?,?,?,?,?)');
  let count = 0;
  let skipped = 0;
  let firstError = null;
  db.exec('BEGIN');
  try {
    const lines = createInterface({ input: createReadStream(geojsonSeqPath, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of lines) {
      const text = line.replace(/^\x1e/, '').trim();
      if (!text) continue;
      try {
        const feature = JSON.parse(text);
        if (!feature.properties?.name) continue;
        const c = feature.geometry && centre(feature.geometry);
        if (!c) continue;
        const row = buildRow(feature.properties, c.lat, c.lng, stateName);
        if (!row) continue;
        insert.run(row.name, row.alt, row.kind, row.detail, row.lat, row.lng, row.rank);
        count++;
      } catch (e) {
        skipped++;
        if (!firstError) {
          firstError = e.message;
          console.warn(`First bad feature: ${firstError}`);
        }
      }
    }
    // Zero places always fails; the 5 percent rule applies once there are enough features to judge.
    const processed = count + skipped;
    if (count === 0) throw new Error(`No places written (${skipped} bad features, first error: ${firstError ?? 'none'})`);
    if (processed >= 100 && skipped / processed > 0.05) {
      throw new Error(`Too many bad features: ${skipped} of ${processed} (first error: ${firstError})`);
    }
    db.exec('COMMIT');
  } catch (e) {
    if (db.inTransaction) db.exec('ROLLBACK');
    db.close();
    rmSync(dbPath, { force: true });
    throw e;
  }
  if (skipped) console.warn(`Skipped ${skipped} bad features`);
  db.exec("INSERT INTO places_fts(places_fts) VALUES('rebuild')");
  db.exec('VACUUM');
  db.close();
  return count;
}

async function upload({ region, version, files, entry }) {
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
  const { Upload } = await import('@aws-sdk/lib-storage');
  const env = process.env;
  for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL']) {
    if (!env[k]) throw new Error(`Missing ${k} for --upload`);
  }
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
  const base = env.R2_PUBLIC_BASE_URL.replace(/\/$/, '');
  // R2_PUBLIC_BASE_URL serves the public/ prefix, so keys carry it and URLs do not.
  const put = (Key, Body, ContentType) =>
    client.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: `public/${Key}`, Body, ContentType }));
  const putFile = (Key, path) =>
    new Upload({
      client,
      params: { Bucket: env.R2_BUCKET, Key: `public/${Key}`, Body: createReadStream(path), ContentType: 'application/octet-stream' },
    }).done();
  for (const f of files) {
    await putFile(`regions/${region.id}/${version}/${f.name}`, f.path);
    f.url = `${base}/regions/${region.id}/${version}/${f.name}`;
  }
  let manifest = { format: 1, regions: [] };
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: 'public/regions/manifest.json' }));
    manifest = JSON.parse(await res.Body.transformToString());
  } catch (e) {
    if (e?.name !== 'NoSuchKey') throw e;
  }
  entry.map.url = files[0].url;
  entry.search.url = files[1].url;
  manifest.format = 1;
  manifest.regions = [...manifest.regions.filter((r) => r.id !== region.id), entry].sort((a, b) => a.id.localeCompare(b.id));
  await put('regions/manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
  console.log(`Uploaded ${region.id} ${version} and updated regions/manifest.json`);
}

async function main() {
  const { regionId, maxzoom, upload: doUpload } = parseArgs(process.argv.slice(2));
  const { regions } = JSON.parse(readFileSync(join(here, 'regions.json'), 'utf8'));
  const region = regions.find((r) => r.id === regionId);
  if (!region) throw new Error(`Unknown region "${regionId}". Known: ${regions.map((r) => r.id).join(', ')}`);

  const india = resolve(process.env.INDIA_PBF ?? join(here, 'cache', 'india-latest.osm.pbf'));
  const jar = process.env.PLANETILER_JAR ? resolve(process.env.PLANETILER_JAR) : null;
  const outDir = resolve(process.env.OUT_DIR ?? join(here, 'out'));
  if (!existsSync(india)) throw new Error(`India extract not found at ${india} (set INDIA_PBF)`);
  if (!jar || !existsSync(jar)) throw new Error('Set PLANETILER_JAR to the planetiler.jar path');
  need('osmium');
  need('java', '-version');
  mkdirSync(outDir, { recursive: true });

  const version = new Date().toISOString().slice(0, 10);
  const regionPbf = join(outDir, `${region.id}.osm.pbf`);
  const placesPbf = join(outDir, `${region.id}.places.osm.pbf`);
  const placesJson = join(outDir, `${region.id}.places.geojsonseq`);
  const mapFile = join(outDir, `${region.id}.pmtiles`);
  const searchFile = join(outDir, `${region.id}.places.sqlite`);

  // (a) cut the region
  run('osmium', ['extract', '--overwrite', '-b', region.bbox.join(','), '-o', regionPbf, india]);
  // (b) vector tiles, Planetiler OpenMapTiles profile
  runIn(outDir, 'java', ['-Xmx4g', '-jar', jar, `--osm-path=${regionPbf}`, `--output=${mapFile}`, `--maxzoom=${maxzoom}`, '--download', '--force']);
  // (c) places
  run('osmium', ['tags-filter', '--overwrite', '-o', placesPbf, regionPbf,
    'nwr/place=city,town,village,hamlet', 'nwr/natural=peak,saddle,beach,water', 'nwr/tourism=attraction,viewpoint']);
  run('osmium', ['export', '--overwrite', '-f', 'geojsonseq', '-o', placesJson, placesPbf]);
  const count = await writeSearchDb(searchFile, placesJson, region.name);
  console.log(`Wrote ${count} places to ${searchFile}`);

  // (d) hashes and sizes
  const entry = {
    id: region.id,
    name: region.name,
    bbox: region.bbox,
    version,
    map: { url: '', bytes: statSync(mapFile).size, sha256: await sha256(mapFile) },
    search: { url: '', bytes: statSync(searchFile).size, sha256: await sha256(searchFile) },
  };
  console.log(JSON.stringify(entry, null, 2));

  // (e) upload
  if (doUpload) {
    await upload({
      region,
      version,
      files: [{ name: `${region.id}.pmtiles`, path: mapFile }, { name: `${region.id}.places.sqlite`, path: searchFile }],
      entry,
    });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
