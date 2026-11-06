import { describe, expect, it } from "vitest";
import { isReaction, PHOTO_SIZES, photoCopyKeys, photoKey, photoStem, photoUrls, REACTIONS } from "./photo-shared";

describe("photo names", () => {
  const owner = "11111111-1111-4111-8111-111111111111", asset = "22222222-2222-4222-8222-222222222222";
  it("puts the three copies under one stem named for the owner and the photo", () => {
    expect(photoStem(owner, asset)).toBe(`post/${owner}/${asset}`);
    expect(photoKey(owner, asset, "thumb")).toBe(`post/${owner}/${asset}-400.jpg`);
    expect(photoCopyKeys(photoStem(owner, asset))).toEqual([`post/${owner}/${asset}-400.jpg`, `post/${owner}/${asset}-1080.jpg`, `post/${owner}/${asset}-2048.jpg`]);
    expect(Object.values(PHOTO_SIZES)).toEqual([400, 1080, 2048]);
  });
  it("turns a stem into the public addresses of its copies", () => {
    expect(photoUrls((k) => `https://cdn.test/${k}`, { id: asset, stem: photoStem(owner, asset), width: 2048, height: 1536, colour: "#c85028" })).toEqual({
      id: asset, width: 2048, height: 1536, colour: "#c85028",
      thumbUrl: `https://cdn.test/post/${owner}/${asset}-400.jpg`, viewUrl: `https://cdn.test/post/${owner}/${asset}-1080.jpg`, fullUrl: `https://cdn.test/post/${owner}/${asset}-2048.jpg`,
    });
  });
  it("knows the six reactions and nothing else", () => {
    expect(REACTIONS).toHaveLength(6);
    expect(isReaction("fire")).toBe(true);
    expect(["angry", "", null, 3, undefined].some(isReaction)).toBe(false);
  });
});
