import { useState, useRef} from "react"; 
import { useNavigate } from "react-router-dom";
import {
  Activity, MapPin, AlertTriangle,
  Building2, WifiOff, CheckSquare, AlertCircle, Layers,
} from "lucide-react";
import { getOverallStatus } from "../utils/thresholds";
import { useLiveReading } from "../hooks/useLiveReading";
import { useFarms } from "../hooks/useFarms";
import { useCollection } from "../hooks/useCollection";
import { buildReadingAlerts, getAlertTimestamp, normalizeStoredAlerts } from "../utils/alertHelpers";
import { LIVE_DEVICE_TARGET } from "../config/liveDeviceConfig";
import { useDeviceStatus } from "../hooks/useDeviceStatus";
import { markAlertSeen } from "../utils/seenAlerts";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import "./Dashboard.css";
import Sidebar from "../components/Sidebar";



const statusColor = { normal: "#1f9d6e", critical: "#dc2626", moderate: "#f59e0b", offline: "#6b7280" };
const CALAPAN_CENTER = { lat: 13.4117, lng: 121.1803 };

function Dashboard() {
  const navigate = useNavigate();

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const { reading: liveReading, history: liveHistory } = useLiveReading();
  const { statusReady: deviceStatusReady, deviceOnline } = useDeviceStatus();
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();
  const { items: storedAlertItems, loading: alertsLoading, error: alertsError } = useCollection("alerts");

  if (farmsLoading || alertsLoading) return <p style={{ padding: 40 }}>Loading dashboard...</p>;
  if (farmsError || alertsError) return <p style={{ padding: 40 }}>Unable to load dashboard data.</p>;

  const farmsWithStatus = farms.filter((farm) => farm.ponds.length > 0).map((farm) => {
    const mainPond = farm.ponds[0];
    const isLivePond = String(farm.id) === String(LIVE_DEVICE_TARGET.farmId) && mainPond.id === LIVE_DEVICE_TARGET.pondId;
    const readings = isLivePond && liveReading
      ? liveReading
      : { temp: mainPond.temp, ph: mainPond.ph, do: mainPond.do, sal: mainPond.sal };
    const qualityStatus = getOverallStatus({
      temp: readings.temp, ph: readings.ph, do: readings.do, sal: readings.sal,
    });
    const deviceOffline = isLivePond && deviceStatusReady && !deviceOnline;
    return { ...farm, status: deviceOffline ? "offline" : qualityStatus };
  });

  const dashboardStats = {
    registered: farmsWithStatus.length,
    active: farmsWithStatus.filter((farm) => farm.status !== "offline").length,
    offline: farmsWithStatus.filter((farm) => farm.status === "offline").length,
    normal: farmsWithStatus.filter((farm) => farm.status === "normal").length,
    critical: farmsWithStatus.filter((farm) => farm.status === "critical").length,
    moderate: farmsWithStatus.filter((farm) => farm.status === "moderate").length,
  };

  const alerts = [
    ...buildReadingAlerts(liveHistory, farms),
    ...(deviceStatusReady && !deviceOnline ? [{
      id: "device-offline",
      farmId: LIVE_DEVICE_TARGET.farmId,
      pondId: LIVE_DEVICE_TARGET.pondId,
      farmName: farms.find((farm) => String(farm.id) === String(LIVE_DEVICE_TARGET.farmId))?.name ?? "",
      status: "offline",
      message: "Monitoring device is offline and is not sending readings.",
      displayTime: "Now",
      createdAt: new Date().toISOString(),
    }] : []),
    ...normalizeStoredAlerts(storedAlertItems, farms),
  ].sort((a, b) => getAlertTimestamp(b.createdAt) - getAlertTimestamp(a.createdAt));

  const recentWarnings = alerts.map((alert) => ({
    ...alert,
    type: alert.type ?? "WATER QUALITY",
    status: String(alert.status ?? "moderate").toLowerCase(),
    farm: alert.farmName,
    detail: alert.message,
    action: alert.action ?? "Review the latest reading.",
    time: alert.displayTime,
  }));
  const handleWarningSeen = (alertId) => {
    markAlertSeen(alertId);
  };

  const visiblePins = farmsWithStatus.filter((farm) => {
    if (!showOverlay) return false;
    if (statusFilter && farm.status !== statusFilter) return false;
    return true;
  });

  const onMapLoad = (map) => { mapRef.current = map; };

  const handlePinClick = (farm) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: farm.lat, lng: farm.lng });
      mapRef.current.setZoom(15);
    }
  };

  const handleLegendClick = (status) => {
    setStatusFilter((prev) => (prev === status ? null : status));
  };

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <Sidebar />

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="header-subtext">
              Centralized monitoring of participating shrimp farms in Calapan City
            </p>
          </div>

          <div className="header-actions">
            <button className="view-farms-btn" onClick={() => navigate("/multi-farm")}>
              View all farms →
            </button>
          </div>
        </div>

        {/* MAIN GRID: 3 columns x 3 rows */}
        <div className="dashboard-grid">
          <div className="stat-card grid-registered">
            <div className="stat-card-top">
              <span>Registered farms</span>
              <span className="icon-box icon-box-green">
                <Building2 size={18} />
              </span>
            </div>
            <h2>{dashboardStats.registered}</h2>
            <p>Total participating shrimp farms</p>
          </div>

          <div className="stat-card grid-active">
            <div className="stat-card-top">
              <span>Active farms</span>
              <span className="icon-box icon-box-green">
                <Activity size={18} />
              </span>
            </div>
            <h2>{dashboardStats.active}</h2>
            <p>Currently in operation</p>
          </div>

          <div className="stat-card grid-offline">
            <div className="stat-card-top">
              <span>Offline</span>
              <span className="icon-box icon-box-gray">
                <WifiOff size={18} />
              </span>
            </div>
            <h2>{dashboardStats.offline}</h2>
            <p>Not transmitting to cloud</p>
          </div>

          <div className="stat-card grid-normal">
            <div className="stat-card-top">
              <span>Normal</span>
              <span className="icon-box icon-box-green">
                <CheckSquare size={18} />
              </span>
            </div>
            <h2>{dashboardStats.normal}</h2>
            <p>Within acceptable water quality</p>
          </div>

          <div className="stat-card grid-critical">
            <div className="stat-card-top">
              <span>Critical</span>
              <span className="icon-box icon-box-red">
                <AlertCircle size={18} />
              </span>
            </div>
            <h2>{dashboardStats.critical}</h2>
            <p>Requires immediate attention</p>
          </div>

          <div className="stat-card grid-moderate">
            <div className="stat-card-top">
              <span>Moderate</span>
              <span className="icon-box icon-box-orange">
                <AlertTriangle size={18} />
              </span>
            </div>
            <h2>{dashboardStats.moderate}</h2>
            <p>Requires closer monitoring</p>
          </div>

          <div className="warnings-panel grid-warnings">
            <div className="warnings-panel-header">
              <h3>Recent early warnings</h3>
              <span className="panel-link" onClick={() => navigate("/alerts")}>
                Open early warning
              </span>
            </div>

            {recentWarnings.map((w) => (
              <div
                className="warning-item"
                key={w.id}
                onClick={() => handleWarningSeen(w.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") handleWarningSeen(w.id);
                }}
                role="button"
                tabIndex={0}
                aria-label={`Mark ${w.farm} alert as seen`}
                style={{ cursor: "pointer" }}
              >
                <div className="warning-item-top">
                  <span className="warning-tag">{w.type}</span>
                  <span
                    className={`warning-status status-${w.status}`}
                  >
                    {w.status.replace(/^./, (letter) => letter.toUpperCase())}
                  </span>
                </div>
                <p className="warning-farm">{w.farm}</p>
                <p className="warning-detail">{w.detail}</p>
                <p className="warning-action">Action: {w.action}</p>
                <p className="warning-time">{w.time}</p>
              </div>
            ))}
            {recentWarnings.length === 0 && <p className="warning-empty">No alerts.</p>}
          </div>

          <div className="map-card grid-map">
            <div className="map-card-header">
              <div className="map-card-title">
                <MapPin size={16} />
                <span>Calapan City overview</span>
              </div>

              <button
                className={"overlay-btn" + (showOverlay ? " overlay-btn-active" : "")}
                onClick={() => setShowOverlay(!showOverlay)}
              >
                <Layers size={14} />
                Status overlay
              </button>
            </div>

            <div className="map-placeholder">
              {isLoaded && (
                <GoogleMap
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  center={CALAPAN_CENTER}
                  zoom={13}
                  onLoad={onMapLoad}
                  options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
                >
                  {visiblePins.map((farm) => (
                    <Marker
                      key={farm.id}
                      position={{ lat: farm.lat, lng: farm.lng }}
                      onClick={() => handlePinClick(farm)}
                      icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: statusColor[farm.status],
                        fillOpacity: 1,
                        strokeColor: "#ffffff",
                        strokeWeight: 2,
                        scale: 8,
                      }}
                    />
                  ))}
                </GoogleMap>
              )}

              <div className="map-legend">
                <button
                  className={"legend-btn" + (statusFilter === "normal" ? " legend-btn-active" : "")}
                  onClick={() => handleLegendClick("normal")}
                >
                  <span className="legend-dot legend-normal" /> Normal
                </button>
                <button
                  className={"legend-btn" + (statusFilter === "critical" ? " legend-btn-active" : "")}
                  onClick={() => handleLegendClick("critical")}
                >
                  <span className="legend-dot legend-critical" /> Critical
                </button>
                <button
                  className={"legend-btn" + (statusFilter === "moderate" ? " legend-btn-active" : "")}
                  onClick={() => handleLegendClick("moderate")}
                >
                  <span className="legend-dot legend-moderate" /> Moderate
                </button>
                <button
                  className={"legend-btn" + (statusFilter === "offline" ? " legend-btn-active" : "")}
                  onClick={() => handleLegendClick("offline")}
                >
                  <span className="legend-dot legend-offline" /> Offline
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;