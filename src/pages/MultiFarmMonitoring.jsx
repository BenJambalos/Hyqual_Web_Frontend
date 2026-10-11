import { useState } from "react";
import { Search, Waves } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { getOverallStatus, getParamStatus } from "../utils/thresholds";
import { useLiveReading } from "../hooks/useLiveReading";
import { useFarms } from "../hooks/useFarms";
import { LIVE_DEVICE_TARGET } from "../config/liveDeviceConfig";
import { useDeviceStatus } from "../hooks/useDeviceStatus";
import "./MultiFarmMonitoring.css";
import { useNavigate } from "react-router-dom";

const statusLabel = { normal: "Normal", critical: "Critical", moderate: "Moderate", offline: "Offline" };

function MultiFarmMonitoring() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { reading: liveReading } = useLiveReading();
  const { statusReady: deviceStatusReady, deviceOnline } = useDeviceStatus();
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();

  if (farmsLoading) return <p style={{ padding: 40 }}>Loading farms...</p>;
  if (farmsError) return <p style={{ padding: 40 }}>Unable to load farms.</p>;

  // Derive each farm's overall status + display readings from its first pond.
  // This is what makes the colors dynamic instead of hardcoded.
  const farmsWithStatus = farms.filter((farm) => farm.ponds.length > 0).map((farm) => {
    const mainPond = farm.ponds[0];
    const isLivePond = String(farm.id) === String(LIVE_DEVICE_TARGET.farmId) && mainPond.id === LIVE_DEVICE_TARGET.pondId;
    const readings = isLivePond && liveReading
      ? liveReading
      : { temp: mainPond.temp, ph: mainPond.ph, do: mainPond.do, sal: mainPond.sal };
    return {
      ...farm,
      status: isLivePond && deviceStatusReady && !deviceOnline ? "offline" : getOverallStatus(readings),
      readings,
    };
  });

  const counts = {
    all: farmsWithStatus.length,
    normal: farmsWithStatus.filter((f) => f.status === "normal").length,
    critical: farmsWithStatus.filter((f) => f.status === "critical").length,
    moderate: farmsWithStatus.filter((f) => f.status === "moderate").length,
    offline: farmsWithStatus.filter((f) => f.status === "offline").length,
  };

  const filteredFarms = farmsWithStatus
    .filter((f) => activeFilter === "all" || f.status === activeFilter)
    .filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const filters = [
    { key: "all", label: `All ${counts.all}` },
    { key: "normal", label: `Normal ${counts.normal}` },
    { key: "critical", label: `Critical ${counts.critical}` },
    { key: "moderate", label: `Moderate ${counts.moderate}` },
    { key: "offline", label: `Offline ${counts.offline}` },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Multi-Farm Monitoring</h1>
            <p className="header-subtext">{farmsWithStatus.length} registered farms</p>
          </div>

        </div>

        <div className="mfm-toolbar">
          <div className="filter-pills">
            {filters.map((f) => (
              <button
                key={f.key}
                className={"filter-pill" + (activeFilter === f.key ? " filter-pill-active" : "")}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by farm name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="farm-cards-grid">
          {filteredFarms.map((farm) => (
            <div className="farm-card" key={farm.id} onClick={() => navigate(`/multi-farm/${farm.id}`)}>
              <div className="farm-card-header">
                <div>
                  <h3>{farm.name}</h3>
                  <p className="farm-owner">Owner: {farm.owner}</p>
                </div>
                <span className={"status-pill status-pill-" + farm.status}>
                  {statusLabel[farm.status]}
                </span>
              </div>

              <p className="farm-meta">
                Ponds: {farm.ponds.length} <br />
                {farm.ponds[0].name} <Waves size={12} />
              </p>

              <div className="farm-readings">
                {["temp", "ph", "do", "sal"].map((param) => {
                  const paramStatus = getParamStatus(param, farm.readings[param]);
                  return (
                    <div
                      key={param}
                      className={
                        "reading-box" +
                        (paramStatus !== "normal" ? " reading-abnormal-" + paramStatus : "")
                      }
                    >
                      <span className="reading-label">{param.toUpperCase()}</span>
                      <span className="reading-value">{farm.readings[param]}</span>
                    </div>
                  );
                })}
              </div>

              <div className="farm-card-footer">
                <span className="updated-text">Updated {farm.updatedAt}</span>
                <span className="open-farm-link" onClick={(e) => {e.stopPropagation(); navigate(`/multi-farm/${farm.id}`);}}>
            Open farm →
          </span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default MultiFarmMonitoring;