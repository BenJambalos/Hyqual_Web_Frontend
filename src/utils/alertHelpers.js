import { getParamStatus, THRESHOLDS } from "./thresholds";
import { LIVE_DEVICE_TARGET } from "../config/liveDeviceConfig";

export const readingParameters = [
  { key: "temp", label: "Temperature", unit: "°C", thresholdKey: "temp" },
  { key: "ph", label: "pH", unit: "pH", thresholdKey: "ph" },
  { key: "do", label: "Dissolved oxygen", unit: "mg/L", thresholdKey: "do" },
  { key: "sal", label: "Salinity", unit: "ppt", thresholdKey: "sal" },
];

export function getAlertTimestamp(value) {
  const timestamp = value?.toDate?.() ?? value;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeReferenceId(value, prefix) {
  return value == null ? value : String(value).replace(prefix, "");
}

function formatThreshold(parameter, threshold) {
  if (threshold.normalMax === Infinity) return `≥ ${threshold.normalMin} ${parameter.unit}`;
  return `${threshold.normalMin}-${threshold.normalMax} ${parameter.unit}`;
}

function buildReadingMessage(parameter, value) {
  const threshold = THRESHOLDS[parameter.thresholdKey];
  const direction = value < threshold.normalMin ? "below" : "above";
  return `${parameter.label} at ${value} ${parameter.unit} is ${direction} the safe range of ${formatThreshold(parameter, threshold)}`;
}

export function buildReadingAlerts(history, farms) {
  const liveFarm = farms.find((farm) => String(farm.id) === String(LIVE_DEVICE_TARGET.farmId));
  const livePond = liveFarm?.ponds.find((pond) => String(pond.id) === String(LIVE_DEVICE_TARGET.pondId));

  return history.flatMap((reading) => readingParameters.flatMap((parameter) => {
    const value = reading[parameter.key];
    const status = getParamStatus(parameter.thresholdKey, value);
    if (status === "normal" || status === "offline") return [];

    const timestamp = getAlertTimestamp(reading.createdAt);
    return [{
      id: `reading-${reading.createdAt}-${parameter.key}`,
      farmId: LIVE_DEVICE_TARGET.farmId,
      pondId: LIVE_DEVICE_TARGET.pondId,
      farmName: liveFarm?.name ?? "",
      pond: livePond?.name ?? LIVE_DEVICE_TARGET.pondId,
      status,
      riskLabel: status === "critical" ? "Severe risk" : "Moderate risk",
      parameter: parameter.label,
      message: buildReadingMessage(parameter, value),
      trend: status === "critical" ? "Critical reading" : "Monitor reading",
      displayTime: timestamp.toLocaleString(),
      date: timestamp.toISOString().slice(0, 10),
      daysAgo: Math.max(0, Math.floor((Date.now() - timestamp.getTime()) / 86400000)),
      createdAt: timestamp.toISOString(),
    }];
  }));
}

export function normalizeStoredAlerts(items, farms) {
  return items.map((alert) => {
    const farmId = normalizeReferenceId(alert.farmId ?? alert.farm_id, "farm_");
    const pondId = normalizeReferenceId(alert.pondId ?? alert.pond_id, "pond_");
    const farm = farms.find((item) => String(item.id) === String(farmId));
    const pond = farm?.ponds.find((item) => String(item.id) === String(pondId));
    const timestamp = alert.createdAt?.toDate?.() ?? alert.createdAt;
    return {
      ...alert,
      farmId,
      pondId,
      status: String(alert.status ?? "moderate").toLowerCase(),
      farmName: farm?.name ?? alert.farmName ?? alert.farm_name ?? "",
      pond: alert.pond ?? alert.pondName ?? pond?.name ?? "",
      message: alert.message ?? alert.alertMessage ?? "",
      displayTime: alert.displayTime ?? (timestamp ? new Date(timestamp).toLocaleString() : ""),
      date: alert.date ?? (timestamp ? new Date(timestamp).toISOString().slice(0, 10) : ""),
      daysAgo: alert.daysAgo ?? 0,
    };
  });
}
