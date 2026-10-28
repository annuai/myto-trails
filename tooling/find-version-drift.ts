const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;

export function isSemver(v: string): boolean {
  return SEMVER.test(v);
}

/** The files whose version differs from the one recorded in the release manifest, one sentence each. */
export function findVersionDrift(expected: string, files: { path: string; version: string | undefined }[]): string[] {
  if (!isSemver(expected)) return [`the manifest version "${expected}" is not MAJOR.MINOR.PATCH`];
  return files.flatMap((f) =>
    f.version === expected ? [] : [f.version === undefined ? `${f.path} has no version, expected ${expected}` : `${f.path} is ${f.version}, expected ${expected}`],
  );
}
