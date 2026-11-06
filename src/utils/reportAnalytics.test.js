import { describe, expect, it } from "vitest";
import {
  buildAnalytics,
  filterHistoryByDateRange,
  formatDateRange,
  getHistoryDateRange,
} from "./reportAnalytics";

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

  it("filters trend readings inclusively by the selected local dates", () => {
    const history = [
      { createdAt: "2026-11-04T23:59:59", status: "normal" },
      { createdAt: "2026-11-05T00:00:00", status: "critical" },
      { createdAt: "2026-11-02T00:00:00", status: "offline" },
    ];

    expect(filterHistoryByDateRange(history, { from: "2026-11-02", to: "2026-11-04" }))
      .toEqual([history[0], history[2]]);
  });

  it("formats and derives the displayed date range", () => {
    expect(formatDateRange("2026-11-02", "2026-11-04")).toBe("November 2 - 4, 2026");
    expect(formatDateRange("2026-11-30", "2026-12-02")).toBe("November 30 - December 2, 2026");
    expect(getHistoryDateRange([
      { createdAt: "2026-11-04T08:00:00" },
      { createdAt: "2026-11-02T08:00:00" },
    ])).toEqual({ from: "2026-11-02", to: "2026-11-04" });
  });
});
