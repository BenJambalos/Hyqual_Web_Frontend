const chartColors = {
  normal: "#1f9d6e",
  critical: "#dc2626",
  warning: "#f59e0b",
  offline: "#6b7280",
};

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
