const chartColors = {
  normal: "#1f9d6e",
  critical: "#dc2626",
  warning: "#f59e0b",
  offline: "#6b7280",
};

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getHistoryDateRange(history) {
  const bounds = history.reduce((result, reading) => {
    if (!reading.createdAt) return result;
    const date = new Date(reading.createdAt);
    if (Number.isNaN(date.getTime())) return result;
    return {
      first: result.first == null || date < result.first ? date : result.first,
      last: result.last == null || date > result.last ? date : result.last,
    };
  }, { first: null, last: null });

  if (!bounds.first || !bounds.last) return null;
  return { from: formatDateInputValue(bounds.first), to: formatDateInputValue(bounds.last) };
}

export function filterHistoryByDateRange(history, range) {
  if (!range) return history;

  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T23:59:59.999`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return [];

  return history.filter((reading) => {
    if (!reading.createdAt) return false;
    const date = new Date(reading.createdAt);
    return !Number.isNaN(date.getTime()) && date >= from && date <= to;
  });
}

export function formatDateRange(from, to) {
  if (!from || !to) return "";

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return "";

  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
  const yearFormatter = new Intl.DateTimeFormat("en-US", { year: "numeric" });
  const startMonth = monthFormatter.format(start);
  const endMonth = monthFormatter.format(end);
  const startYear = yearFormatter.format(start);
  const endYear = yearFormatter.format(end);

  if (startYear === endYear && startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${endYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${endYear}`;
  }

  return `${startMonth} ${start.getDate()}, ${startYear} - ${endMonth} ${end.getDate()}, ${endYear}`;
}

export function buildAnalytics(history) {
  const groups = history.reduce((result, reading) => {
    const date = new Date(reading.createdAt);
    const key = Number.isNaN(date.getTime())
      ? "Unknown"
      : date.toLocaleDateString([], { month: "short", day: "numeric" });
    const group = result[key] || {
      month: key,
      normal: 0,
      critical: 0,
      warning: 0,
      offline: 0,
    };
    if (reading.status === "normal") group.normal += 1;
    if (reading.status === "critical") group.critical += 1;
    if (reading.status === "moderate") group.warning += 1;
    if (reading.status === "offline") group.offline += 1;
    result[key] = group;
    return result;
  }, {});

  const trend = Object.values(groups).reverse();
  const total = history.length || 1;
  const statuses = [
    { label: "Normal", key: "normal" },
    { label: "Critical", key: "critical" },
    { label: "Warning", key: "moderate" },
    { label: "Offline", key: "offline" },
  ];

  return {
    trend,
    distribution: statuses.map(({ label, key }) => ({
      label,
      key: label === "Warning" ? "warning" : key,
      color: chartColors[label === "Warning" ? "warning" : key],
      percent: Math.round(
        (history.filter((reading) => reading.status === key).length / total) * 100
      ),
    })),
  };
}
