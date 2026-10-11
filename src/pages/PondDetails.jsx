import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Thermometer, Droplet, Wind, Waves, Download, Calendar, Eye, AlertTriangle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import DateRangeModal from "../components/DateRangeModal";
import ReportPreview from "../components/ReportPreview";
import { THRESHOLDS, getParamStatus, getOverallStatus } from "../utils/thresholds";
import { summaryReports } from "../config/reportDefinitions";
import { getReportData } from "../utils/reportPreview";
import { exportReport } from "../utils/reportExport";
import { useLiveReading } from "../hooks/useLiveReading";
import { useFarms } from "../hooks/useFarms";
import { useAlerts } from "../hooks/useAlerts";
import { LIVE_DEVICE_TARGET } from "../config/liveDeviceConfig";
import { useDeviceStatus } from "../hooks/useDeviceStatus";
import "./Dashboard.css";
import "./FarmDetails.css";
import "./PondDetails.css";

const statusLabel = { normal: "Normal", critical: "Critical", moderate: "Moderate", offline: "Offline" };
const tabs = ["History Logs", "Reports", "Alerts"];

function readingConfig(param) {
  const configs = {
    temp: { icon: Thermometer, label: "Temperature", unit: "°C" },
    ph: { icon: Droplet, label: "pH Level", unit: "pH" },
    do: { icon: Wind, label: "Dissolved O₂", unit: "mg/L" },
    sal: { icon: Waves, label: "Salinity", unit: "ppt" },
  };
  return configs[param];
}

function PondDetails() {
  const { farmId, pondId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("History Logs");
  const [historyFilter, setHistoryFilter] = useState("normal");
  const [showDateModal, setShowDateModal] = useState(false);
  const [previewReportId, setPreviewReportId] = useState(null);

  // Always call hooks unconditionally (React rule) — safe even before the
  // farm/pond-not-found check below, since useLiveReading doesn't depend on them.
  const { reading: liveReading, history: liveHistory, loading: liveLoading } = useLiveReading();
  const { statusReady: deviceStatusReady, deviceOnline } = useDeviceStatus();
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();
  const { alerts, loading: alertsLoading, error: alertsError } = useAlerts();

  if (farmsLoading || alertsLoading) return <p style={{ padding: 40 }}>Loading pond...</p>;
  if (farmsError || alertsError) return <p style={{ padding: 40 }}>Unable to load this pond.</p>;

  const farm = farms.find((item) => String(item.id) === String(farmId));
  const pond = farm?.ponds.find((item) => String(item.id) === String(pondId));

  if (!farm || !pond) return <p style={{ padding: 40 }}>Pond not found.</p>;

  const isLivePond = String(farm.id) === String(LIVE_DEVICE_TARGET.farmId) && String(pond.id) === String(LIVE_DEVICE_TARGET.pondId);

  const staticReadings = { temp: pond.temp, ph: pond.ph, do: pond.do, sal: pond.sal };

  // If this is the pond wired to the real device, use its live data instead of
  // the static dummy values — everything else about the page works unchanged.
  const displayReadings = isLivePond && liveReading ? liveReading : staticReadings;
  const displayStatus = isLivePond && deviceStatusReady && !deviceOnline
    ? "offline"
    : getOverallStatus(displayReadings);

  const displayedHistory = liveHistory;
  const filteredLogs = displayedHistory.filter((log) => log.status === historyFilter);
  const pondAlerts = alerts
    .filter((alert) => String(alert.farmId) === String(farm.id) && String(alert.pondId) === String(pond.id))
    .map((alert) => ({
      ...alert,
      title: alert.title ?? alert.riskLabel ?? "Water quality alert",
      pond: alert.pond ?? pond.name,
      message: alert.message ?? "Review the latest reading.",
      time: alert.displayTime,
    }));

  // Exports exactly what's currently shown in the table (respects the active
  // Normal/Critical/Offline filter), as a real downloadable CSV.
  const handleExport = () => {
    const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;

    let csv = `${escape(farm.name + " | " + pond.name + " - Historical Log")}\n`;
    csv += `${escape("Filter: " + statusLabel[historyFilter])}\n\n`;
    csv += ["Time", "Temp (°C)", "DO (mg/L)", "pH", "Salinity (ppt)", "Status"].map(escape).join(",") + "\n";

    filteredLogs.forEach((log) => {
      csv += [log.time, log.temp, log.do, log.ph, log.sal, statusLabel[log.status]].map(escape).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${farm.name}_${pond.name}_HistoryLog_${historyFilter}.csv`.replace(/\s+/g, "_");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePreviewReport = (report) => {
    setPreviewReportId(report.id);
  };

  const handleDownloadReport = (report) => {
    const format = "PDF";
    const scopedData = getReportData(report.id, { farmId: farm.id, pondId: pond.id }, liveHistory, farms);

    if (!scopedData || scopedData.farms.length === 0) {
      alert("No data available to export for this pond in this report's date range.");
      return;
    }

    exportReport(scopedData, format);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        {previewReportId ? (
          <ReportPreview
            reportId={previewReportId}
            scope={{ farmId: farm.id, pondId: pond.id }}
            farmData={farms}
            onClose={() => setPreviewReportId(null)}
          />
        ) : (
          <>
            <div className="dashboard-header">
              <div>
                <h1>Multi-Farm Monitoring</h1>
                <p className="header-subtext">{farms.length} registered farms</p>
              </div>
            </div>

            <div className="pd-grid">
              {/* LEFT: Pond overview + live readings */}
              <div className="pd-left">
                <div className="farm-summary-card">
                  <div className="farm-summary-top">
                    <h2>
                      {farm.name} | {pond.name}
                      {isLivePond && (
                        <span className="live-badge">
                          {liveLoading ? "Connecting..." : "● LIVE"}
                        </span>
                      )}
                    </h2>
                    <span className={"status-pill status-pill-" + displayStatus}>
                      {statusLabel[displayStatus]}
                    </span>
                  </div>
                  <p>Owner: {farm.owner}</p>
                  <p>Location: {farm.location}</p>
                  <p>Updated {farm.updatedAt}</p>
                </div>

                <h3 className="pd-water-quality-heading">Water Quality</h3>
                <p className="pd-water-quality-subtext">Live readings from IoT sensors · Updated every 5 minutes</p>

                <div className="pd-readings-grid">
                  {["temp", "ph", "do", "sal"].map((param) => {
                    const config = readingConfig(param);
                    const Icon = config.icon;
                    const value = displayReadings[param];
                    const paramStatus = getParamStatus(param, value);
                    const t = THRESHOLDS[param];
                    const rangeMax = t.normalMax === Infinity ? t.normalMin * 2 : t.normalMax;
                    const fillPercent = Math.min(100, Math.max(0, ((value - 0) / (rangeMax - 0)) * 100));
                    const safeLabel =
                      t.normalMax === Infinity ? `Safe: ≥${t.normalMin} ${config.unit}` : `Safe: ${t.normalMin}-${t.normalMax}${config.unit}`;

                    return (
                      <div className={"pd-reading-card pd-reading-card-" + paramStatus} key={param}>
                        <div className="pd-reading-top">
                          <span className="pd-reading-label"><Icon size={14} /> {config.label}</span>
                          <span className={"status-dot status-dot-" + paramStatus} />
                        </div>
                        <h2>{value}</h2>
                        <p className="pd-reading-unit">{config.unit}</p>
                        <div className="pd-reading-bar-track">
                          <div className={"pd-reading-bar-fill pd-reading-bar-" + paramStatus} style={{ width: `${fillPercent}%` }} />
                        </div>
                        <p className="pd-reading-safe">{safeLabel}</p>
                      </div>
                    );
                  })}
                </div>

                <button className="back-btn" onClick={() => navigate(`/multi-farm/${farm.id}`)}>
                  Back
                </button>
              </div>

              {/* RIGHT: Tabs */}
              <div className="pd-right">
                <div className="pd-tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab}
                      className={"pd-tab-btn" + (activeTab === tab ? " pd-tab-btn-active" : "")}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* HISTORY LOGS TAB */}
                {activeTab === "History Logs" && (
                  <div className="pd-panel">
                    <div className="pd-panel-header">
                      <h3>Historical Logs</h3>
                      <div className="pd-panel-actions">
                        <button className="export-log-btn" onClick={handleExport}>
                          <Download size={14} /> Export Log
                        </button>
                        <button className="time-filter-btn custom-btn" onClick={() => setShowDateModal(true)}>
                          <Calendar size={14} /> Custom
                        </button>
                      </div>
                    </div>

                    <div className="filter-pills" style={{ marginBottom: 12 }}>
                      {["normal", "critical", "offline"].map((s) => (
                        <button
                          key={s}
                          className={"filter-pill" + (historyFilter === s ? " filter-pill-active" : "")}
                          onClick={() => setHistoryFilter(s)}
                        >
                          {statusLabel[s]}
                        </button>
                      ))}
                    </div>

                    <p className="pd-log-date">June 27, 2026</p>

                    <div className="pd-log-table">
                      <div className="pd-log-header-row">
                        <span>Time</span>
                        <span>Temp</span>
                        <span>DO</span>
                        <span>pH</span>
                        <span>Salinity</span>
                        <span>Status</span>
                      </div>

                      {filteredLogs.map((log, i) => (
                        <div className="pd-log-row" key={i}>
                          <span>{log.time}</span>
                          <span>{log.temp}</span>
                          <span>{log.do}</span>
                          <span>{log.ph}</span>
                          <span>{log.sal}</span>
                          <span className={"status-text-" + log.status}>{statusLabel[log.status]}</span>
                        </div>
                      ))}

                      {filteredLogs.length === 0 && (
                        <p className="pd-log-empty">No {statusLabel[historyFilter].toLowerCase()} readings logged.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* REPORTS TAB */}
                {activeTab === "Reports" && (
                  <div className="pd-panel">
                    <div className="pd-panel-header">
                      <h3>Summarize reports</h3>
                    </div>

                    {summaryReports.map((report) => (
                      <div className="pd-report-item" key={report.id}>
                        <span className="icon-box icon-box-green">
                          <Download size={16} />
                        </span>
                        <div className="pd-report-info">
                          <p className="pd-report-title">{report.title}</p>
                          <p className="pd-report-range">{report.date} · {report.size}</p>
                        </div>
                        <div className="pd-report-actions">
                          <button className="row-action-btn" onClick={() => handlePreviewReport(report)}>
                            <Eye size={16} />
                          </button>
                          <button className="row-action-btn" onClick={() => handleDownloadReport(report)}>
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ALERTS TAB */}
                {activeTab === "Alerts" && (
                  <div className="pd-panel">
                    <div className="pd-panel-header">
                      <h3>Alert logs</h3>
                    </div>

                    <p className="pd-alert-day-label">Today</p>

                    {pondAlerts.map((alert) => (
                      <div className="pd-alert-item" key={alert.id}>
                        <span className={"icon-box icon-box-" + (alert.status === "moderate" ? "orange" : alert.status === "offline" ? "gray" : "red")}>
                          <AlertTriangle size={18} />
                        </span>
                        <div className="pd-alert-body">
                          <div className="pd-alert-top">
                            <span className="pd-alert-title">{alert.title}</span>
                            <span className={"pd-alert-status-text status-text-" + alert.status}>
                              {alert.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="pd-alert-pond">{alert.pond}</p>
                          <p className="pd-alert-message">
                            {alert.message} {alert.trend && <strong>{alert.trend}</strong>}
                          </p>
                          <p className="pd-alert-time">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {showDateModal && (
        <DateRangeModal onClose={() => setShowDateModal(false)} onApply={() => {}} />
      )}
    </div>
  );
}

export default PondDetails;