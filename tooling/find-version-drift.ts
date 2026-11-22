const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;

/** True for a MAJOR.MINOR.PATCH version, with an optional pre-release suffix. */
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

/** The marketing version in an iOS Info.plist (`CFBundleShortVersionString`), not the build number. */
export function plistVersion(plist: string): string | undefined {
  return /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]*)<\/string>/.exec(plist)?.[1];
}

/** The `versionName` in an Android app `build.gradle`, not the `versionCode` build number. */
export function gradleVersion(gradle: string): string | undefined {
  return /versionName\s+"([^"]*)"/.exec(gradle)?.[1];
}

/** The widget extension's `MARKETING_VERSION` in the Xcode project (the build setting wins over its Info.plist): the only one that is not the template's `1.0`. */
export function xcodeWidgetVersion(pbxproj: string): string | undefined {
  return [...pbxproj.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1]).find((v) => v !== '1.0');
}
