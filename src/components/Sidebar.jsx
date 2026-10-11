import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, Activity, MapPin, AlertTriangle, BarChart2, LogOut } from "lucide-react";
import { api } from "../api/client";
import logoIcon from "../assets/hyqual-logo-icon.png";
import logoText from "../assets/hyqual-logo-text.png";
import { getFullName, getInitials } from "../utils/userHelpers";
import { ACTIVE_AUTH_SESSION_KEY } from "../utils/authSession";
import { useAlerts } from "../hooks/useAlerts";
import { ALERTS_SEEN_EVENT, getSeenAlertIds, markAlertsSeen } from "../utils/seenAlerts";
import "./Sidebar.css";

const navItems = [
  { label: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
  { label: "Multi-Farm Monitoring", icon: Activity, path: "/multi-farm" },
  { label: "Farm Location Map", icon: MapPin, path: "/farm-map" },
  { label: "Alerts", icon: AlertTriangle, path: "/alerts" },
  { label: "Reports and Analytics", icon: BarChart2, path: "/reports" },
];

function Sidebar() {
  const navigate = useNavigate();
  const { alerts } = useAlerts();
  const [seenAlertIds, setSeenAlertIds] = useState(() => getSeenAlertIds());
  const storedUser = JSON.parse(localStorage.getItem("hyqual_user"));
  const currentUser = storedUser || { role: "Unknown" };
  const unseenAlertCount = alerts.filter((alert) => !seenAlertIds.includes(alert.id)).length;

  useEffect(() => {
    const syncSeenAlerts = () => setSeenAlertIds(getSeenAlertIds());
    window.addEventListener(ALERTS_SEEN_EVENT, syncSeenAlerts);

    return () => window.removeEventListener(ALERTS_SEEN_EVENT, syncSeenAlerts);
  }, []);

  const handleSignOut = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Unable to end the server session:", error);
    } finally {
      localStorage.removeItem("hyqual_user");
      sessionStorage.removeItem(ACTIVE_AUTH_SESSION_KEY);
      navigate("/login", { replace: true });
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <img src={logoIcon} alt="HyQual icon" className="sidebar-logo-icon" />
          <img src={logoText} alt="HyQual" className="sidebar-logo-text" />
        </div>

        <p className="sidebar-role-label">BFAR ADMINISTRATOR</p>

        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => "nav-item" + (isActive ? " nav-item-active" : "")}
              onClick={item.path === "/alerts" ? () => markAlertsSeen(alerts.map((alert) => alert.id)) : undefined}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.path === "/alerts" && unseenAlertCount > 0 && (
                <span className="sidebar-alert-count" aria-label={`${unseenAlertCount} unseen alerts`}>
                  {unseenAlertCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <div className="user-card" onClick={() => navigate("/profile")}>
          <div className="user-avatar">{getInitials(currentUser)}</div>
          <div>
            <p className="user-name">{getFullName(currentUser)}</p>
            <p className="user-role">{currentUser.role}</p>
          </div>
        </div>

        <button className="nav-item sign-out" onClick={handleSignOut}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
