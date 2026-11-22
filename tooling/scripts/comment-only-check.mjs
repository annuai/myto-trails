// Proves a documentation pass changed no behaviour.
//
//   node tooling/scripts/comment-only-check.mjs snapshot <out.json>   write a fingerprint of every source file
//   node tooling/scripts/comment-only-check.mjs compare  <base.json>  list files whose code differs from the fingerprint
//
// The fingerprint is a hash of each file compiled with all comments removed, so editing, adding or deleting a comment
// never changes it and any real edit does. Empty JSX comment slots (`{}` left behind by `{/* ... */}`) are ignored too.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const SOURCE = /\.(ts|tsx|mjs|js)$/;
const DECLARATIONS = /\.d\.ts$/; // compile to nothing, so there is nothing to fingerprint
const SKIP =/(^|\/)(node_modules|ios|android|vendor|migrations|\.next|\.expo)\//;

function sourceFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\n')
    .filter((file) => SOURCE.test(file) && !DECLARATIONS.test(file) && !SKIP.test(file));
}

function fingerprint(file) {
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { removeComments: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
  });
  const code = outputText.replace(/\{\s*\}/g, '');
  return createHash('sha1').update(code).digest('hex');
}

const [mode, path] = process.argv.slice(2);
if (mode === 'snapshot') {
  const prints = Object.fromEntries(sourceFiles().map((file) => [file, fingerprint(file)]));
  writeFileSync(path, JSON.stringify(prints));
  console.log(`fingerprinted ${Object.keys(prints).length} files`);
} else if (mode === 'compare') {
  const base = JSON.parse(readFileSync(path, 'utf8'));
  const now = Object.fromEntries(sourceFiles().map((file) => [file, fingerprint(file)]));
  const changed = Object.keys(now).filter((file) => base[file] !== now[file]);
  console.log(changed.length ? `CODE CHANGED in ${changed.length} file(s):\n${changed.join('\n')}` : `ok: ${Object.keys(now).length} files, comments only`);
  process.exit(changed.length ? 1 : 0);
} else {
  console.error('usage: snapshot <out.json> | compare <base.json>');
  process.exit(2);
}
