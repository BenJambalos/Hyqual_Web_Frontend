import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildReadingAlerts,
  getAlertDateKey,
  getAlertTimestamp,
  normalizeStoredAlerts,
  reconcileReadingAlerts,
} from "./alertHelpers";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

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

  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    localStorage.setItem("hyqual_user", JSON.stringify({ uid: "admin-one" }));
  });

  afterEach(() => vi.unstubAllGlobals());

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

  it("keeps the first alert timestamp until fresh readings resolve the condition", () => {
    const firstAt = new Date("2026-11-04T03:59:00.000Z");
    const first = reconcileReadingAlerts([
      { pondId: 7, createdAt: firstAt.toISOString(), ph: 6 },
    ], farms, now);
    const alertId = first[0].id;

    const stillCritical = reconcileReadingAlerts([
      { pondId: 7, createdAt: "2026-11-04T03:59:00.000Z", ph: 6 },
      { pondId: 7, createdAt: "2026-11-04T03:59:30.000Z", ph: 6.2 },
    ], farms, now);
    expect(stillCritical).toHaveLength(1);
    expect(stillCritical[0]).toMatchObject({
      id: alertId,
      createdAt: firstAt.toISOString(),
      isResolved: false,
      status: "critical",
    });

    const resolved = reconcileReadingAlerts([
      { pondId: 7, createdAt: "2026-11-04T03:59:00.000Z", ph: 6 },
      { pondId: 7, createdAt: "2026-11-04T03:59:30.000Z", ph: 6.2 },
      { pondId: 7, createdAt: "2026-11-04T03:59:50.000Z", ph: 8 },
    ], farms, now);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]).toMatchObject({
      id: alertId,
      createdAt: firstAt.toISOString(),
      isResolved: true,
      resolvedAt: "2026-11-04T03:59:50.000Z",
    });
  });

  it("starts a new alert after a resolved condition becomes abnormal again", () => {
    reconcileReadingAlerts([
      { pondId: 7, createdAt: "2026-11-04T03:59:00.000Z", ph: 6 },
    ], farms, now);
    const afterRecovery = reconcileReadingAlerts([
      { pondId: 7, createdAt: "2026-11-04T03:59:00.000Z", ph: 6 },
      { pondId: 7, createdAt: "2026-11-04T03:59:30.000Z", ph: 8 },
    ], farms, now);
    const afterRecurrence = reconcileReadingAlerts([
      { pondId: 7, createdAt: "2026-11-04T03:59:00.000Z", ph: 6 },
      { pondId: 7, createdAt: "2026-11-04T03:59:30.000Z", ph: 8 },
      { pondId: 7, createdAt: "2026-11-04T03:59:50.000Z", ph: 6 },
    ], farms, now);

    expect(afterRecovery[0].isResolved).toBe(true);
    expect(afterRecurrence).toHaveLength(2);
    expect(afterRecurrence[1].isResolved).toBe(false);
    expect(afterRecurrence[1].id).not.toBe(afterRecovery[0].id);
  });
});
