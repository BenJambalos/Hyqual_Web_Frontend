import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildReportBlob, formatFileSize } from "./reportExport";

const report = {
  title: "Daily Summary Report",
  averageLabel: "Daily Avg",
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

const farmData = [
  {
    farmName: "North Farm",
    owner: "Owner North",
    location: "North location",
    ponds: [{
      pondName: "Pond A",
      parameters: [{
        parameter: "Water Temperature",
        sampleCount: 2,
        average: "28.00 °C",
        min: "27.00 °C",
        max: "29.00 °C",
        status: "normal",
      }],
      incidents: [{
        timestamp: "November 4, 2026 9:00AM",
        parameter: "Water Temperature",
        parameterKey: "temperature",
        value: "30.00 °C",
        description: "Reading flagged critical.",
      }],
    }],
  },
  {
    farmName: "South Farm",
    owner: "Owner South",
    location: "South location",
    ponds: [{
      pondName: "Pond B",
      parameters: [{
        parameter: "pH Level",
        sampleCount: 3,
        average: "7.20",
        min: "7.00",
        max: "7.40",
        status: "normal",
      }],
      incidents: [],
    }],
  },
];

describe("report export file metadata", () => {
  it.each(["PDF", "CSV", "XLSX"])("builds a %s blob with a measurable file size", (format) => {
    const blob = buildReportBlob(report, format);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("embeds the report preview logo in PDF exports", async () => {
    const pdf = await buildReportBlob(report, "PDF").text();

    expect(pdf).toContain("/Subtype /Image");
  });

  it("formats file sizes for report cards", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("uses the report's daily average label in CSV exports", async () => {
    const blob = buildReportBlob({
      ...report,
      farms: [{
        farmName: "Farm",
        owner: "Owner",
        location: "Location",
        ponds: [{
          pondName: "Pond",
          parameters: [{
            parameter: "Water Temperature",
            sampleCount: 4,
            average: "28.00 °C",
            min: "26.00 °C",
            max: "30.00 °C",
            status: "normal",
          }],
          incidents: [],
        }],
      }],
    }, "CSV");

    await expect(blob.text()).resolves.toContain('"Samples","Daily Avg","Min"');
    await expect(blob.text()).resolves.toContain('"4","28.00 °C"');
  });

  it("groups CSV data into labeled farm sections", async () => {
    const blob = buildReportBlob({ ...report, farms: farmData }, "CSV");
    const csv = await blob.text();

    expect(csv.indexOf('FARM,"North Farm"')).toBeLessThan(csv.indexOf('FARM,"South Farm"'));
    expect(csv).toContain('"North Farm","Owner North","North location","Pond A"');
    expect(csv).toContain('"South Farm","Owner South","South location","Pond B"');
    expect(csv).toContain(
      'FARM,"North Farm"\n"Farm","Pond","Timestamp","pH","Dissolved Oxygen","Temperature","Salinity","Alert Description and Risk"',
    );
    expect(csv).toContain(
      '"North Farm","Pond A","November 4, 2026 9:00AM","—","—","30.00 °C","—","Reading flagged critical."',
    );
  });

  it("creates a separate Excel worksheet for each farm", async () => {
    const blob = buildReportBlob({ ...report, farms: farmData }, "XLSX");
    const workbook = XLSX.read(await blob.arrayBuffer(), { type: "array" });

    expect(workbook.SheetNames).toEqual(["Summary", "North Farm", "South Farm"]);
    const northFarmRows = XLSX.utils.sheet_to_json(workbook.Sheets["North Farm"], { header: 1 });
    const southFarmRows = XLSX.utils.sheet_to_json(workbook.Sheets["South Farm"], { header: 1 });
    expect(northFarmRows).toContainEqual(["PARAMETER COMPLIANCE"]);
    expect(northFarmRows).toContainEqual(["INCIDENT & CRITICAL EVENT LOGS"]);
    expect(northFarmRows).toContainEqual([
      "Farm", "Pond", "Timestamp", "pH", "Dissolved Oxygen", "Temperature", "Salinity", "Alert Description and Risk",
    ]);
    expect(northFarmRows).toContainEqual([
      "North Farm", "Pond A", "November 4, 2026 9:00AM", "—", "—", "30.00 °C", "—", "Reading flagged critical.",
    ]);
    expect(northFarmRows.some((row) => row.includes("Pond A"))).toBe(true);
    expect(southFarmRows.some((row) => row.includes("Pond B"))).toBe(true);
    expect(southFarmRows.some((row) => row.includes("Pond A"))).toBe(false);
  });
});
