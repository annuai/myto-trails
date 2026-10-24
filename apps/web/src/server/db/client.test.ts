// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { createSql } from "./client";

const url = "postgres://u:p@localhost:5999/none";
const saved = process.env.NEXT_PHASE;
afterEach(() => {
  if (saved === undefined) delete process.env.NEXT_PHASE;
  else process.env.NEXT_PHASE = saved;
});

describe("createSql", () => {
  it("opens up to 5 connections while running", async () => {
    delete process.env.NEXT_PHASE;
    const sql = createSql(url);
    expect(sql.options.max).toBe(5);
    await sql.end();
  });

  it("opens a single connection during the production build, so the build cannot exhaust a small pooler", async () => {
    process.env.NEXT_PHASE = "phase-production-build";
    const sql = createSql(url);
    expect(sql.options.max).toBe(1);
    await sql.end();
  });
});
