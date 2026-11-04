import { getParamStatus } from "./thresholds";

const REPORT_DEFINITIONS = {
  1: { title: "Weekly Summary Report", period: "week" },
  2: { title: "Weekly Summary Report", period: "week" },
  3: { title: "Daily Summary Report", period: "day" },
  4: { title: "Daily Summary Report", period: "day" },
};

const paramMeta = {
  temperature: { label: "Water Temperature", unit: "°C", key: "temperature", apiKey: "temperature", thresholdKey: "temp" },
  phLevel: { label: "pH Level", unit: "", key: "phLevel", apiKey: "ph", thresholdKey: "ph" },
  dissolvedOxygen: { label: "Dissolved Oxygen (DO)", unit: "mg/L", key: "dissolvedOxygen", apiKey: "dissolvedOxygen", thresholdKey: "do" },
  salinity: { label: "Salinity", unit: "ppt", key: "salinity", apiKey: "salinity", thresholdKey: "sal" },
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

function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
}

function formatReportDate(date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
}

function formatDateRange(start, end) {
    if (start.getFullYear() !== end.getFullYear()) {
      return `${formatReportDate(start)} - ${formatReportDate(end)}`;
    }
    if (start.getMonth() !== end.getMonth()) {
      const startLabel = new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
      }).format(start);
      return `${startLabel} - ${formatReportDate(end)}`;
    }
    const month = new Intl.DateTimeFormat("en-US", {
      month: "long",
    }).format(start);
    return `${month} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
}

export function getReportPeriod(reportId, now = new Date()) {
    const definition = REPORT_DEFINITIONS[reportId];
    if (!definition) return null;

    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (definition.period === "week") {
      const daysSinceMonday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - daysSinceMonday);
    }
    const endExclusive = new Date(start);
    endExclusive.setDate(endExclusive.getDate() + (definition.period === "week" ? 7 : 1));
    const end = new Date(endExclusive);
    end.setDate(end.getDate() - 1);

    return {
      start,
      endExclusive,
      dateRange: definition.period === "week"
        ? formatDateRange(start, end)
        : formatReportDate(start),
      generatedDate: formatReportDate(now),
      reportId: `HQ-${dateKey(start)}${definition.period === "week" ? "W" : "D"}`,
    };
}

function buildPondReport(pond, liveHistory = [], aggregatePond, aggregateData) {
  const pondHistory = liveHistory.filter((row) => String(row.pondId) === String(pond.id));
  const rows = liveRowsToReportRows(pondHistory);

  const parameters = Object.values(paramMeta).map((meta) => {
    const metric = aggregatePond?.[meta.apiKey];
    const values = rows.map((row) => row[meta.key]).filter((value) => value != null);
    const averageValue = aggregateData
      ? metric?.average
      : values.length ? average(values) : null;
    const minValue = aggregateData ? metric?.min : values.length ? Math.min(...values) : null;
    const maxValue = aggregateData ? metric?.max : values.length ? Math.max(...values) : null;
    const sampleCount = aggregateData ? metric?.count || 0 : values.length;
    if (averageValue == null) {
      return { parameter: meta.label, sampleCount, average: "—", min: "—", max: "—", status: "offline" };
    }

    return {
      parameter: meta.label,
      sampleCount,
      average: formatValue(averageValue, meta.unit),
      min: formatValue(minValue, meta.unit),
      max: formatValue(maxValue, meta.unit),
      status: getParamStatus(meta.thresholdKey, averageValue),
    };
  });

  const incidents = [];
  const reportIncidents = aggregateData
    ? (aggregateData.incidents || []).filter((incident) => String(incident.pondId) === String(pond.id))
    : rows.flatMap((row) => Object.values(paramMeta)
      .filter((meta) => row[meta.key] != null)
      .map((meta) => ({
        parameter: meta.apiKey === "ph" ? "ph" : meta.apiKey,
        value: row[meta.key],
        recordedAt: row.recordedAt,
      }))
      .filter((incident) => {
        const meta = Object.values(paramMeta).find((item) => item.apiKey === incident.parameter);
        return getParamStatus(meta.thresholdKey, incident.value) !== "normal";
      }));
  reportIncidents.forEach((incident) => {
    const meta = Object.values(paramMeta).find((item) => item.apiKey === incident.parameter);
    if (!meta) return;
    const status = getParamStatus(meta.thresholdKey, incident.value);
    const value = formatValue(incident.value, meta.unit);
    incidents.push({
      timestamp: incident.recordedAt.replace("T", " ").replace("Z", ""),
      parameter: meta.label,
      value,
      description: `${meta.label} reading of ${value} flagged ${status}.`,
    });
  });

  return { pondName: pond.name, parameters, incidents };
}

export function getReportData(reportId, scope = {}, liveHistory = [], farmData = [], now = new Date(), aggregateData = null) {
  const definition = REPORT_DEFINITIONS[reportId];
  if (!definition) return null;
  const period = getReportPeriod(reportId, now);
  const periodHistory = liveHistory.filter((row) => {
    const timestamp = new Date(row.createdAt).getTime();
    return Number.isFinite(timestamp)
      && timestamp >= period.start.getTime()
      && timestamp < period.endExclusive.getTime();
  });

  const targetFarms = scope.farmId
    ? farmData.filter((farm) => String(farm.id) === String(scope.farmId))
    : farmData;
  const aggregateByPond = new Map(
    (aggregateData?.ponds || []).map((pond) => [String(pond.pondId), pond])
  );

  const farmReports = targetFarms.map((farm) => {
    const targetPonds = scope.pondId
      ? farm.ponds.filter((pond) => String(pond.id) === String(scope.pondId))
      : farm.ponds;
    const ponds = targetPonds.map((pond) => buildPondReport(
      pond,
      periodHistory,
      aggregateByPond.get(String(pond.id)),
      aggregateData,
    ));
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

  return {
    title: definition.title,
    averageLabel: definition.period === "week" ? "Weekly Avg" : "Daily Avg",
    dateRange: period.dateRange,
    generatedDate: period.generatedDate,
    preparedFor: "BFAR Oriental Mindoro",
    reportId: period.reportId,
    summary,
    farms: farmReports,
    isScoped: Boolean(scope.farmId),
  };
}
