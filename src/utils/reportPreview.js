import { getParamStatus } from "./thresholds";
import { LIVE_DEVICE_TARGET } from "../config/liveDeviceConfig";

const REPORT_DEFINITIONS = {
  1: { title: "Weekly Summary Report", dateRangeLabel: "June 8 - 14, 2026", start: "2026-06-08", end: "2026-06-14", generatedDate: "June 14, 2026", reportId: "HQ-2026-0614A" },
  2: { title: "Weekly Summary Report", dateRangeLabel: "June 4 - 10, 2026", start: "2026-06-04", end: "2026-06-10", generatedDate: "June 10, 2026", reportId: "HQ-2026-0610A" },
  3: { title: "Daily Summary Report", dateRangeLabel: "June 1, 2026", start: "2026-06-01", end: "2026-06-01", generatedDate: "June 01, 2026", reportId: "HQ-2026-0601D" },
  4: { title: "Daily Summary Report", dateRangeLabel: "May 28, 2026", start: "2026-05-28", end: "2026-05-28", generatedDate: "May 28, 2026", reportId: "HQ-2026-0528D" },
};

const paramMeta = {
  temperature: { label: "Water Temperature", unit: "°C", key: "temperature", thresholdKey: "temp" },
  phLevel: { label: "pH Level", unit: "", key: "phLevel", thresholdKey: "ph" },
  dissolvedOxygen: { label: "Dissolved Oxygen (DO)", unit: "mg/L", key: "dissolvedOxygen", thresholdKey: "do" },
  salinity: { label: "Salinity", unit: "ppt", key: "salinity", thresholdKey: "sal" },
};

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatValue(value, unit) {
  return unit ? `${value.toFixed(2)} ${unit}` : value.toFixed(2);
}

function liveRowsToReportRows(liveHistory) {
  return liveHistory
    .filter((row) => row.createdAt)
    .map((row) => ({
      recordedAt: row.createdAt,
      temperature: row.temp,
      phLevel: row.ph,
      dissolvedOxygen: row.do,
      salinity: row.sal,
    }));
}

function buildPondReport(farmId, pond, liveHistory = []) {
  const isLivePond = String(farmId) === String(LIVE_DEVICE_TARGET.farmId)
    && String(pond.id) === String(LIVE_DEVICE_TARGET.pondId);
  const rows = isLivePond && liveHistory.length > 0 ? liveRowsToReportRows(liveHistory) : [];

  const parameters = Object.values(paramMeta).map((meta) => {
    const values = rows.map((row) => row[meta.key]).filter((value) => value != null);
    if (values.length === 0) {
      return { parameter: meta.label, weeklyAvg: "—", min: "—", max: "—", status: "offline" };
    }

    const averageValue = average(values);
    return {
      parameter: meta.label,
      weeklyAvg: formatValue(averageValue, meta.unit),
      min: formatValue(Math.min(...values), meta.unit),
      max: formatValue(Math.max(...values), meta.unit),
      status: getParamStatus(meta.thresholdKey, averageValue),
    };
  });

  const incidents = [];
  rows.forEach((row) => {
    Object.values(paramMeta).forEach((meta) => {
      if (row[meta.key] == null) return;
      const status = getParamStatus(meta.thresholdKey, row[meta.key]);
      if (status !== "normal") {
        incidents.push({
          timestamp: row.recordedAt.replace("T", " ").replace("Z", ""),
          parameter: meta.label,
          value: formatValue(row[meta.key], meta.unit),
          description: `${meta.label} reading of ${formatValue(row[meta.key], meta.unit)} flagged ${status}.`,
        });
      }
    });
  });

  return { pondName: pond.name, parameters, incidents };
}

export function getReportData(reportId, scope = {}, liveHistory = [], farmData = []) {
  const definition = REPORT_DEFINITIONS[reportId];
  if (!definition) return null;

  const targetFarms = scope.farmId
    ? farmData.filter((farm) => String(farm.id) === String(scope.farmId))
    : farmData;

  const farmReports = targetFarms.map((farm) => {
    const targetPonds = scope.pondId
      ? farm.ponds.filter((pond) => String(pond.id) === String(scope.pondId))
      : farm.ponds;
    const ponds = targetPonds.map((pond) => buildPondReport(farm.id, pond, liveHistory));
    const severity = { normal: 0, moderate: 1, critical: 2, offline: 1 };
    const allStatuses = ponds.flatMap((pond) => pond.parameters.map((parameter) => parameter.status));
    const overallStatus = allStatuses.reduce(
      (worst, status) => (severity[status] > severity[worst] ? status : worst),
      "normal"
    );

    return {
      farmId: farm.id,
      farmName: farm.name,
      owner: farm.owner,
      location: farm.location,
      overallStatus,
      ponds,
    };
  });

  const summary = {
    farmsInReport: farmReports.length,
    normalOverall: farmReports.filter((farm) => farm.overallStatus === "normal").length,
    moderateOverall: farmReports.filter((farm) => farm.overallStatus === "moderate").length,
    criticalOverall: farmReports.filter((farm) => farm.overallStatus === "critical").length,
  };

  const liveRows = liveRowsToReportRows(liveHistory);
  const liveDates = liveRows.map((row) => row.recordedAt.slice(0, 10)).sort();

  return {
    title: definition.title,
    dateRange: liveDates.length > 0 ? `${liveDates[0]} - ${liveDates[liveDates.length - 1]}` : definition.dateRangeLabel,
    generatedDate: liveDates.length > 0 ? new Date().toISOString().slice(0, 10) : definition.generatedDate,
    preparedFor: "BFAR Oriental Mindoro",
    reportId: definition.reportId,
    summary,
    farms: farmReports,
    isScoped: Boolean(scope.farmId),
  };
}
