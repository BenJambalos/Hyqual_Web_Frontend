import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import logoIcon from "../assets/hyqual-logo-icon.png?inline";
import { logAuditEvent } from "./auditLog";
import {
  getIncidentParameterValue,
  REPORT_INCIDENT_PARAMETER_COLUMNS,
} from "./reportPreview";

function getFarmComplianceRows(farm) {
  return farm.ponds.flatMap((pond) => pond.parameters.map((param) => ({
    farm: farm.farmName,
    owner: farm.owner,
    location: farm.location,
    pond: pond.pondName,
    parameter: param.parameter,
    sampleCount: param.sampleCount,
    average: param.average,
    min: param.min,
    max: param.max,
    status: param.status,
  })));
}

function getFarmIncidentRows(farm) {
  return farm.ponds.flatMap((pond) => pond.incidents.map((inc) => ({
    farm: farm.farmName,
    pond: pond.pondName,
    timestamp: inc.timestamp,
    ...Object.fromEntries(REPORT_INCIDENT_PARAMETER_COLUMNS.map((column) => [
      column.key,
      getIncidentParameterValue(inc, column.key),
    ])),
    description: inc.description,
  })));
}

function getUniqueSheetName(name, usedNames) {
  const baseName = String(name || "Farm")
    .replace(/[\u002f\\?*:]/g, " ")
    .replaceAll("[", " ")
    .replaceAll("]", " ")
    .replace(/^'+|'+$/g, "")
    .trim() || "Farm";
  let candidate = baseName.slice(0, 31);
  let suffixNumber = 1;

  while (usedNames.has(candidate.toLowerCase())) {
    suffixNumber += 1;
    const suffix = ` (${suffixNumber})`;
    candidate = `${baseName.slice(0, 31 - suffix.length)}${suffix}`;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function safeFilename(report) {
  return `${report.title.replace(/\s+/g, "_")}_${report.reportId}`;
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------
export function exportReportAsPDF(report) {
  const doc = new jsPDF();
  doc.addImage(logoIcon, "PNG", 96, 8, 18, 18);
  let y = 33;

  doc.setFontSize(16);
  doc.text(report.title, 105, y, { align: "center" });
  y += 7;

  doc.setFontSize(11);
  doc.text(report.dateRange, 105, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.text(`Farms in Report: ${report.summary.farmsInReport}`, 14, y);
  doc.text(`Normal: ${report.summary.normalOverall}`, 80, y);
  doc.text(`Moderate: ${report.summary.moderateOverall}`, 120, y);
  doc.text(`Critical: ${report.summary.criticalOverall}`, 160, y);
  y += 8;

  report.farms.forEach((farm) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(`${farm.farmName} (${farm.owner}) - ${farm.location}`, 14, y);
    doc.setFont(undefined, "normal");
    y += 3;

    farm.ponds.forEach((pond) => {
      if (y > 260) {
        doc.addPage();
        y = 18;
      }

      const pondHeading = `${farm.farmName} - ${pond.pondName}`;
      doc.setFillColor(13, 92, 70);
      doc.rect(14, y, 182, 8, "F");
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255);
      doc.text(pondHeading, 17, y + 5.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(0);

      autoTable(doc, {
        startY: y + 10,
        head: [["Parameter", "Samples", report.averageLabel, "Min", "Max", "Status"]],
        body: pond.parameters.map((p) => [p.parameter, p.sampleCount, p.average, p.min, p.max, p.status.toUpperCase()]),
        headStyles: { fillColor: [13, 92, 70] },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 3;

      if (pond.incidents.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [[
            "Timestamp",
            ...REPORT_INCIDENT_PARAMETER_COLUMNS.map((column) => column.label),
            "Alert Description and Risk",
          ]],
          body: pond.incidents.map((inc) => [
            inc.timestamp,
            ...REPORT_INCIDENT_PARAMETER_COLUMNS.map((column) => getIncidentParameterValue(inc, column.key)),
            inc.description,
          ]),
          headStyles: { fillColor: [13, 92, 70] },
          styles: { fontSize: 6 },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      if (y > 260) {
        doc.addPage();
        y = 18;
      }
    });

    y += 4;
  });

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated: ${report.generatedDate}  |  Prepared for ${report.preparedFor}  |  Report ID: ${report.reportId}`,
    105,
    doc.internal.pageSize.getHeight() - 10,
    { align: "center" }
  );
  doc.setTextColor(0);

  return doc.output("blob");
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
export function exportReportAsCSV(report) {
  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;

  let csv = `${escape(report.title)},${escape(report.dateRange)}\n`;
  csv += `Generated,${escape(report.generatedDate)},Prepared for,${escape(report.preparedFor)},Report ID,${escape(report.reportId)}\n\n`;

  csv += "PARAMETER COMPLIANCE\n";
  report.farms.forEach((farm) => {
    csv += `\nFARM,${escape(farm.farmName)}\n`;
    csv += `OWNER,${escape(farm.owner)},LOCATION,${escape(farm.location)}\n`;
    csv += ["Farm", "Owner", "Location", "Pond", "Parameter", "Samples", report.averageLabel, "Min", "Max", "Status"].map(escape).join(",") + "\n";
    getFarmComplianceRows(farm).forEach((r) => {
      csv += [r.farm, r.owner, r.location, r.pond, r.parameter, r.sampleCount, r.average, r.min, r.max, r.status].map(escape).join(",") + "\n";
    });
  });

  if (report.farms.some((farm) => getFarmIncidentRows(farm).length > 0)) {
    csv += "\nINCIDENT & CRITICAL EVENT LOGS\n";
    report.farms.forEach((farm) => {
      const incidentRows = getFarmIncidentRows(farm);
      if (incidentRows.length === 0) return;

      csv += `\nFARM,${escape(farm.farmName)}\n`;
      csv += [
        "Farm",
        "Pond",
        "Timestamp",
        ...REPORT_INCIDENT_PARAMETER_COLUMNS.map((column) => column.label),
        "Alert Description and Risk",
      ].map(escape).join(",") + "\n";
      incidentRows.forEach((r) => {
        csv += [
          r.farm,
          r.pond,
          r.timestamp,
          ...REPORT_INCIDENT_PARAMETER_COLUMNS.map((column) => r[column.key]),
          r.description,
        ].map(escape).join(",") + "\n";
      });
    });
  }

  return new Blob([csv], { type: "text/csv;charset=utf-8;" });
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------
export function exportReportAsXLSX(report) {
  const wb = XLSX.utils.book_new();

  const summaryGrid = [
    ["Title", report.title],
    ["Date Range", report.dateRange],
    ["Generated", report.generatedDate],
    ["Prepared For", report.preparedFor],
    ["Report ID", report.reportId],
    [],
    ["Farms in Report", "Normal", "Moderate", "Critical"],
    [report.summary.farmsInReport, report.summary.normalOverall, report.summary.moderateOverall, report.summary.criticalOverall],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryGrid);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  const usedSheetNames = new Set(["summary"]);
  report.farms.forEach((farm) => {
    const complianceRows = getFarmComplianceRows(farm);
    const incidentRows = getFarmIncidentRows(farm);
    const farmGrid = [
      ["Farm", farm.farmName],
      ["Owner", farm.owner],
      ["Location", farm.location],
      [],
      ["PARAMETER COMPLIANCE"],
      ["Farm", "Owner", "Location", "Pond", "Parameter", "Samples", report.averageLabel, "Min", "Max", "Status"],
      ...complianceRows.map((r) => [
        r.farm, r.owner, r.location, r.pond, r.parameter, r.sampleCount,
        r.average, r.min, r.max, r.status.toUpperCase(),
      ]),
    ];

    if (incidentRows.length > 0) {
      farmGrid.push(
        [],
        ["INCIDENT & CRITICAL EVENT LOGS"],
        [
          "Farm",
          "Pond",
          "Timestamp",
          ...REPORT_INCIDENT_PARAMETER_COLUMNS.map((column) => column.label),
          "Alert Description and Risk",
        ],
        ...incidentRows.map((r) => [
          r.farm,
          r.pond,
          r.timestamp,
          ...REPORT_INCIDENT_PARAMETER_COLUMNS.map((column) => r[column.key]),
          r.description,
        ]),
      );
    }

    const farmSheet = XLSX.utils.aoa_to_sheet(farmGrid);
    XLSX.utils.book_append_sheet(wb, farmSheet, getUniqueSheetName(farm.farmName, usedSheetNames));
  });

  const data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function buildReportBlob(report, format) {
  if (format === "PDF") return exportReportAsPDF(report);
  if (format === "CSV") return exportReportAsCSV(report);
  if (format === "XLSX") return exportReportAsXLSX(report);
  throw new Error(`Unsupported report format: ${format}`);
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const sizeInKilobytes = bytes / 1024;
  if (sizeInKilobytes < 1024) return `${sizeInKilobytes.toFixed(1)} KB`;
  return `${(sizeInKilobytes / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Single entry point — call this one function, pass whichever format was picked
// ---------------------------------------------------------------------------
export function exportReport(report, format) {
  const blob = buildReportBlob(report, format);
  const extension = format.toLowerCase();
  triggerDownload(blob, `${safeFilename(report)}.${extension}`);

  void logAuditEvent({
    type: "export",
    action: "exported report",
    detail: `${report.title} (${format})`,
  });
}