import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import ConfirmModal from "../../components/ConfirmModal";
import { useUsers } from "../../hooks/useUsers";
import "../Dashboard.css";
import "./SuperadminOverview.css";
import "./ArchivedAccounts.css";

const tabs = ["All", "BFAR Admin", "Farm Owner"];

function ArchivedAccounts() {
  const navigate = useNavigate();
  const { users, restoreUser, deleteUser } = useUsers();

  const [activeTab, setActiveTab] = useState("All");
  const [confirmAction, setConfirmAction] = useState(null); // { type: "restore"|"delete", user }

  const archivedUsers = users
    .filter((u) => u.archived)
    .filter((u) => activeTab === "All" || u.role === activeTab);

  const handleConfirm = () => {
    if (confirmAction.type === "restore") return restoreUser(confirmAction.user.id);
    if (confirmAction.type === "delete") return deleteUser(confirmAction.user.id);
  };

  return (
    <div className="dashboard-layout">
      <SuperadminSidebar />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Archived Accounts</h1>
          </div>
          <div className="header-actions">
            <span className="superadmin-badge">SUPERADMIN</span>
          </div>
        </div>

        <div className="aa-toolbar">
          <div className="filter-pills">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={"filter-pill" + (activeTab === tab ? " filter-pill-active" : "")}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="aa-list">
          {archivedUsers.length === 0 && (
            <p className="aa-empty">No archived accounts in this category.</p>
          )}

          {archivedUsers.map((user) => (
            <div className="aa-card" key={user.id}>
              <div className="aa-card-main">
                <div className="aa-card-top">
                  <h3>{user.firstName} {user.lastName}</h3>
                  <span className="role-pill">{user.role}</span>
                </div>

                {user.farmName && <p className="aa-farm-name">{user.farmName}</p>}

                <div className="aa-meta-row">
                  <span><MapPin size={13} /> {user.barangay}, {user.city}</span>
                  <span><Mail size={13} /> {user.email}</span>
                  <span><Phone size={13} /> {user.phone}</span>
                </div>
              </div>

              <div className="aa-card-actions">
                <button
                  className="aa-delete-btn"
                  onClick={() => setConfirmAction({ type: "delete", user })}
                >
                  Delete
                </button>
                <button
                  className="aa-restore-btn"
                  onClick={() => setConfirmAction({ type: "restore", user })}
                >
                  Restore
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="back-btn" onClick={() => navigate("/superadmin/users")}>
          Back
        </button>
      </main>

      {confirmAction?.type === "restore" && (
        <ConfirmModal
          title="Restore this account?"
          message={`${confirmAction.user.firstName} ${confirmAction.user.lastName} will regain access to the system.`}
          confirmLabel="Restore"
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
        />
      )}

      {confirmAction?.type === "delete" && (
        <ConfirmModal
          title="Permanently delete this account?"
          message={`This cannot be undone. ${confirmAction.user.firstName} ${confirmAction.user.lastName}'s data will be permanently removed.`}
          confirmLabel="Delete permanently"
          danger
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

export default ArchivedAccounts;