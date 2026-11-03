import { useMemo, useState } from "react";
import { Calendar, FileText, Download, ChevronDown, Eye } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Sidebar from "../components/Sidebar";
import DateRangeModal from "../components/DateRangeModal";
import ReportPreview from "../components/ReportPreview";
import { summaryReports, availableFormats } from "../config/reportDefinitions";
import "./ReportsAnalytics.css";
import { getReportData } from "../utils/reportPreview";
import { buildReportBlob, exportReport, formatFileSize } from "../utils/reportExport";
import { useLiveReading } from "../hooks/useLiveReading";
import { useFarms } from "../hooks/useFarms";
import ReportsSection from "../components/ReportsSection";
import { buildAnalytics } from "../utils/reportAnalytics";

const statusFilters = ["All", "Normal", "Critical", "Warning", "Offline"];

const filterKeyMap = { Normal: "normal", Critical: "critical", Warning: "warning", Offline: "offline" };

function ReportsAnalytics() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [showDateModal, setShowDateModal] = useState(false);
  const [, setCustomRange] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [previewReportId, setPreviewReportId] = useState(null);
  const { history: liveHistory } = useLiveReading();
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();
  const { trend: trendData, distribution: statusDistribution } = buildAnalytics(liveHistory);
  const [selectedFormats, setSelectedFormats] = useState(
    Object.fromEntries(summaryReports.map((r) => [r.id, r.defaultFormat]))
  );
  const reportMetadata = useMemo(() => Object.fromEntries(summaryReports.map((report) => {
    const data = getReportData(report.id, {}, liveHistory, farms);
    return [report.id, {
      dateRange: data?.dateRange || "—",
      size: data ? formatFileSize(buildReportBlob(data, selectedFormats[report.id]).size) : "—",
    }];
  })), [farms, liveHistory, selectedFormats]);

  const activeChartKeys =
    activeFilter === "All"
      ? ["normal", "critical", "warning", "offline"]
      : [filterKeyMap[activeFilter]];

  const filteredDistribution =
    activeFilter === "All"
      ? statusDistribution
      : statusDistribution.filter((s) => s.label === activeFilter);

  const handleFormatSelect = (reportId, format) => {
    setSelectedFormats((prev) => ({ ...prev, [reportId]: format }));
    setOpenDropdownId(null);
  };

  const handlePreview = (report) => {
    setPreviewReportId(report.id);
  };

  const handleDownload = (report) => {
    const format = selectedFormats[report.id];
    const fullData = getReportData(report.id, {}, liveHistory, farms);

    if (!fullData) {
      alert("No data available to export for this report yet.");
      return;
    }

    exportReport(fullData, format);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        {farmsLoading ? <p style={{ padding: 40 }}>Loading farms...</p> : farmsError ? <p style={{ padding: 40 }}>Unable to load farms.</p> : (
        previewReportId ? (
          <ReportPreview reportId={previewReportId} farmData={farms} onClose={() => setPreviewReportId(null)} />
        ) : (
          <>
            <div className="dashboard-header">
              <div>
                <h1>Reports &amp; Analytics</h1>
              </div>
            </div>

            <div className="filter-pills" style={{ marginBottom: 20 }}>
              {statusFilters.map((f) => (
                <button
                  key={f}
                  className={"filter-pill" + (activeFilter === f ? " filter-pill-active" : "")}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="reports-grid">
              <div className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <h3>Overall Water Quality Risk Trend</h3>
                    <p>Aggregated across all monitored farms</p>
                  </div>
                  <button className="icon-btn" onClick={() => setShowDateModal(true)}>
                    <Calendar size={16} />
                  </button>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    {activeChartKeys.map((key) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={statusDistribution.find((status) => status.key === key)?.color}
                        fill={statusDistribution.find((status) => status.key === key)?.color}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="distribution-card">
                <h3>Farm status distribution</h3>

                {filteredDistribution.map((s) => (
                  <div className="distribution-row" key={s.label}>
                    <div className="distribution-top">
                      <span>{s.label}</span>
                      <span>{s.percent}%</span>
                    </div>
                    <div className="distribution-bar-track">
                      <div
                        className="distribution-bar-fill"
                        style={{ width: `${s.percent}%`, background: s.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ReportsSection />

            <div className="summary-reports-card">
              <h3>Summary reports</h3>

              {summaryReports.map((report) => (
                <div className="report-item" key={report.id}>
                  <span className="icon-box icon-box-green">
                    <FileText size={18} />
                  </span>

                  <div className="report-info">
                    <p className="report-title">{report.title}</p>
                    <p className="report-meta">
                      Date range: {reportMetadata[report.id]?.dateRange} | File size: {reportMetadata[report.id]?.size}
                    </p>
                  </div>

                  <div className="report-actions">
                    <button className="row-action-btn" onClick={() => handlePreview(report)}>
                      <Eye size={16} />
                    </button>

                    <div className="format-dropdown-wrapper">
                      <button
                        className="format-dropdown-btn"
                        onClick={() => setOpenDropdownId(openDropdownId === report.id ? null : report.id)}
                      >
                        {selectedFormats[report.id]} <ChevronDown size={14} />
                      </button>

                      {openDropdownId === report.id && (
                        <div className="format-dropdown-menu">
                          {availableFormats.map((fmt) => (
                            <button
                              key={fmt}
                              className="format-dropdown-item"
                              onClick={() => handleFormatSelect(report.id, fmt)}
                            >
                              {fmt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button className="download-btn" onClick={() => handleDownload(report)}>
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ))}
      </main>

      {showDateModal && (
        <DateRangeModal
          onClose={() => setShowDateModal(false)}
          onApply={(from, to) => setCustomRange({ from, to })}
        />
      )}
    </div>
  );
}

export default ReportsAnalytics;