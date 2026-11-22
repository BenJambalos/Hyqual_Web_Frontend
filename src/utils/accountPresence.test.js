import { describe, expect, it } from "vitest";
import { formatLastSeen } from "./accountPresence";

describe("formatLastSeen", () => {
  const now = Date.parse("2026-11-22T12:00:00Z");

  it("shows Now while an account is online", () => {
    expect(formatLastSeen(
      { id: "admin-1", lastSeen: new Date(now - 30000).toISOString() },
      { "admin-1": { state: "online" } },
      now,
    )).toBe("Now");
  });

  it("shows elapsed time from the latest presence timestamp while offline", () => {
    expect(formatLastSeen(
      { id: "admin-1", lastSeen: new Date(now - 60 * 60000).toISOString() },
      { "admin-1": { state: "offline", lastChanged: now - 30 * 60000 } },
      now,
    )).toBe("30 min ago");
  });

  it("shows Never when no last-seen time is available", () => {
    expect(formatLastSeen({ id: "admin-1" }, {}, now)).toBe("Never");
  });
});
