import { describe, expect, it } from "vitest";
import { buildAnalytics } from "./reportAnalytics";

describe("reports and analytics status summaries", () => {
  it("includes offline samples in the distribution and daily trend", () => {
    const result = buildAnalytics([
      { createdAt: "2026-11-04T08:00:00", status: "normal" },
      { createdAt: "2026-11-04T09:00:00", status: "moderate" },
      { createdAt: "2026-11-04T10:00:00", status: "offline" },
      { createdAt: "2026-11-03T10:00:00", status: "offline" },
    ]);

    expect(result.distribution.find((status) => status.label === "Offline")).toMatchObject({
      key: "offline",
      color: "#6b7280",
      percent: 50,
    });
    expect(result.trend).toEqual([
      { month: "Nov 3", normal: 0, critical: 0, warning: 0, offline: 1 },
      { month: "Nov 4", normal: 1, critical: 0, warning: 1, offline: 1 },
    ]);
  });
});
