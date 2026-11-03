import { describe, expect, it } from "vitest";
import {
  buildReadingAlerts,
  getAlertDateKey,
  getAlertTimestamp,
  normalizeStoredAlerts,
} from "./alertHelpers";

describe("alert normalization and generation", () => {
  const now = new Date("2026-11-04T04:00:00.000Z");
  const farms = [{
    id: "3",
    name: "Farm 3",
    ponds: [
      { id: "7", name: "Pond 7" },
      { id: "8", name: "Pond 8" },
    ],
  }];

  it("generates alerts only from each pond's latest recent abnormal reading", () => {
    const alerts = buildReadingAlerts([
      { pondId: 7, createdAt: "2026-11-04T03:59:00.000Z", temp: 20 },
      { pondId: 7, createdAt: "2026-11-04T03:59:30.000Z", temp: 29 },
      { pondId: 8, createdAt: "2026-11-04T03:58:00.000Z", ph: 6 },
      { pondId: 8, createdAt: "2026-11-04T03:50:00.000Z", temp: 20 },
      { pondId: 99, createdAt: "2026-11-04T03:59:00.000Z", temp: 20 },
    ], farms, now);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      farmId: "3",
      pondId: "8",
      pond: "Pond 8",
      parameter: "pH",
      status: "critical",
    });
  });

  it("normalizes stored severity and calculates correct local date and age", () => {
    const [alert] = normalizeStoredAlerts([{
      farm_id: 3,
      pond_id: 7,
      alert_level: "medium",
      created_at: "2026-11-02T04:00:00.000Z",
      is_resolved: 1,
    }], farms, now);

    expect(alert).toMatchObject({
      status: "moderate",
      isResolved: true,
      daysAgo: 2,
      date: getAlertDateKey(new Date("2026-11-02T04:00:00.000Z")),
    });
  });

  it("does not turn a missing or invalid timestamp into a current alert time", () => {
    expect(getAlertTimestamp(null)).toBeNull();
    expect(getAlertTimestamp("not-a-date")).toBeNull();
  });
});
