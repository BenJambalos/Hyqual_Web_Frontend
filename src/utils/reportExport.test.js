import { describe, expect, it } from "vitest";
import { buildReportBlob, formatFileSize } from "./reportExport";

const report = {
  title: "Daily Summary Report",
  dateRange: "November 4, 2026",
  generatedDate: "November 4, 2026",
  preparedFor: "BFAR Oriental Mindoro",
  reportId: "HQ-20261104D",
  summary: {
    farmsInReport: 0,
    normalOverall: 0,
    moderateOverall: 0,
    criticalOverall: 0,
  },
  farms: [],
};

describe("report export file metadata", () => {
  it.each(["PDF", "CSV", "XLSX"])("builds a %s blob with a measurable file size", (format) => {
    const blob = buildReportBlob(report, format);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("formats file sizes for report cards", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });
});
