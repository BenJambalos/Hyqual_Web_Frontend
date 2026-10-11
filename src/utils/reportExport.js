import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { logAuditEvent } from "./auditLog";

// Turns the nested report object (farms -> ponds -> parameters) into flat rows,
// since CSV/XLSX/tables all want flat data, not nested objects.
function flattenComplianceRows(report) {
  const rows = [];
  report.farms.forEach((farm) => {
    farm.ponds.forEach((pond) => {
      pond.parameters.forEach((param) => {
        rows.push({
          farm: farm.farmName,
          owner: farm.owner,
          location: farm.location,
          pond: pond.pondName,
          parameter: param.parameter,
          weeklyAvg: param.weeklyAvg,
          min: param.min,
          max: param.max,
          status: param.status,
        });
      });
    });
  });
  return rows;
}

function flattenIncidentRows(report) {
  const rows = [];
  report.farms.forEach((farm) => {
    farm.ponds.forEach((pond) => {
      pond.incidents.forEach((inc) => {
        rows.push({
          farm: farm.farmName,
          pond: pond.pondName,
          timestamp: inc.timestamp,
          parameter: inc.parameter,
          value: inc.value,
          description: inc.description,
        });
      });
    });
  });
  return rows;
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
  let y = 18;

  doc.setFontSize(16);
  doc.text(report.title, 105, y, { align: "center" });
  y += 7;

  doc.setFontSize(11);
  doc.text(report.dateRange, 105, y, { align: "center" });
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated: ${report.generatedDate}  |  Prepared for ${report.preparedFor}  |  Report ID: ${report.reportId}`,
    105,
    y,
    { align: "center" }
  );
  doc.setTextColor(0);
  y += 10;

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
      autoTable(doc, {
        startY: y + 3,
        head: [[pond.pondName, "Weekly Avg", "Min", "Max", "Status"]],
        body: pond.parameters.map((p) => [p.parameter, p.weeklyAvg, p.min, p.max, p.status.toUpperCase()]),
        headStyles: { fillColor: [55, 65, 81] },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 3;

      if (pond.incidents.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Timestamp", "Parameter", "Value", "Description"]],
          body: pond.incidents.map((inc) => [inc.timestamp, inc.parameter, inc.value, inc.description]),
          headStyles: { fillColor: [220, 38, 38] },
          styles: { fontSize: 7 },
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

  doc.save(`${safeFilename(report)}.pdf`);
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------
export function exportReportAsCSV(report) {
  const complianceRows = flattenComplianceRows(report);
  const incidentRows = flattenIncidentRows(report);
  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;

  let csv = `${escape(report.title)},${escape(report.dateRange)}\n`;
  csv += `Generated,${escape(report.generatedDate)},Prepared for,${escape(report.preparedFor)},Report ID,${escape(report.reportId)}\n\n`;

  csv += "PARAMETER COMPLIANCE\n";
  csv += ["Farm", "Owner", "Location", "Pond", "Parameter", "Weekly Avg", "Min", "Max", "Status"].map(escape).join(",") + "\n";
  complianceRows.forEach((r) => {
    csv += [r.farm, r.owner, r.location, r.pond, r.parameter, r.weeklyAvg, r.min, r.max, r.status].map(escape).join(",") + "\n";
  });

  if (incidentRows.length > 0) {
    csv += "\nINCIDENT & CRITICAL EVENT LOGS\n";
    csv += ["Farm", "Pond", "Timestamp", "Parameter", "Value", "Description"].map(escape).join(",") + "\n";
    incidentRows.forEach((r) => {
      csv += [r.farm, r.pond, r.timestamp, r.parameter, r.value, r.description].map(escape).join(",") + "\n";
    });
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${safeFilename(report)}.csv`);
}

// ---------------------------------------------------------------------------
// XLSX
// ---------------------------------------------------------------------------
export function exportReportAsXLSX(report) {
  const complianceRows = flattenComplianceRows(report).map((r) => ({
    Farm: r.farm,
    Owner: r.owner,
    Location: r.location,
    Pond: r.pond,
    Parameter: r.parameter,
    "Weekly Avg": r.weeklyAvg,
    Min: r.min,
    Max: r.max,
    Status: r.status.toUpperCase(),
  }));

  const incidentRows = flattenIncidentRows(report).map((r) => ({
    Farm: r.farm,
    Pond: r.pond,
    Timestamp: r.timestamp,
    Parameter: r.parameter,
    Value: r.value,
    Description: r.description,
  }));

    const wb = XLSX.utils.book_new();

    // Built as a plain grid (rows of cells) instead of from objects — since the
    // metadata and the summary counts don't share the same shape, mixing them
    // through json_to_sheet was producing mismatched, gappy columns.
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

  const complianceSheet = XLSX.utils.json_to_sheet(complianceRows);
  XLSX.utils.book_append_sheet(wb, complianceSheet, "Compliance");

  if (incidentRows.length > 0) {
    const incidentSheet = XLSX.utils.json_to_sheet(incidentRows);
    XLSX.utils.book_append_sheet(wb, incidentSheet, "Incidents");
  }

  XLSX.writeFile(wb, `${safeFilename(report)}.xlsx`);
}

// ---------------------------------------------------------------------------
// Single entry point — call this one function, pass whichever format was picked
// ---------------------------------------------------------------------------
export function exportReport(report, format) {
  if (format === "PDF") exportReportAsPDF(report);
  else if (format === "CSV") exportReportAsCSV(report);
  else if (format === "XLSX") exportReportAsXLSX(report);
  else return;

  void logAuditEvent({
    type: "export",
    action: "exported report",
    detail: `${report.title} (${format})`,
  });
}