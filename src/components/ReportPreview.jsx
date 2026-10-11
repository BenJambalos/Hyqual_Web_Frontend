import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import logoIcon from "../assets/hyqual-logo-icon.png";
import { getReportData } from "../utils/reportPreview";
import { useLiveReading } from "../hooks/useLiveReading";
import { useFarms } from "../hooks/useFarms";
import "./ReportPreview.css";

const statusLabel = { normal: "NORMAL", moderate: "MODERATE", critical: "CRITICAL", offline: "NO DATA" };

// scope (optional): { farmId } or { farmId, pondId } — limits the report to
// just that farm/pond instead of every farm. Leave undefined for the full report.
function ReportPreview({ reportId, scope, onClose, farmData }) {
  const [farmIndex, setFarmIndex] = useState(0);
  const { history: liveHistory } = useLiveReading();
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();
  const report = getReportData(reportId, scope, liveHistory, farmData ?? farms);

  if (farmsLoading && !farmData) {
    return <div className="report-preview-wrapper"><p>Loading report data...</p></div>;
  }

  if (farmsError && !farmData) {
    return <div className="report-preview-wrapper"><p>Unable to load report data.</p></div>;
  }

  if (!report) {
    return (
      <div className="report-preview-wrapper">
        <button className="report-back-btn" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <div className="report-page">
          <p>No preview available for this report yet.</p>
        </div>
      </div>
    );
  }

  if (report.farms.length === 0) {
    return (
      <div className="report-preview-wrapper">
        <button className="report-back-btn" onClick={onClose}>
          <ArrowLeft size={18} />
        </button>
        <div className="report-page">
          <p>No data found for this farm/pond in this report's date range.</p>
        </div>
      </div>
    );
  }

  const farm = report.farms[farmIndex];
  const showPager = report.farms.length > 1;

  const goPrev = () => setFarmIndex((i) => Math.max(0, i - 1));
  const goNext = () => setFarmIndex((i) => Math.min(report.farms.length - 1, i + 1));

  return (
    <div className="report-preview-wrapper">
      <button className="report-back-btn" onClick={onClose}>
        <ArrowLeft size={18} />
      </button>

      <div className="report-page">
        {/* HEADER */}
        <div className="report-header">
          <img src={logoIcon} alt="HyQual" className="report-logo" />
          <h1>{report.title}</h1>
          <p className="report-date-range">{report.dateRange}</p>
          <p className="report-meta-line">
            Generated: {report.generatedDate} · Prepared for {report.preparedFor} · Report ID: {report.reportId}
          </p>
        </div>

        <hr />

        {/* SUMMARY STAT BOXES — only meaningful for the full multi-farm report */}
        {!report.isScoped && (
          <div className="report-summary-row">
            <div className="report-stat-box">
              <span className="report-stat-value">{report.summary.farmsInReport}</span>
              <span className="report-stat-label">Farms in Report</span>
            </div>
            <div className="report-stat-box">
              <span className="report-stat-value report-stat-normal">{report.summary.normalOverall}</span>
              <span className="report-stat-label">Normal overall</span>
            </div>
            <div className="report-stat-box">
              <span className="report-stat-value report-stat-moderate">{report.summary.moderateOverall}</span>
              <span className="report-stat-label">Moderate overall</span>
            </div>
            <div className="report-stat-box">
              <span className="report-stat-value report-stat-critical">{report.summary.criticalOverall}</span>
              <span className="report-stat-label">Critical overall</span>
            </div>
          </div>
        )}

        {/* FARM PAGER — hidden when scoped to a single farm/pond */}
        {showPager && (
          <div className="report-farm-pager">
            <button className="farm-pager-arrow" onClick={goPrev} disabled={farmIndex === 0}>
              <ChevronLeft size={16} />
            </button>
            <span className="farm-pager-pill">
              Farm {farmIndex + 1} of {report.farms.length}
            </span>
            <button className="farm-pager-arrow" onClick={goNext} disabled={farmIndex === report.farms.length - 1}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* FARM INFO */}
        <div className="report-farm-info">
          <div>
            <p className="report-field-label">Farm</p>
            <p className="report-field-value">{farm.farmName}</p>
          </div>
          <div>
            <p className="report-field-label">Location</p>
            <p className="report-field-value">{farm.location}</p>
          </div>
        </div>
        <div className="report-farm-info">
          <div>
            <p className="report-field-label">Farm owner</p>
            <p className="report-field-value">{farm.owner}</p>
          </div>
        </div>

        {/* PER-POND TABLES */}
        {farm.ponds.map((pond) => (
          <div key={pond.pondName}>
            <h3 className="report-section-heading">
              PARAMETER COMPLIANCE VERIFICATION - {pond.pondName}
            </h3>

            <table className="report-table">
              <thead>
                <tr>
                  <th>Monitored Parameter</th>
                  <th>Weekly Avg</th>
                  <th>Minimum Record</th>
                  <th>Maximum Record</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pond.parameters.map((p) => (
                  <tr key={p.parameter}>
                    <td>{p.parameter}</td>
                    <td>{p.weeklyAvg}</td>
                    <td>{p.min}</td>
                    <td>{p.max}</td>
                    <td>
                      <span className={"report-status-pill report-status-" + p.status}>
                        {statusLabel[p.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pond.incidents.length > 0 && (
              <>
                <h3 className="report-section-heading">INCIDENT &amp; CRITICAL EVENT LOGS</h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Time Stamp</th>
                      <th>Parameter</th>
                      <th>Value Logged</th>
                      <th>Alert Description and Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pond.incidents.map((inc, i) => (
                      <tr key={i}>
                        <td>{inc.timestamp}</td>
                        <td>{inc.parameter}</td>
                        <td>{inc.value}</td>
                        <td>{inc.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportPreview;