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
        { createdAt: "2026-11-04T06:00:00", temp: 25 },
        { createdAt: "2026-11-03T06:00:00", temp: 10 },
        { createdAt: "2026-08-04T06:00:00", temp: 40 },
      ],
      [{ id: 3, name: "Farm", ponds: [{ id: "A", name: "Pond" }] }],
      now,
    );

    expect(report.dateRange).toBe("November 4, 2026");
    expect(report.farms[0].ponds[0].parameters[0].weeklyAvg).toBe("25.00 °C");
  });
});
