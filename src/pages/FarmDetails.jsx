import { useParams, useNavigate } from "react-router-dom";
import { Sprout } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { getOverallStatus } from "../utils/thresholds";
import { useLiveReading } from "../hooks/useLiveReading";
import { useFarms } from "../hooks/useFarms";
import { LIVE_DEVICE_TARGET } from "../config/liveDeviceConfig";
import { useDeviceStatus } from "../hooks/useDeviceStatus";
import "./FarmDetails.css";

const statusLabel = { normal: "Normal", critical: "Critical", moderate: "Moderate", offline: "Offline" };

function FarmDetails() {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const { reading: liveReading, loading: liveLoading } = useLiveReading();
  const { statusReady: deviceStatusReady, deviceOnline } = useDeviceStatus();
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();

  if (farmsLoading) return <p style={{ padding: 40 }}>Loading farm...</p>;
  if (farmsError) return <p style={{ padding: 40 }}>Unable to load this farm.</p>;

  const farm = farms.find((item) => String(item.id) === String(farmId));

  if (!farm || farm.ponds.length === 0) return <p style={{ padding: 40 }}>Farm not found or has no ponds.</p>;

  const mainPond = farm.ponds[0];
  const isLiveFarm = String(farm.id) === String(LIVE_DEVICE_TARGET.farmId);
  const mainPondReadings = isLiveFarm && mainPond.id === LIVE_DEVICE_TARGET.pondId && liveReading
    ? liveReading
    : mainPond;
  const qualityStatus = getOverallStatus({
    temp: mainPondReadings.temp, ph: mainPondReadings.ph, do: mainPondReadings.do, sal: mainPondReadings.sal,
  });
  const overallStatus = isLiveFarm && deviceStatusReady && !deviceOnline ? "offline" : qualityStatus;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Multi-Farm Monitoring</h1>
            <p className="header-subtext">{farms.length} registered farms</p>
          </div>
        </div>

        <div className="farm-summary-card">
          <div className="farm-summary-top">
            <h2>{farm.name}</h2>
            <span className={"status-pill status-pill-" + overallStatus}>
              {statusLabel[overallStatus]}
            </span>
          </div>
          <p>Operator: {farm.owner}</p>
          <p>Location: {farm.location}</p>
          <p>Ponds: {farm.ponds.length}</p>
          <p>Updated {isLiveFarm && liveReading ? "just now" : farm.updatedAt}</p>
        </div>

        <h3 className="ponds-heading">Ponds</h3>

        <div className="ponds-grid">
          {farm.ponds.map((pond) => {
            const isLivePond = isLiveFarm && pond.id === LIVE_DEVICE_TARGET.pondId;
            const pondReadings = isLivePond && liveReading ? liveReading : pond;
            const qualityStatus = getOverallStatus({
              temp: pondReadings.temp, ph: pondReadings.ph, do: pondReadings.do, sal: pondReadings.sal,
            });
            const pondStatus = isLivePond && deviceStatusReady && !deviceOnline ? "offline" : qualityStatus;
            return (
              <div
                className={"pond-card pond-card-" + pondStatus}
                key={pond.id}
                onClick={() => navigate(`/multi-farm/${farm.id}/${pond.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div className="pond-card-header">
                  <span className="pond-title">
                    <Sprout size={16} /> {pond.name}{isLivePond && ` ${liveLoading ? "(Connecting...)" : "(LIVE)"}`}
                  </span>
                  <span className={"status-dot status-dot-" + pondStatus} />
                </div>
                <div className="pond-readings">
                  <span><strong>Temp:</strong> {pondReadings.temp} °C</span>
                  <span><strong>pH:</strong> {pondReadings.ph}</span>
                  <span><strong>DO:</strong> {pondReadings.do} mg/L</span>
                  <span><strong>Salinity:</strong> {pondReadings.sal} ppt</span>
                </div>
              </div>
            );
          })}
        </div>

        <button className="back-btn" onClick={() => navigate("/multi-farm")}>
          Back
        </button>
      </main>
    </div>
  );
}

export default FarmDetails;