import { getAlertDateKey } from "./alertHelpers";
import { getOverallStatus } from "./thresholds";

export function getPondMonitoringStatus(pond, readings = pond) {
  if (!pond.registeredDevice || !pond.deviceOnline) return "offline";
  return getOverallStatus(readings);
}

export function getFarmMonitoringStatus(ponds, readingsByPond = new Map()) {
  const statuses = ponds
    .map((pond) => getPondMonitoringStatus(pond, readingsByPond.get(String(pond.id)) ?? pond))
    .filter((status) => status !== "offline");

  if (statuses.length === 0) return "offline";
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("moderate")) return "moderate";
  return "normal";
}

function getOfflineAlertStorageKey() {
  let userId = "anonymous";
  try {
    userId = JSON.parse(localStorage.getItem("hyqual_user") || "null")?.uid || userId;
  } catch {
    userId = "anonymous";
  }
  return `hyqual_device_offline_alerts_${userId}`;
}

export function buildOfflineDeviceAlerts(farms, now = new Date()) {
  if (typeof localStorage === "undefined") return [];

  const offlinePonds = farms.flatMap((farm) => farm.ponds
    .filter((pond) => pond.registeredDevice && !pond.deviceOnline)
    .map((pond) => ({ farm, pond, key: `${farm.id}:${pond.id}` })));

  let state = { activeByPond: {}, alerts: [] };
  try {
    state = JSON.parse(localStorage.getItem(getOfflineAlertStorageKey()) || "null") || state;
  } catch {
    state = { activeByPond: {}, alerts: [] };
  }
  if (!state.activeByPond || !Array.isArray(state.alerts)) {
    state = { activeByPond: {}, alerts: [] };
  }

  const currentKeys = new Set(offlinePonds.map(({ key }) => key));
  for (const key of Object.keys(state.activeByPond)) {
    if (!currentKeys.has(key)) delete state.activeByPond[key];
  }

  for (const { farm, pond, key } of offlinePonds) {
    if (state.activeByPond[key]) continue;

    const createdAt = now.toISOString();
    const alert = {
      id: `device-offline-${pond.id}-${now.getTime()}`,
      farmId: farm.id,
      pondId: pond.id,
      farmName: farm.name,
      pond: pond.name,
      status: "offline",
      riskLabel: "Communication",
      parameter: "Device",
      message: "Monitoring device is offline and is not sending readings.",
      trend: "No current data",
      displayTime: "Now",
      date: getAlertDateKey(now),
      daysAgo: 0,
      createdAt,
    };
    state.activeByPond[key] = alert.id;
    state.alerts.push(alert);
  }

  state.alerts = state.alerts.slice(-100);
  localStorage.setItem(getOfflineAlertStorageKey(), JSON.stringify(state));
  return state.alerts.map((alert) => ({
    ...alert,
    daysAgo: Math.max(0, Math.floor((now.getTime() - new Date(alert.createdAt).getTime()) / 86400000)),
  }));
}
