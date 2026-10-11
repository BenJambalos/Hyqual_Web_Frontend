import { useEffect, useState } from "react";
import { Calendar, Cpu, LogIn, FileText, UserPlus } from "lucide-react";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import DateRangeModal from "../../components/DateRangeModal";
import { useCollection } from "../../hooks/useCollection";
import { logAuditEvent } from "../../utils/auditLog";
import "../Dashboard.css";
import "./SuperadminOverview.css";
import "./AuditLogs.css";

const timeFilters = [
  { key: "all", label: "All" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

const iconByType = { signin: LogIn, export: FileText, account: UserPlus, device: Cpu };

function getLogDate(log, now) {
  if (log.createdAt?.toDate) return log.createdAt.toDate();
  if (log.createdAt) {
    const parsedDate = new Date(log.createdAt);
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  }
  if (log.date) {
    const parsedDate = new Date(log.date);
    if (!Number.isNaN(parsedDate.getTime())) return parsedDate;
  }
  if (Number.isFinite(log.daysAgo)) return new Date(now - log.daysAgo * 86400000);
  return null;
}

function formatLogDate(log, now) {
  const date = getLogDate(log, now);
  return date ? date.toLocaleString() : log.displayTime || "Time unavailable";
}

function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function AuditLogs() {
  const [activeTimeFilter, setActiveTimeFilter] = useState("all");
  const [showDateModal, setShowDateModal] = useState(false);
  const [customRange, setCustomRange] = useState(null);
  const [now, setNow] = useState(0);
  const { items: auditLogs, loading, error } = useCollection("auditLogs");

  const maxDays = { "24h": 1, "7d": 7, "30d": 30 };

  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    const initialUpdate = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 60000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  const filteredLogs = auditLogs.filter((log) => {
    const logDate = getLogDate(log, now);
    if (activeTimeFilter === "custom" && customRange) {
      if (!logDate) return false;
      const from = new Date(`${customRange.from}T00:00:00`);
      const to = new Date(`${customRange.to}T23:59:59.999`);
      return logDate >= from && logDate <= to;
    }
    if (activeTimeFilter === "all") return true;
    if (!logDate) return false;
    return !now || now - logDate.getTime() <= maxDays[activeTimeFilter] * 86400000;
  }).sort((first, second) => (getLogDate(second, now)?.getTime() || 0) - (getLogDate(first, now)?.getTime() || 0));

  const handleExport = async () => {
    const columns = ["Timestamp", "Actor", "Role", "Action", "Detail"];
    const rows = filteredLogs.map((log) => [
      formatLogDate(log, now),
      log.actor,
      log.actorRole,
      log.action,
      log.detail,
    ]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const downloadUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "hyqual-activity-logs.csv";
    link.click();
    URL.revokeObjectURL(downloadUrl);
    await logAuditEvent({ type: "export", action: "exported activity log", detail: `${filteredLogs.length} records` });
  };

  if (loading) return <p style={{ padding: 40 }}>Loading activity logs...</p>;
  if (error) return <p style={{ padding: 40 }}>Unable to load activity logs.</p>;

  return (
    <div className="dashboard-layout">
      <SuperadminSidebar />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Activity Logs</h1>
            <p className="header-subtext">Audit trail of monitoring activity, notifications, and user actions</p>
          </div>
          <div className="header-actions">
            <span className="superadmin-badge">SUPERADMIN</span>
          </div>
        </div>

        <div className="al-toolbar">
          <div className="time-filter-group">
            {timeFilters.map((f) => (
              <button
                key={f.key}
                className={"time-filter-btn" + (activeTimeFilter === f.key ? " time-filter-active" : "")}
                onClick={() => setActiveTimeFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
            <button className="time-filter-btn custom-btn" onClick={() => setShowDateModal(true)}>
              <Calendar size={14} /> Custom
            </button>
          </div>

          <button className="export-log-btn" onClick={handleExport} disabled={filteredLogs.length === 0}>
            <FileText size={14} /> Export log
          </button>
        </div>

        <div className="al-list-card">
          {filteredLogs.map((log) => {
            const Icon = iconByType[log.type] || FileText;
            return (
              <div className="al-item" key={log.id}>
                <span className="icon-box icon-box-green">
                  <Icon size={16} />
                </span>
                <p className="al-text">
                  <strong>{log.actor || "User"}</strong>{log.actorRole ? ` (${log.actorRole})` : ""} · {log.action}{" "}
                  <strong>{log.detail}</strong>
                </p>
                <span className="al-time">{formatLogDate(log, now)}</span>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <p className="al-empty">No activity in this range.</p>
          )}
        </div>
      </main>

      {showDateModal && (
        <DateRangeModal
          onClose={() => setShowDateModal(false)}
          onApply={(from, to) => {
            setCustomRange({ from, to });
            setActiveTimeFilter("custom");
          }}
        />
      )}
    </div>
  );
}

export default AuditLogs;