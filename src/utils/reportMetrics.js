const PARAMETERS = [
  { key: "temp", label: "Temperature" },
  { key: "ph", label: "pH" },
  { key: "do", label: "Dissolved oxygen" },
  { key: "sal", label: "Salinity" },
];

const RISK_CLASSES = ["Low", "Moderate", "High"];

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function divide(numerator, denominator) {
  return denominator ? numerator / denominator : null;
}

function percent(numerator, denominator) {
  const result = divide(numerator, denominator);
  return result == null ? null : result * 100;
}

export function computeSensorAccuracy(samples = []) {
  const rows = Array.isArray(samples) ? samples : [];

  return PARAMETERS.map(({ key, label }) => {
    const pairs = rows
      .filter((sample) => sample?.parameter === key)
      .map((sample) => ({
        reference: finiteNumber(sample.reference),
        measured: finiteNumber(sample.measured),
      }))
      .filter((sample) => sample.reference != null && sample.measured != null);
    const errors = pairs.map(({ reference, measured }) => measured - reference);
    const percentageErrors = pairs
      .filter(({ reference }) => reference !== 0)
      .map(({ reference, measured }) => ((measured - reference) / reference) * 100);

    return {
      parameter: key,
      label,
      sampleCount: pairs.length,
      ae: mean(errors),
      pe: mean(percentageErrors),
      mae: mean(errors.map(Math.abs)),
    };
  });
}

export function computeRandomForestMetrics(samples = []) {
  const rows = (Array.isArray(samples) ? samples : []).filter(
    (sample) => RISK_CLASSES.includes(sample?.actual) && RISK_CLASSES.includes(sample?.predicted)
  );
  const correctCount = rows.filter((sample) => sample.actual === sample.predicted).length;

  return {
    sampleCount: rows.length,
    accuracy: percent(correctCount, rows.length),
    byClass: RISK_CLASSES.map((riskClass) => {
      const truePositive = rows.filter((sample) => sample.actual === riskClass && sample.predicted === riskClass).length;
      const falsePositive = rows.filter((sample) => sample.actual !== riskClass && sample.predicted === riskClass).length;
      const falseNegative = rows.filter((sample) => sample.actual === riskClass && sample.predicted !== riskClass).length;
      const trueNegative = rows.length - truePositive - falsePositive - falseNegative;
      const precision = divide(truePositive, truePositive + falsePositive);
      const recall = divide(truePositive, truePositive + falseNegative);

      return {
        riskClass,
        accuracy: percent(truePositive + trueNegative, rows.length),
        precision: precision == null ? null : precision * 100,
        recall: recall == null ? null : recall * 100,
        f1: precision == null || recall == null || precision + recall === 0
          ? null
          : (2 * precision * recall / (precision + recall)) * 100,
      };
    }),
  };
}

export function computeArimaMetrics(samples = []) {
  const rows = (Array.isArray(samples) ? samples : []).filter(
    (sample) => PARAMETERS.some(({ key }) => key === sample?.parameter)
  );

  return PARAMETERS.map(({ key, label }) => {
    const pairs = rows
      .filter((sample) => sample.parameter === key)
      .map((sample) => ({ actual: finiteNumber(sample.actual), forecast: finiteNumber(sample.forecast) }))
      .filter((sample) => sample.actual != null && sample.forecast != null);
    const errors = pairs.map(({ actual, forecast }) => forecast - actual);
    const percentageErrors = pairs
      .filter(({ actual }) => actual !== 0)
      .map(({ actual, forecast }) => Math.abs((forecast - actual) / actual) * 100);

    return {
      parameter: key,
      label,
      sampleCount: pairs.length,
      mae: mean(errors.map(Math.abs)),
      rmse: errors.length ? Math.sqrt(mean(errors.map((error) => error ** 2))) : null,
      mape: mean(percentageErrors),
    };
  });
}

export function computeHybridWarningAccuracy(scenarios = []) {
  const rows = Array.isArray(scenarios) ? scenarios.filter(
    (scenario) => typeof scenario?.expected === "string" && typeof scenario?.predicted === "string"
  ) : [];
  const correctCount = rows.filter(
    (scenario) => scenario.expected.trim().toLowerCase() === scenario.predicted.trim().toLowerCase()
  ).length;

  return { correctCount, totalCount: rows.length, accuracy: percent(correctCount, rows.length) };
}

export function computeSystemReliability(reliability = {}) {
  const metrics = [
    { key: "wirelessTransmission", label: "Wireless transmission" },
    { key: "cloudSync", label: "Cloud sync" },
    { key: "uptime", label: "Uptime" },
    { key: "dataPreservation", label: "Data preservation" },
  ];

  return metrics.map(({ key, label }) => {
    const result = reliability?.[key] || {};
    const successful = finiteNumber(result.successful);
    const total = finiteNumber(result.total);

    return {
      key,
      label,
      successful,
      total,
      percent: successful == null || total == null ? null : percent(successful, total),
    };
  });
}

export function computeIsoWeightedMean(criteria = []) {
  const rows = Array.isArray(criteria) ? criteria : [];
  const results = rows.map((criterion) => {
    const ratings = (Array.isArray(criterion?.ratings) ? criterion.ratings : [])
      .map((rating) => ({ score: finiteNumber(rating?.score), weight: finiteNumber(rating?.weight) }))
      .filter(({ score, weight }) => score >= 1 && score <= 5 && weight > 0);
    const totalWeight = ratings.reduce((sum, rating) => sum + rating.weight, 0);
    const weightedMean = totalWeight
      ? ratings.reduce((sum, rating) => sum + rating.score * rating.weight, 0) / totalWeight
      : null;

    return {
      criterion: criterion?.criterion || "Unnamed criterion",
      responseCount: ratings.length,
      totalWeight,
      weightedMean,
    };
  });
  const allRatings = rows.flatMap((criterion) =>
    (Array.isArray(criterion?.ratings) ? criterion.ratings : [])
      .map((rating) => ({ score: finiteNumber(rating?.score), weight: finiteNumber(rating?.weight) }))
      .filter(({ score, weight }) => score >= 1 && score <= 5 && weight > 0)
  );
  const totalWeight = allRatings.reduce((sum, rating) => sum + rating.weight, 0);

  return {
    criteria: results,
    overall: totalWeight
      ? allRatings.reduce((sum, rating) => sum + rating.score * rating.weight, 0) / totalWeight
      : null,
  };
}