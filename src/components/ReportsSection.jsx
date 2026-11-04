import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeArimaMetrics,
  computeIsoWeightedMean,
  computeSensorAccuracy,
} from "../utils/reportMetrics";
import "./ReportsSection.css";

function formatNumber(value, suffix = "") {
  return value == null ? "—" : `${value.toFixed(2)}${suffix}`;
}

function ReportsSection({
  evaluationData = {},
  mlData = {},
  mlCounts = { riskResults: 0, upcomingForecasts: 0 },
  mlLoading = false,
  mlError = null,
}) {
  const sensorMetrics = computeSensorAccuracy(evaluationData.sensorSamples);
  const arimaMetrics = computeArimaMetrics(evaluationData.arimaSamples);
  const isoResults = computeIsoWeightedMean(evaluationData.isoCriteria);
  const riskResults = Array.isArray(mlData.riskResults) ? mlData.riskResults : [];
  const riskClassCounts = ["Low", "Moderate", "High"].map((riskClass) => ({
    riskClass,
    count: riskResults.filter((result) => result.riskClass === riskClass).length,
  }));
  const hybridCounts = ["Normal", "Warning", "Critical"].map((status) => ({
    status,
    count: riskResults.filter((result) => result.hybridStatus === status).length,
  }));
  const jobRuns = Array.isArray(evaluationData.reliability) ? evaluationData.reliability : [];
  const reliabilityRows = ["risk", "forecast"].map((jobName) => {
    const runs = jobRuns.filter((run) => String(run.jobName).toLowerCase() === jobName);
    const successful = runs.filter((run) => ["success", "partial"].includes(String(run.status).toLowerCase())).length;
    return { jobName, successful, total: runs.length, percent: runs.length ? (successful / runs.length) * 100 : null };
  });

  return (
    <section className="report-metrics" aria-label="Model and system evaluation metrics">
      <div className="report-metrics-heading">
        <div>
          <p className="report-metrics-eyebrow">Model and system evaluation</p>
          <h2>Evaluation metrics</h2>
        </div>
        <p className="report-metrics-note">Metrics are calculated from evaluation records; unavailable inputs are shown as —.</p>
      </div>

      <div className="report-metrics-grid">
        <section className="report-metric-panel">
          <h3>Latest ML risk classifications</h3>
          <p className="report-metric-caption">
            {mlLoading ? "Checking the backend and database..." : `${mlCounts.riskResults} saved risk results`}
          </p>
          {mlError ? (
            <div className="report-table-empty" role="alert">
              <p>{mlError.message}</p>
              {mlError.status === 404 ? (
                <p>Deploy the updated backend API, then reload this page.</p>
              ) : mlError.status === 500 ? (
                <p>Check that the backend is deployed and its MySQL database has the ML schema/migration. The backend logs contain the database error.</p>
              ) : mlError.status === 401 || mlError.status === 403 ? (
                <p>Your session may have expired or may not have permission. Sign in again and retry.</p>
              ) : (
                <p>Check that the backend is reachable, then reload this page.</p>
              )}
            </div>
          ) : mlLoading ? (
            <p className="report-table-empty">Loading ML results...</p>
          ) : (
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr><th>Farm / pond</th><th>Risk</th><th>Hybrid status</th><th>Confidence</th><th>Calculated</th></tr>
                </thead>
                <tbody>
                  {mlData.riskResults?.length ? mlData.riskResults.slice(0, 10).map((result) => {
                    const probability = {
                      Low: result.probLow,
                      Moderate: result.probModerate,
                      High: result.probHigh,
                    }[result.riskClass];
                    const confidence = probability == null
                      ? "—"
                      : `${(Number(probability) * 100).toFixed(1)}%`;
                    return (
                      <tr key={result.id}>
                        <th scope="row">{result.farmName} / {result.pondName}</th>
                        <td>{result.riskClass}</td>
                        <td>{result.hybridStatus}</td>
                        <td>{confidence}</td>
                        <td>{result.calculatedAt ? new Date(result.calculatedAt).toLocaleString() : "—"}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td className="report-table-empty" colSpan="5">
                      No risk results saved yet. The seed file does not create these; the ML service must write them.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="report-metric-panel">
          <h3>Upcoming water-quality forecasts</h3>
          <p className="report-metric-caption">
            {mlLoading ? "Checking the backend and database..." : `${mlCounts.upcomingForecasts} upcoming forecasts`}
          </p>
          {mlError ? (
            <p className="report-table-empty">Unable to load forecasts.</p>
          ) : mlLoading ? (
            <p className="report-table-empty">Loading forecasts...</p>
          ) : (
            <div className="report-table-wrap">
              <table>
                <thead>
                  <tr><th>Farm / pond</th><th>Parameter</th><th>Predicted value</th><th>For</th></tr>
                </thead>
                <tbody>
                  {mlData.forecasts?.length ? mlData.forecasts.slice(0, 12).map((forecast) => (
                    <tr key={forecast.id}>
                      <th scope="row">{forecast.farmName} / {forecast.pondName}</th>
                      <td>{forecast.parameter.replaceAll("_", " ")}</td>
                      <td>{Number(forecast.value).toFixed(2)}</td>
                      <td>{forecast.predictedFor ? new Date(forecast.predictedFor).toLocaleString() : "—"}</td>
                    </tr>
                  )) : (
                    <tr><td className="report-table-empty" colSpan="4">
                      No upcoming forecasts. Confirm that the ML service has written forecasts for future dates.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="report-metric-panel">
          <h3>Sensor accuracy</h3>
          <p className="report-metric-caption">Requires sensor calibration/reference measurements. The current database stores readings but not independent reference values, so accuracy cannot be calculated honestly from readings alone.</p>
          <div className="report-table-wrap">
            <table>
              <thead>
                <tr><th>Parameter</th><th>Samples</th><th>AE</th><th>PE</th><th>MAE</th></tr>
              </thead>
              <tbody>
                {sensorMetrics.map((metric) => (
                  <tr key={metric.parameter}>
                    <th scope="row">{metric.label}</th>
                    <td>{metric.sampleCount}</td>
                    <td>{formatNumber(metric.ae)}</td>
                    <td>{formatNumber(metric.pe, "%")}</td>
                    <td>{formatNumber(metric.mae)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-metric-panel">
          <div className="report-metric-title-row">
            <div>
              <h3>Random Forest risk classification</h3>
              <p className="report-metric-caption">{riskResults.length} saved classifications. Accuracy requires a separately labeled test dataset.</p>
            </div>
          </div>
          <div className="report-chart" role="img" aria-label="Saved Random Forest classifications by risk class">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskClassCounts} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="riskClass" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Saved classifications" fill="#16866a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="report-table-wrap">
            <table>
              <thead><tr><th>Risk class</th><th>Saved results</th></tr></thead>
              <tbody>{riskClassCounts.map((metric) => (
                <tr key={metric.riskClass}><th scope="row">{metric.riskClass}</th><td>{metric.count}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <section className="report-metric-panel">
          <h3>ARIMA forecast error</h3>
          <p className="report-metric-caption">MAPE excludes samples with an actual value of zero.</p>
          <div className="report-table-wrap">
            <table>
              <thead>
                <tr><th>Parameter</th><th>Samples</th><th>MAE</th><th>RMSE</th><th>MAPE</th></tr>
              </thead>
              <tbody>
                {arimaMetrics.map((metric) => (
                  <tr key={metric.parameter}>
                    <th scope="row">{metric.label}</th>
                    <td>{metric.sampleCount}</td>
                    <td>{formatNumber(metric.mae)}</td>
                    <td>{formatNumber(metric.rmse)}</td>
                    <td>{formatNumber(metric.mape, "%")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-metric-panel report-metric-highlight">
          <h3>Hybrid early warning</h3>
          <p className="report-metric-big">{riskResults.length}</p>
          <p className="report-metric-caption">Saved hybrid results by current status</p>
          <div className="report-table-wrap"><table>
            <thead><tr><th>Status</th><th>Results</th></tr></thead>
            <tbody>{hybridCounts.map((item) => <tr key={item.status}><th scope="row">{item.status}</th><td>{item.count}</td></tr>)}</tbody>
          </table></div>
          <p className="report-metric-footnote">Warning accuracy requires labeled expected outcomes, which are not stored in the current results table.</p>
        </section>

        <section className="report-metric-panel">
          <h3>System reliability</h3>
          <div className="report-table-wrap">
            <table>
              <thead>
                <tr><th>Measure</th><th>Successful</th><th>Total</th><th>Rate</th></tr>
              </thead>
              <tbody>
                {reliabilityRows.map((metric) => (
                  <tr key={metric.jobName}>
                    <th scope="row">{metric.jobName === "risk" ? "Risk classification jobs" : "Forecast jobs"}</th>
                    <td>{metric.successful}</td>
                    <td>{metric.total}</td>
                    <td>{formatNumber(metric.percent, "%")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="report-metric-panel">
          <div className="report-metric-title-row">
            <div>
              <h3>ISO 25010 evaluation</h3>
              <p className="report-metric-caption">Weighted mean on a 1–5 Likert scale</p>
            </div>
            <strong className="report-metric-score">{formatNumber(isoResults.overall)}</strong>
          </div>
          <div className="report-table-wrap">
            <table>
              <thead>
                <tr><th>Quality criterion</th><th>Responses</th><th>Weighted mean</th></tr>
              </thead>
              <tbody>
                {isoResults.criteria.length ? isoResults.criteria.map((metric) => (
                  <tr key={metric.criterion}>
                    <th scope="row">{metric.criterion}</th>
                    <td>{metric.responseCount}</td>
                    <td>{formatNumber(metric.weightedMean)}</td>
                  </tr>
                )) : (
                  <tr><td className="report-table-empty" colSpan="3">No evaluation responses</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

export default ReportsSection;