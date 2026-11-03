import { getParamStatus, THRESHOLDS } from "./thresholds";

export const readingParameters = [
  { key: "temp", label: "Temperature", unit: "°C", thresholdKey: "temp" },
  { key: "ph", label: "pH", unit: "pH", thresholdKey: "ph" },
  { key: "do", label: "Dissolved oxygen", unit: "mg/L", thresholdKey: "do" },
  { key: "sal", label: "Salinity", unit: "ppt", thresholdKey: "sal" },
];

export function getAlertTimestamp(value) {
  const timestamp = value?.toDate?.() ?? value;
  if (timestamp == null || timestamp === "") return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getAlertDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function buildReadingAlerts(history, farms, now = new Date()) {
  const latestByPond = new Map();
  for (const reading of history) {
    if (reading.pondId == null) continue;
    const timestamp = getAlertTimestamp(reading.createdAt);
    if (!timestamp) continue;

    const pondId = String(reading.pondId).replace(/^pond_/, "");
    const latestByParameter = latestByPond.get(pondId) ?? new Map();
    for (const parameter of readingParameters) {
      const value = Number(reading[parameter.key]);
      if (reading[parameter.key] == null || !Number.isFinite(value)) continue;
      const previous = latestByParameter.get(parameter.key);
      if (!previous || timestamp > previous.timestamp) {
        latestByParameter.set(parameter.key, { value, timestamp });
      }
    }
    latestByPond.set(pondId, latestByParameter);
  }

  const nowMs = now.getTime();
  const maxAgeMs = 5 * 60 * 1000;
  const alerts = [];
  for (const [pondId, latestByParameter] of latestByPond) {
    const farm = farms.find((item) => item.ponds.some((pond) => String(pond.id) === pondId));
    const pond = farm?.ponds.find((item) => String(item.id) === pondId);
    if (!farm || !pond) continue;

    for (const parameter of readingParameters) {
      const latest = latestByParameter.get(parameter.key);
      if (!latest || nowMs - latest.timestamp.getTime() > maxAgeMs
        || latest.timestamp.getTime() > nowMs + maxAgeMs) continue;

      const { value, timestamp } = latest;
      const status = getParamStatus(parameter.thresholdKey, value);
      if (status === "normal" || status === "offline") continue;

      alerts.push({
        id: `reading-${pondId}-${parameter.key}-${timestamp.getTime()}`,
        farmId: farm.id,
        pondId,
        farmName: farm.name,
        pond: pond.name,
        status,
        riskLabel: status === "critical" ? "Severe risk" : "Moderate risk",
        parameter: parameter.label,
        message: buildReadingMessage(parameter, value),
        trend: status === "critical" ? "Critical reading" : "Monitor reading",
        displayTime: timestamp.toLocaleString(),
        date: getAlertDateKey(timestamp),
        daysAgo: Math.max(0, Math.ceil((nowMs - timestamp.getTime()) / 86400000)),
        createdAt: timestamp.toISOString(),
      });
    }
  }
  return alerts;
}

export function normalizeStoredAlerts(items, farms, now = new Date()) {
  return items.map((alert) => {
    const farmId = alert.farmId ?? alert.farm_id;
    const pondId = alert.pondId ?? alert.pond_id;
    const normalizedFarmId = farmId == null ? farmId : String(farmId).replace(/^farm_/, "");
    const normalizedPondId = pondId == null ? pondId : String(pondId).replace(/^pond_/, "");
    const farm = farms.find((item) => String(item.id) === String(normalizedFarmId));
    const pond = farm?.ponds.find((item) => String(item.id) === String(normalizedPondId));
    const timestamp = getAlertTimestamp(alert.createdAt ?? alert.created_at);
    const alertLevel = String(alert.status ?? alert.alertLevel ?? alert.alert_level ?? "moderate").toLowerCase();
    const status = ({ low: "normal", medium: "moderate", high: "critical" })[alertLevel] ?? alertLevel;
    const ageMs = timestamp ? now.getTime() - timestamp.getTime() : null;
    return {
      ...alert,
      farmId: normalizedFarmId,
      pondId: normalizedPondId,
      status,
      isResolved: Boolean(alert.isResolved ?? alert.is_resolved),
      farmName: farm?.name ?? alert.farmName ?? alert.farm_name ?? "",
      pond: alert.pond ?? alert.pondName ?? pond?.name ?? "",
      message: alert.message ?? alert.alertMessage ?? alert.alert_message ?? "",
      displayTime: timestamp ? timestamp.toLocaleString() : "Time unavailable",
      date: timestamp ? getAlertDateKey(timestamp) : "",
      daysAgo: ageMs == null ? null : Math.max(0, Math.ceil(ageMs / 86400000)),
      createdAt: timestamp?.toISOString() ?? null,
    };
  });
}
