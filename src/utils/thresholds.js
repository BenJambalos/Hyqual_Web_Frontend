export const THRESHOLDS = {
  temp: { normalMin: 26, normalMax: 32, moderateMin: 24, moderateMax: 34 },
  ph: { normalMin: 7.5, normalMax: 8.5, moderateMin: 7.0, moderateMax: 9.0 },
  do: { normalMin: 5, normalMax: Infinity, moderateMin: 3, moderateMax: Infinity },
  sal: { normalMin: 10, normalMax: 25, moderateMin: 5, moderateMax: 30 },
};

export function getParamStatus(param, value) {
  const threshold = THRESHOLDS[param];
  if (!threshold) return "normal";
  if (value == null || Number.isNaN(Number(value))) return "offline";

  if (value >= threshold.normalMin && value <= threshold.normalMax) return "normal";
  if (value >= threshold.moderateMin && value <= threshold.moderateMax) return "moderate";
  return "critical";
}

export function getOverallStatus(readings) {
  const severity = { normal: 0, offline: 1, moderate: 2, critical: 3 };
  let worst = "normal";

  for (const param of ["temp", "ph", "do", "sal"]) {
    const status = getParamStatus(param, readings[param]);
    if (severity[status] > severity[worst]) worst = status;
  }

  return worst;
}
