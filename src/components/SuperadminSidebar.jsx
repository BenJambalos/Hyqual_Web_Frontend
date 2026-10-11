import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, Users, Cpu, ClipboardList, ShieldCheck, LogOut } from "lucide-react";
import { api } from "../api/client";
import logoIcon from "../assets/hyqual-logo-icon.png";
import { getFullName, getInitials } from "../utils/userHelpers";
import { ACTIVE_AUTH_SESSION_KEY } from "../utils/authSession";
import "./SuperadminSidebar.css";

const navItems = [
  { label: "Overview", icon: LayoutGrid, path: "/superadmin/overview" },
  { label: "User Management", icon: Users, path: "/superadmin/users" },
  { label: "Device Registry", icon: Cpu, path: "/superadmin/devices" },
  { label: "Audit Logs", icon: ClipboardList, path: "/superadmin/logs" },
  { label: "Account Approval", icon: ShieldCheck, path: "/superadmin/approvals" },
];

function SuperadminSidebar() {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("hyqual_user"));

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
    <aside className="sa-sidebar">
      <div className="sa-sidebar-top">
        <div className="sa-sidebar-logo">
          <img src={logoIcon} alt="HyQual icon" className="sa-sidebar-logo-icon" />
          <span className="sa-sidebar-logo-text">HyQual</span>
        </div>

        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => "sa-nav-item" + (isActive ? " sa-nav-item-active" : "")}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sa-sidebar-bottom">
        <div className="sa-user-card" onClick={() => navigate("/profile")}>
          <div className="sa-user-avatar">{getInitials(storedUser)}</div>
          <div>
            <p className="sa-user-name">{getFullName(storedUser)}</p>
            <p className="sa-user-role">{storedUser?.role}</p>
          </div>
        </div>

        <button className="sa-nav-item sa-sign-out" onClick={handleSignOut}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

export default SuperadminSidebar;