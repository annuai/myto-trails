#!/usr/bin/env node
// Offline region build pipeline (laptop only, run per region about monthly).
//
// Usage: node tooling/offline-regions/build.mjs <regionId> [--maxzoom 13] [--no-route] [--no-overture] [--search-only] [--upload]
//
// Required CLIs and files:
//   osmium     osmium-tool (brew install osmium-tool)
//   java       17+, to run Planetiler
//   PLANETILER_JAR  path to planetiler.jar (https://github.com/onthegomap/planetiler/releases),
//                   its default profile is OpenMapTiles
//   INDIA_PBF  path to the cached Geofabrik India extract (default offline-regions/cache/india-latest.osm.pbf,
//              from https://download.geofabrik.de/asia/india-latest.osm.pbf); never downloaded by this script
//   OUT_DIR    output folder (default offline-regions/out, git-ignored)
//   valhalla_build_tiles, valhalla_build_admins, valhalla_build_config, valhalla_build_extract
//              routing tiles for offline directions, version 3.9.0 to match the app's valhalla-mobile 0.6.4:
//              `python3.14 -m venv vh && vh/bin/pip install pyvalhalla==3.9.0`, then put vh/bin on PATH. Skip with --no-route.
//              Karnataka took 2 minutes, 4 GB of memory and about 1.3 GB of free disk while building.
//   python3 + duckdb  Overture Maps places (shops, fuel, food, stays, sights) added to the search file: `pip install duckdb`, or set
//              PYTHON to an interpreter that has it. Needs the network (public S3). Skip with --no-overture. --search-only rebuilds
//              just <id>.places.sqlite from the region's existing out/<id>.osm.pbf (no map, routing or upload).
// For --upload also set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL
// (see .env.example). Uploads <id>.pmtiles, <id>.places.sqlite and <id>.route.tar.gz to public/regions/<id>/<version>/ and rewrites
// the region's entry in public/regions/manifest.json (published URLs keep the public/ prefix: the media host maps the bucket root, as publicUrl() in apps/web/src/server/storage/r2-provider.ts does).
import { execFileSync } from 'node:child_process';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { buildOvertureRow, buildRow, dedupeKey, dedupeKeys } from './places.ts';

const here = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = { regionId: null, maxzoom: 13, upload: false, route: true, overture: true, searchOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--upload') args.upload = true;
    else if (a === '--no-route') args.route = false;
    else if (a === '--no-overture') args.overture = false;
    else if (a === '--search-only') args.searchOnly = true;
    else if (a === '--maxzoom') args.maxzoom = Number(argv[++i]);
    else if (a.startsWith('--maxzoom=')) args.maxzoom = Number(a.split('=')[1]);
    else if (!a.startsWith('--') && !args.regionId) args.regionId = a;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.regionId) throw new Error('Usage: build.mjs <regionId> [--maxzoom 13] [--no-route] [--no-overture] [--search-only] [--upload]');
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

async function writeSearchDb(dbPath, geojsonSeqPath, stateName, overtureNdjson = null) {
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
  const seen = new Set(); // OpenStreetMap rows go first, so an Overture row for the same place is dropped
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
        seen.add(dedupeKey(row.name, row.lat, row.lng));
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
    if (overtureNdjson) {
      let added = 0;
      const rows = createInterface({ input: createReadStream(overtureNdjson, { encoding: 'utf8' }), crlfDelay: Infinity });
      for await (const line of rows) {
        if (!line.trim()) continue;
        const row = buildOvertureRow(JSON.parse(line), stateName);
        if (!row) continue;
        const key = dedupeKey(row.name, row.lat, row.lng);
        if (dedupeKeys(row.name, row.lat, row.lng).some((k) => seen.has(k))) continue;
        seen.add(key);
        insert.run(row.name, row.alt, row.kind, row.detail, row.lat, row.lng, row.rank);
        added++;
      }
      console.log(`Added ${added} Overture places (${count} from OpenStreetMap)`);
      count += added;
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

/**
 * Valhalla routing tiles for the region, as one gzipped tile extract. Only roads a motorcycle can use go in; walking and cycling data are
 * left out. The admin database is built first: it carries each country's driving side and rules into the tiles. The phone unpacks the
 * file once after download (valhalla-mobile maps the plain tar); gzip cuts the download to about 40 percent.
 */
async function buildRoute(outDir, region, regionPbf) {
  const work = join(outDir, `${region.id}.valhalla`);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  const roads = join(work, 'roads.osm.pbf');
  const tar = join(work, 'tiles.tar');
  const gz = join(outDir, `${region.id}.route.tar.gz`);
  run('osmium', ['tags-filter', '--overwrite', '-o', roads, regionPbf,
    'w/highway=motorway,motorway_link,trunk,trunk_link,primary,primary_link,secondary,secondary_link,tertiary,tertiary_link,unclassified,residential,living_street,service,road,track',
    'w/route=ferry', 'r/type=restriction,route,boundary', 'w/boundary=administrative']);
  const config = execFileSync('valhalla_build_config', [
    '--mjolnir-tile-dir', join(work, 'tiles'), '--mjolnir-tile-extract', tar, '--mjolnir-admin', join(work, 'admins.sqlite'),
    '--mjolnir-include-bicycle', 'False', '--mjolnir-include-pedestrian', 'False', '--mjolnir-include-driveways', 'False',
    '--mjolnir-include-platforms', 'False', '--mjolnir-include-construction', 'False',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const configPath = join(work, 'config.json');
  writeFileSync(configPath, config);
  run('valhalla_build_admins', ['-c', configPath, roads]);
  run('valhalla_build_tiles', ['-c', configPath, roads]);
  run('valhalla_build_extract', ['-c', configPath]);
  rmSync(join(work, 'tiles'), { recursive: true, force: true }); // the extract holds them all; the folder doubles the disk needed
  await pipeline(createReadStream(tar), createGzip({ level: 9 }), createWriteStream(gz));
  const ref = { url: '', bytes: statSync(gz).size, sha256: await sha256(gz), unpackedBytes: statSync(tar).size };
  rmSync(work, { recursive: true, force: true });
  return { file: gz, ref };
}

async function upload({ region, version, files, entry, partial = false }) {
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
  // Keys carry the public/ prefix and so do the URLs: the media host maps the bucket root (r2-provider publicUrl()).
  // no-cache on the manifest: without it a phone's HTTP stack may keep serving the old list for hours (its age is guessed from Last-Modified), so a new version would not show as an update.
  const put = (Key, Body, ContentType) =>
    client.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: `public/${Key}`, Body, ContentType, CacheControl: 'no-cache' }));
  const putFile = (Key, path) =>
    new Upload({
      client,
      params: { Bucket: env.R2_BUCKET, Key: `public/${Key}`, Body: createReadStream(path), ContentType: 'application/octet-stream' },
    }).done();
  for (const f of files) {
    await putFile(`regions/${region.id}/${version}/${f.name}`, f.path);
    f.url = `${base}/public/regions/${region.id}/${version}/${f.name}`;
  }
  let manifest = { format: 1, regions: [] };
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: 'public/regions/manifest.json' }));
    manifest = JSON.parse(await res.Body.transformToString());
  } catch (e) {
    if (e?.name !== 'NoSuchKey') throw e;
  }
  for (const f of files) entry[f.key].url = f.url;
  if (partial) {
    // Only some files were rebuilt: the rest keep the published entry's references. A new version, so installed phones see an update.
    const old = manifest.regions.find((r) => r.id === region.id);
    if (!old) throw new Error(`${region.id} is not in the published manifest; build it in full first`);
    Object.assign(entry, { ...old, ...Object.fromEntries(files.map((f) => [f.key, entry[f.key]])), version: entry.version });
  }
  manifest.format = 1;
  manifest.regions = [...manifest.regions.filter((r) => r.id !== region.id), entry].sort((a, b) => a.id.localeCompare(b.id));
  await put('regions/manifest.json', JSON.stringify(manifest, null, 2), 'application/json');
  console.log(`Uploaded ${region.id} ${version} and updated regions/manifest.json`);
}

async function main() {
  const { regionId, maxzoom, upload: doUpload, route: wantRoute, overture, searchOnly } = parseArgs(process.argv.slice(2));
  const route = wantRoute && !searchOnly;
  const { regions } = JSON.parse(readFileSync(join(here, 'regions.json'), 'utf8'));
  const region = regions.find((r) => r.id === regionId);
  if (!region) throw new Error(`Unknown region "${regionId}". Known: ${regions.map((r) => r.id).join(', ')}`);

  const india = resolve(process.env.INDIA_PBF ?? join(here, 'cache', 'india-latest.osm.pbf'));
  const jar = process.env.PLANETILER_JAR ? resolve(process.env.PLANETILER_JAR) : null;
  const outDir = resolve(process.env.OUT_DIR ?? join(here, 'out'));
  if (!existsSync(india)) throw new Error(`India extract not found at ${india} (set INDIA_PBF)`);
  if (!searchOnly && (!jar || !existsSync(jar))) throw new Error('Set PLANETILER_JAR to the planetiler.jar path');
  need('osmium');
  if (!searchOnly) need('java', '-version');
  const python = process.env.PYTHON ?? 'python3';
  if (route) for (const tool of ['valhalla_build_config', 'valhalla_build_admins', 'valhalla_build_tiles', 'valhalla_build_extract']) need(tool, '--help');
  mkdirSync(outDir, { recursive: true });

  const version = new Date().toISOString().slice(0, 10);
  const regionPbf = join(outDir, `${region.id}.osm.pbf`);
  const placesPbf = join(outDir, `${region.id}.places.osm.pbf`);
  const placesJson = join(outDir, `${region.id}.places.geojsonseq`);
  const mapFile = join(outDir, `${region.id}.pmtiles`);
  const searchFile = join(outDir, `${region.id}.places.sqlite`);

  // (a) cut the region
  if (!searchOnly || !existsSync(regionPbf)) run('osmium', ['extract', '--overwrite', '-b', region.bbox.join(','), '-o', regionPbf, india]);
  // (b) vector tiles, Planetiler OpenMapTiles profile
  if (!searchOnly) runIn(outDir, 'java', ['-Xmx4g', '-jar', jar, `--osm-path=${regionPbf}`, `--output=${mapFile}`, `--maxzoom=${maxzoom}`, '--download', '--http-timeout=5m', '--http-retries=10', '--force']);
  // (c) places
  run('osmium', ['tags-filter', '--overwrite', '-o', placesPbf, regionPbf,
    'nwr/place=city,town,village,hamlet,suburb,neighbourhood,county,district,region,state_district,locality,island', 'nwr/natural=peak,saddle,beach,water', 'nwr/tourism=attraction,viewpoint']);
  run('osmium', ['export', '--overwrite', '-f', 'geojsonseq', '-o', placesJson, placesPbf]);
  let overtureFile = null;
  if (overture) {
    overtureFile = join(outDir, `${region.id}.overture.ndjson`);
    run(python, [join(here, 'overture.py'), ...region.bbox.map(String), overtureFile]);
  }
  const count = await writeSearchDb(searchFile, placesJson, region.name, overtureFile);
  console.log(`Wrote ${count} places to ${searchFile}`);
  if (searchOnly) {
    if (doUpload) {
      const file = { key: 'search', name: `${region.id}.places.sqlite`, path: searchFile };
      // A time in the version keeps it new on every run, so no cached copy of an earlier search file is ever served under it.
      const stamp = new Date().toISOString().slice(0, 16).replace('T', '.').replace(':', '');
      const entry = { id: region.id, version: stamp, search: { url: '', bytes: statSync(searchFile).size, sha256: await sha256(searchFile) } };
      await upload({ region, version: stamp, files: [file], entry, partial: true });
    }
    return;
  }

  // (d) routing tiles
  const routing = route ? await buildRoute(outDir, region, regionPbf) : null;

  // (e) hashes and sizes
  const entry = {
    id: region.id,
    name: region.name,
    country: region.country ?? 'India',
    bbox: region.bbox,
    version,
    map: { url: '', bytes: statSync(mapFile).size, sha256: await sha256(mapFile) },
    search: { url: '', bytes: statSync(searchFile).size, sha256: await sha256(searchFile) },
    ...(routing ? { route: routing.ref } : {}),
  };
  console.log(JSON.stringify(entry, null, 2));

  // (f) upload
  if (doUpload) {
    const files = [{ key: 'map', name: `${region.id}.pmtiles`, path: mapFile }, { key: 'search', name: `${region.id}.places.sqlite`, path: searchFile }];
    if (routing) files.push({ key: 'route', name: `${region.id}.route.tar.gz`, path: routing.file });
    await upload({ region, version, files, entry });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
