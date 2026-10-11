import { Users, Activity } from "lucide-react";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import { useUsers } from "../../hooks/useUsers";
import "../Dashboard.css";
import "./SuperadminOverview.css";

function SuperadminOverview() {
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const bfarAdmins = users.filter((user) => user.role === "BFAR Admin" && !user.archived).length;
  const farmOwners = users.filter((user) => user.role === "Farm Owner" && !user.archived).length;

  if (usersLoading) return <p style={{ padding: 40 }}>Loading overview...</p>;
  if (usersError) return <p style={{ padding: 40 }}>Unable to load overview.</p>;

  return (
    <div className="dashboard-layout">
      <SuperadminSidebar />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Superadmin Overview</h1>
            <p className="header-subtext">Manage administrator accounts and audit system activity</p>
          </div>

          <div className="header-actions">
            <span className="superadmin-badge">SUPERADMIN</span>
          </div>
        </div>

        <div className="sa-stats-row">
          <div className="stat-card">
            <div className="stat-card-top">
              <span>BFAR Administrators</span>
              <span className="icon-box icon-box-green">
                <Users size={18} />
              </span>
            </div>
            <h2>{bfarAdmins}</h2>
            <p>Active accounts</p>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <span>Farm Owners</span>
              <span className="icon-box icon-box-green">
                <Activity size={18} />
              </span>
            </div>
            <h2>{farmOwners}</h2>
            <p>Farm-scoped access</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SuperadminOverview;