import { describe, expect, it } from "vitest";
import { assertExpiry, assertSafeKey, buildObjectKey } from "./keys";
import { InvalidExpiryError, InvalidKeyError } from "./types";

const owner = "0b9f2d4e-6a1c-4b7e-8f3a-1c2d3e4f5a6b";
const object = "7c1a9e20-3b4d-4f6a-9c8b-0d1e2f3a4b5c";

describe("buildObjectKey", () => {
  it("builds kind/owner/object.ext from UUIDs", () => {
    expect(buildObjectKey({ kind: "gpx", ownerId: owner, objectId: object, ext: "gpx" })).toBe(`gpx/${owner}/${object}.gpx`);
  });
  it("rejects non-UUID ids", () => {
    expect(() => buildObjectKey({ kind: "gpx", ownerId: "../evil", objectId: object, ext: "gpx" })).toThrow(InvalidKeyError);
    expect(() => buildObjectKey({ kind: "gpx", ownerId: owner, objectId: "my file", ext: "gpx" })).toThrow(InvalidKeyError);
  });
  it("rejects extensions outside the allow-list", () => {
    expect(() => buildObjectKey({ kind: "image", ownerId: owner, objectId: object, ext: "exe" as never })).toThrow(InvalidKeyError);
  });
});

describe("assertSafeKey", () => {
  it.each([["../x"], ["/abs"], ["a\\b"], ["a\u0000b"], ["a/./b"], ["a//b"], [""], ["x".repeat(300)]])("rejects %j", (key) => {
    expect(() => assertSafeKey(key)).toThrow(InvalidKeyError);
  });
  it("accepts a built key", () => {
    expect(() => assertSafeKey(`gpx/${owner}/${object}.gpx`)).not.toThrow();
  });
});

describe("assertExpiry", () => {
  it.each([[0], [-5], [29], [3601], [1.5], [Number.NaN]])("rejects %s", (s) => {
    expect(() => assertExpiry(s)).toThrow(InvalidExpiryError);
  });
  it.each([[30], [3600]])("accepts %s", (s) => {
    expect(() => assertExpiry(s)).not.toThrow();
  });
});
