import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { MapPin, Layers } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { getOverallStatus } from "../utils/thresholds";
import { useDeviceStatus } from "../hooks/useDeviceStatus";
import { useFarms } from "../hooks/useFarms";
import "./FarmLocationMap.css";

const statusLabel = { normal: "Normal", critical: "Critical", moderate: "Moderate", offline: "Offline" };
const statusColor = { normal: "#1f9d6e", critical: "#dc2626", moderate: "#f59e0b", offline: "#6b7280" };

const CALAPAN_CENTER = { lat: 13.4117, lng: 121.1803 };

function FarmLocationMap() {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [selectedFarmId, setSelectedFarmId] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [statusFilter, setStatusFilter] = useState(null);
  const { statusReady: deviceStatusReady, deviceOnline } = useDeviceStatus();
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();

  const farmsWithStatus = farms.filter((farm) => farm.ponds.length > 0).map((farm) => {
    const mainPond = farm.ponds[0];
    const qualityStatus = getOverallStatus({
      temp: mainPond.temp, ph: mainPond.ph, do: mainPond.do, sal: mainPond.sal,
    });
    const deviceOffline = farm.id === 3 && mainPond.id === "A" && deviceStatusReady && !deviceOnline;
    return { ...farm, status: deviceOffline ? "offline" : qualityStatus };
  });

  const selectedFarm = farmsWithStatus.find((f) => f.id === selectedFarmId);

  const visibleFarms = farmsWithStatus.filter((farm) => {
    if (!showOverlay) return false;
    if (statusFilter && farm.status !== statusFilter) return false;
    return true;
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleSelectFarm = (farm) => {
    setSelectedFarmId(farm.id);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: farm.lat, lng: farm.lng }); // built-in smooth pan
      mapRef.current.setZoom(15);
    }
  };

  const handleLegendClick = (status) => {
    setStatusFilter((prev) => (prev === status ? null : status));
  };

  if (farmsLoading) return <p style={{ padding: 40 }}>Loading farms...</p>;
  if (farmsError) return <p style={{ padding: 40 }}>Unable to load farms.</p>;
  if (!isLoaded) return <p style={{ padding: 40 }}>Loading map...</p>;

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Farm Locations</h1>
          </div>
        </div>

        <div className="flm-grid">
          {/* MAP */}
          <div className="map-card flm-map-card">
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

            <div className="flm-map-viewport">
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={CALAPAN_CENTER}
                zoom={13}
                onLoad={onMapLoad}
                options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
              >
                {visibleFarms.map((farm) => (
                  <Marker
                    key={farm.id}
                    position={{ lat: farm.lat, lng: farm.lng }}
                    onClick={() => handleSelectFarm(farm)}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      fillColor: statusColor[farm.status],
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 2,
                      scale: farm.id === selectedFarmId ? 11 : 8,
                    }}
                  />
                ))}
              </GoogleMap>

              {/* SELECTED FARM POPUP — floats over the map, independent of marker position */}
              {selectedFarm && (
                <div className="selected-farm-popup">
                  <p className="selected-farm-label">SELECTED FARM</p>
                  <h3>{selectedFarm.name}</h3>
                  <p className="selected-farm-location">{selectedFarm.location}</p>
                  <span className={"status-pill status-pill-" + selectedFarm.status}>
                    {statusLabel[selectedFarm.status]}
                  </span>
                  <button
                    className="view-farm-btn"
                    onClick={() => navigate(`/multi-farm/${selectedFarm.id}`)}
                  >
                    View Farm
                  </button>
                </div>
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

          {/* FARM LIST */}
          <div className="farm-list-panel">
            <h3 className="farm-list-header">All farms ({farmsWithStatus.length})</h3>

            {farmsWithStatus.map((farm) => (
              <div
                key={farm.id}
                className={"farm-list-item" + (farm.id === selectedFarmId ? " farm-list-item-active" : "")}
                onClick={() => handleSelectFarm(farm)}
              >
                <div>
                  <p className="farm-list-name">{farm.name}</p>
                  <p className="farm-list-location">{farm.location.split(",")[0]}</p>
                </div>
                <span className={"farm-list-status status-text-" + farm.status}>
                  {statusLabel[farm.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default FarmLocationMap;