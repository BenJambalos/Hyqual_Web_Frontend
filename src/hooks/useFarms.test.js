import { describe, expect, it } from "vitest";
import { parseDatabaseTimestamp } from "./useFarms";

describe("parseDatabaseTimestamp", () => {
  it("interprets MySQL datetime strings as UTC", () => {
    expect(parseDatabaseTimestamp("2026-11-07 03:53:02"))
      .toBe(Date.parse("2026-11-07T03:53:02Z"));
  });

  it("preserves timezone offsets on ISO timestamps", () => {
    expect(parseDatabaseTimestamp("2026-11-07T11:53:02+08:00"))
      .toBe(Date.parse("2026-11-07T03:53:02Z"));
  });
});
