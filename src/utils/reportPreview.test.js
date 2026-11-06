import { describe, expect, it } from "vitest";
import { getReportData, getReportPeriod } from "./reportPreview";

describe("report date periods", () => {
  const now = new Date(2026, 10, 4, 12);

  it("uses the current Monday-to-Sunday week for weekly reports", () => {
    expect(getReportPeriod(1, now)).toMatchObject({
      dateRange: "November 2 - 8, 2026",
      generatedDate: "November 4, 2026",
      reportId: "HQ-20261102W",
    });
  });

  it("uses today's calendar date for daily reports", () => {
    expect(getReportPeriod(3, now)).toMatchObject({
      dateRange: "November 4, 2026",
      generatedDate: "November 4, 2026",
      reportId: "HQ-20261104D",
    });
  });

  it("formats a weekly period that crosses from December into January", () => {
    expect(getReportPeriod(1, new Date(2027, 0, 1, 12))).toMatchObject({
      dateRange: "December 28, 2026 - January 3, 2027",
      generatedDate: "January 1, 2027",
      reportId: "HQ-20261228W",
    });
  });

  it("only calculates report data from readings within the selected period", () => {
    const report = getReportData(
      3,
      {},
      [
        { pondId: 3, createdAt: "2026-11-04T06:00:00", temp: 25 },
        { pondId: 3, createdAt: "2026-11-03T06:00:00", temp: 10 },
        { pondId: 3, createdAt: "2026-08-04T06:00:00", temp: 40 },
      ],
      [{ id: 3, name: "Farm", ponds: [{ id: 3, name: "Pond" }] }],
      now,
    );

    expect(report.dateRange).toBe("November 4, 2026");
    expect(report.farms[0].ponds[0].parameters[0].average).toBe("25.00 °C");
    expect(report.averageLabel).toBe("Daily Avg");
  });

  it("calculates each pond's weekly average from its own readings", () => {
    const report = getReportData(
      3,
      {},
      [
        { pondId: 3, createdAt: "2026-11-04T06:00:00", temp: 25 },
        { pondId: 4, createdAt: "2026-11-04T06:00:00", temp: 35 },
      ],
      [{ id: 2, name: "Farm", ponds: [
        { id: 3, name: "Pond A" },
        { id: 4, name: "Pond B" },
      ] }],
      now,
    );

    expect(report.farms[0].ponds.map((pond) => pond.parameters[0].average))
      .toEqual(["25.00 °C", "35.00 °C"]);
  });

  it("uses complete backend period aggregates instead of capped live history", () => {
    const report = getReportData(
      1,
      {},
      [{ pondId: 3, createdAt: "2026-11-04T06:00:00", temp: 25 }],
      [{ id: 2, name: "Farm", ponds: [{ id: 3, name: "Pond" }] }],
      now,
      {
        ponds: [{
          pondId: "3",
          temperature: { average: 27.5, min: 20, max: 35, count: 100 },
          ph: { average: null, min: null, max: null, count: 0 },
          dissolvedOxygen: { average: 6, min: 5, max: 7, count: 2 },
          salinity: { average: 12, min: 11, max: 13, count: 2 },
        }],
        incidents: [{
          pondId: "3",
          parameter: "temperature",
          value: 20,
          recordedAt: "2026-11-03T08:00:00.000Z",
        }],
      },
    );

    expect(report.averageLabel).toBe("Weekly Avg");
    expect(report.farms[0].ponds[0].parameters[0]).toMatchObject({
      sampleCount: 100,
      average: "27.50 °C",
      min: "20.00 °C",
      max: "35.00 °C",
      status: "normal",
    });
    expect(report.farms[0].ponds[0].parameters[1]).toMatchObject({
      average: "—",
      min: "—",
      max: "—",
      status: "offline",
    });
    expect(report.farms[0].ponds[0].incidents).toHaveLength(1);
  });

  it("scopes a summary report to one farm while retaining every pond on that farm", () => {
    const farms = [
      {
        id: "farm-a",
        name: "Farm A",
        ponds: [{ id: "pond-1", name: "Pond 1" }, { id: "pond-2", name: "Pond 2" }],
      },
      {
        id: "farm-b",
        name: "Farm B",
        ponds: [{ id: "pond-3", name: "Pond 3" }],
      },
    ];
    const report = getReportData(
      1,
      { farmId: "farm-a" },
      [],
      farms,
      now,
      { ponds: [], incidents: [] },
    );

    expect(report.farms.map((farm) => farm.farmName)).toEqual(["Farm A"]);
    expect(report.farms[0].ponds.map((pond) => pond.pondName)).toEqual(["Pond 1", "Pond 2"]);
    expect(report.isScoped).toBe(true);
  });
});
