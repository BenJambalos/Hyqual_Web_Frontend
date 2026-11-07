import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildOfflineDeviceAlerts,
  getFarmMonitoringStatus,
  getPondMonitoringStatus,
} from "./monitoringStatus";

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

describe("monitoring status", () => {
  const criticalReadings = { temp: 36, ph: 5, do: 2, sal: 18 };

  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    localStorage.setItem("hyqual_user", JSON.stringify({ uid: "admin-one" }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("reports ponds without a registered device as offline", () => {
    expect(getPondMonitoringStatus({
      registeredDevice: false,
      deviceOnline: false,
    }, criticalReadings)).toBe("offline");
  });

  it("reports registered devices without a recent connection as offline", () => {
    expect(getPondMonitoringStatus({
      registeredDevice: true,
      deviceOnline: false,
    }, criticalReadings)).toBe("offline");
  });

  it("uses water-quality readings only when the device is online", () => {
    expect(getPondMonitoringStatus({
      registeredDevice: true,
      deviceOnline: true,
    }, criticalReadings)).toBe("critical");
  });

  it("marks a farm offline only when all its ponds are offline", () => {
    expect(getFarmMonitoringStatus([
      { id: "1", registeredDevice: false, deviceOnline: false },
      { id: "2", registeredDevice: true, deviceOnline: false },
    ])).toBe("offline");
    expect(getFarmMonitoringStatus([
      { id: "1", registeredDevice: false, deviceOnline: false },
      {
        id: "2",
        registeredDevice: true,
        deviceOnline: true,
        temp: 28,
        ph: 8,
        do: 6,
        sal: 18,
      },
    ])).toBe("normal");
  });

  it("creates one offline alert per outage, not one on every refresh", () => {
    const farms = [{
      id: "farm-1",
      name: "Farm 1",
      ponds: [{ id: "pond-1", name: "Pond 1", registeredDevice: true, deviceOnline: false }],
    }];
    const first = buildOfflineDeviceAlerts(farms, new Date("2026-11-07T04:00:00Z"));
    const nextRefresh = buildOfflineDeviceAlerts(farms, new Date("2026-11-07T04:01:00Z"));

    expect(nextRefresh).toHaveLength(1);
    expect(nextRefresh[0].id).toBe(first[0].id);
    expect(nextRefresh[0].createdAt).toBe(first[0].createdAt);
  });

  it("creates a new alert if a device goes offline again after recovering", () => {
    const offlineFarm = [{
      id: "farm-1",
      name: "Farm 1",
      ponds: [{ id: "pond-1", name: "Pond 1", registeredDevice: true, deviceOnline: false }],
    }];
    const onlineFarm = [{
      id: "farm-1",
      name: "Farm 1",
      ponds: [{ id: "pond-1", name: "Pond 1", registeredDevice: true, deviceOnline: true }],
    }];

    const first = buildOfflineDeviceAlerts(offlineFarm, new Date("2026-11-07T04:00:00Z"));
    buildOfflineDeviceAlerts(onlineFarm, new Date("2026-11-07T04:01:00Z"));
    const second = buildOfflineDeviceAlerts(offlineFarm, new Date("2026-11-07T04:02:00Z"));

    expect(second).toHaveLength(2);
    expect(second[1].id).not.toBe(first[0].id);
    expect(second[1].createdAt).not.toBe(first[0].createdAt);
  });
});
