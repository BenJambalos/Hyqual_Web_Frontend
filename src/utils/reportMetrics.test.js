import { describe, expect, it } from "vitest";
import {
  computeArimaMetrics,
  computeHybridWarningAccuracy,
  computeIsoWeightedMean,
  computeRandomForestMetrics,
  computeSensorAccuracy,
  computeSystemReliability,
} from "./reportMetrics";

describe("report metric calculations", () => {
  it("calculates signed sensor errors and absolute error by parameter", () => {
    const result = computeSensorAccuracy([
      { parameter: "temp", reference: 10, measured: 11 },
      { parameter: "temp", reference: 8, measured: 7 },
      { parameter: "ph", reference: 0, measured: 1 },
    ]);

    expect(result.find((metric) => metric.parameter === "temp")).toMatchObject({
      sampleCount: 2,
      ae: 0,
      pe: -1.25,
      mae: 1,
    });
    expect(result.find((metric) => metric.parameter === "ph").pe).toBeNull();
  });

  it("calculates overall and one-vs-rest Random Forest classification metrics", () => {
    const result = computeRandomForestMetrics([
      { actual: "Low", predicted: "Low" },
      { actual: "Moderate", predicted: "Low" },
      { actual: "High", predicted: "High" },
    ]);

    expect(result.accuracy).toBeCloseTo(200 / 3);
    expect(result.byClass[0]).toMatchObject({ accuracy: expect.closeTo(200 / 3), precision: 50, recall: 100 });
    expect(result.byClass[0].f1).toBeCloseTo(200 / 3);
  });

  it("calculates ARIMA errors per parameter", () => {
    const result = computeArimaMetrics([
      { parameter: "temp", actual: 2, forecast: 1 },
      { parameter: "temp", actual: 4, forecast: 5 },
    ]);

    expect(result[0]).toMatchObject({ sampleCount: 2, mae: 1, rmse: 1, mape: 37.5 });
  });

  it("calculates matching hybrid statuses and reliability percentages", () => {
    expect(computeHybridWarningAccuracy([
      { expected: "High", predicted: "high" },
      { expected: "Low", predicted: "Moderate" },
    ])).toEqual({ correctCount: 1, totalCount: 2, accuracy: 50 });
    expect(computeSystemReliability({ wirelessTransmission: { successful: 9, total: 10 } })[0].percent).toBe(90);
  });

  it("calculates weighted Likert means overall and by criterion", () => {
    const result = computeIsoWeightedMean([
      { criterion: "Usability", ratings: [{ score: 4, weight: 2 }, { score: 2, weight: 1 }] },
      { criterion: "Reliability", ratings: [{ score: 5, weight: 1 }] },
    ]);

    expect(result.criteria[0].weightedMean).toBeCloseTo(10 / 3);
    expect(result.overall).toBe(3.75);
  });
});