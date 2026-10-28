import { describe, expect, it } from "vitest";
import { findVersionDrift, isSemver, plistVersion } from "./find-version-drift";

describe("isSemver", () => {
  it("accepts MAJOR.MINOR.PATCH, with an optional pre-release, and nothing looser", () => {
    for (const ok of ["0.8.0", "1.0.0", "12.34.56", "1.0.0-beta.1"]) expect(isSemver(ok)).toBe(true);
    for (const bad of ["1.0", "v1.0.0", "1.0.0.0", "", "01.0.0", "1.0.x"]) expect(isSemver(bad)).toBe(false);
  });
});

describe("findVersionDrift", () => {
  const files = [
    { path: "package.json", version: "0.8.0" },
    { path: "apps/web/package.json", version: "0.8.0" },
    { path: "apps/mobile/app.json", version: "0.8.0" },
  ];

  it("is empty when every file carries the manifest version", () => {
    expect(findVersionDrift("0.8.0", files)).toEqual([]);
  });

  it("names each file that differs or has no version, and says what it found", () => {
    const drift = findVersionDrift("0.8.0", [{ path: "a", version: "0.7.0" }, { path: "b", version: undefined }, { path: "c", version: "0.8.0" }]);
    expect(drift).toEqual(['a is 0.7.0, expected 0.8.0', 'b has no version, expected 0.8.0']);
  });

  it("refuses a manifest version that is not semantic", () => {
    expect(findVersionDrift("0.8", files)).toEqual(['the manifest version "0.8" is not MAJOR.MINOR.PATCH']);
  });
});

describe("plistVersion", () => {
  const plist = (v: string) => `<dict>
\t<key>CFBundleShortVersionString</key>
\t<string>${v}</string>
\t<key>CFBundleVersion</key>
\t<string>1</string>
</dict>`;

  it("reads the marketing version, not the build number", () => {
    expect(plistVersion(plist("0.8.0"))).toBe("0.8.0");
  });

  it("is undefined when the key is missing", () => {
    expect(plistVersion("<dict><key>CFBundleVersion</key><string>1</string></dict>")).toBeUndefined();
  });
});
