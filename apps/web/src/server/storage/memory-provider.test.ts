import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MemoryStorageProvider } from "./memory-provider";
import { runStorageContract } from "./contract";
import { createStorage } from "./index";

runStorageContract("memory", async () => {
  const provider = new MemoryStorageProvider();
  return { provider, upload: async (b, k, bytes, type) => provider.put(b, k, bytes, type) };
});

describe("memory provider specifics", () => {
  it("publicUrl points at the public prefix", () => {
    const key = `image/${randomUUID()}/${randomUUID()}.webp`;
    expect(new MemoryStorageProvider().publicUrl(key)).toBe(`memory://public/${key}`);
  });
  it("createStorage builds it from config", () => {
    expect(createStorage({ provider: "memory" }).name).toBe("memory");
  });
});
