import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, Archive, Search, ChevronDown, Pencil, Trash2, Eye } from "lucide-react";
import SuperadminSidebar from "../../components/SuperadminSidebar";
import UserFormModal from "../../components/UserFormModal";
import ConfirmModal from "../../components/ConfirmModal";
import Modal from "../../components/Modal";
import { useUsers } from "../../hooks/useUsers";
import { useFarms } from "../../hooks/useFarms";
import { useCollection } from "../../hooks/useCollection";
import { useUserPresence } from "../../hooks/useUserPresence";
import { getAccountStatus, isApprovedForManagement, normalizeReferenceId } from "../../utils/accountApproval";
import "../Dashboard.css";
import "./SuperadminOverview.css";
import "./UserManagement.css";

const roleOptions = ["All users", "BFAR Admin", "Farm Owner"];
const statusOptions = ["All", "Active", "Offline"];

function getUserFarmNames(user, farms) {
  if (user.role !== "Farm Owner") return "—";

  const userReferences = [user.id, user.uid, user.userId]
    .filter(Boolean)
    .map(normalizeReferenceId);
  const assignedFarms = farms.filter((farm) => (
    userReferences.includes(normalizeReferenceId(farm.ownerId))
  ));

  return assignedFarms.length > 0
    ? assignedFarms.map((farm) => farm.name).join(", ")
    : "Not assigned";
}

function getLastSeen(user, presence, now) {
  if (presence[user.id]?.state === "online") return "Online now";

  const timestamp = presence[user.id]?.lastChanged;
  const lastSeen = Number.isFinite(timestamp)
    ? new Date(timestamp)
    : user.lastSeen?.toDate?.() || new Date(user.lastSeen);

  if (Number.isNaN(lastSeen.getTime())) return user.lastSeen || "Never";
  const minutesAgo = Math.max(0, Math.floor((now - lastSeen.getTime()) / 60000));
  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo} hr ago`;
  return lastSeen.toLocaleString();
}

function UserManagement() {
  const navigate = useNavigate();
  const { users, addUser, updateUser, archiveUser } = useUsers();
  const { farms } = useFarms();
  const { items: approvals } = useCollection("approvals");
  const presence = useUserPresence(false);

  const [roleFilter, setRoleFilter] = useState("All users");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [now, setNow] = useState(0);

  const [formModal, setFormModal] = useState(null); // { mode: "add"|"edit", user? }
  const [confirmArchive, setConfirmArchive] = useState(null); // user being archived

  useEffect(() => {
    const initialUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, []);

  const filteredUsers = users
    .filter((u) => {
      if (u.archived || u.role === "Superadmin") return false;
      if (!isApprovedForManagement(u, approvals)) return false;
      const accountStatus = getAccountStatus(u, presence, approvals);
      if (roleFilter !== "All users" && u.role !== roleFilter) return false;
      if (statusFilter !== "All" && accountStatus !== statusFilter) return false;
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      if (!fullName.includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .map((user) => ({
      ...user,
      accountStatus: getAccountStatus(user, presence, approvals),
      assignedFarmNames: getUserFarmNames(user, farms),
    }));

  const handleAddSubmit = (formData) => addUser(formData);
  const handleEditSubmit = (formData) => updateUser(formModal.user.id, formData);

  return (
    <div className="dashboard-layout">
      <SuperadminSidebar />

      <main className="dashboard-main">
        <div className="dashboard-header">
          <div>
            <h1>Users &amp; Roles</h1>
            <p className="header-subtext">Role-based access for BFAR personnel and farm operators</p>
          </div>

          <div className="header-actions">
            <span className="superadmin-badge">SUPERADMIN</span>
            <button className="add-user-btn" onClick={() => setFormModal({ mode: "add" })}>
              <UserPlus size={16} /> Add user
            </button>
          </div>
        </div>

        <div className="um-toolbar">
          <button className="archive-toolbar-btn" onClick={() => navigate("/superadmin/users/archived")}>
            <Archive size={14} /> Archive
          </button>

          <div className="um-filters">
            <div className="dropdown-wrapper">
              <button
                className="filter-dropdown-btn"
                onClick={() => setOpenDropdown(openDropdown === "role" ? null : "role")}
              >
                ROLE: {roleFilter} <ChevronDown size={14} />
              </button>
              {openDropdown === "role" && (
                <div className="filter-dropdown-menu">
                  {roleOptions.map((opt) => (
                    <button key={opt} onClick={() => { setRoleFilter(opt); setOpenDropdown(null); }}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="dropdown-wrapper">
              <button
                className="filter-dropdown-btn"
                onClick={() => setOpenDropdown(openDropdown === "status" ? null : "status")}
              >
                STATUS: {statusFilter} <ChevronDown size={14} />
              </button>
              {openDropdown === "status" && (
                <div className="filter-dropdown-menu">
                  {statusOptions.map((opt) => (
                    <button key={opt} onClick={() => { setStatusFilter(opt); setOpenDropdown(null); }}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="search-box um-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="um-table-card">
          <div className="um-table-header-row">
            <span>USER</span>
            <span>ROLE</span>
            <span>FARM</span>
            <span>STATUS</span>
            <span>LAST SEEN</span>
            <span></span>
          </div>

          {filteredUsers.map((user) => (
            <div className="um-table-row" key={user.id}>
              <div className="um-user-cell">
                <div className="user-avatar">{user.firstName[0]}{user.lastName[0]}</div>
                <div>
                  <button className="um-user-name" onClick={() => setProfileUser(user)}>
                    {user.firstName} {user.lastName}
                  </button>
                  <p className="um-user-email">{user.email}</p>
                </div>
              </div>

              <span><span className="role-pill">{user.role}</span></span>

              <span className="um-farm-cell">{user.assignedFarmNames}</span>

              <span>
                <span className={"status-dot-text status-dot-text-" + user.accountStatus.toLowerCase()}>
                  {user.accountStatus}
                </span>
              </span>

              <span className="um-last-seen">{getLastSeen(user, presence, now)}</span>

              <span className="um-row-actions">
                <button
                  className="row-action-btn"
                  aria-label={`View profile for ${user.firstName} ${user.lastName}`}
                  title="View profile"
                  onClick={() => setProfileUser(user)}
                >
                  <Eye size={16} />
                </button>
                <button className="row-action-btn row-action-danger" onClick={() => setConfirmArchive(user)}>
                  <Trash2 size={16} />
                </button>
                <button className="row-action-btn" onClick={() => setFormModal({ mode: "edit", user })}>
                  <Pencil size={16} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </main>

      {formModal?.mode === "add" && (
        <UserFormModal
          mode="add"
          onClose={() => setFormModal(null)}
          onSubmit={handleAddSubmit}
        />
      )}

      {formModal?.mode === "edit" && (
        <UserFormModal
          mode="edit"
          initialData={formModal.user}
          onClose={() => setFormModal(null)}
          onSubmit={handleEditSubmit}
          onArchiveClick={() => {
            setFormModal(null);
            setConfirmArchive(formModal.user);
          }}
        />
      )}

      {confirmArchive && (
        <ConfirmModal
          title="Archive this account?"
          message={`${confirmArchive.firstName} ${confirmArchive.lastName} will be moved to Archived Accounts. You can restore it anytime.`}
          confirmLabel="Archive"
          danger
          onClose={() => setConfirmArchive(null)}
          onConfirm={() => archiveUser(confirmArchive.id)}
        />
      )}

      {profileUser && (
        <Modal onClose={() => setProfileUser(null)}>
          <div className="um-profile-content">
            <div className="um-profile-heading">
              <div className="user-avatar">{profileUser.firstName[0]}{profileUser.lastName[0]}</div>
              <div>
                <h2>{profileUser.firstName} {profileUser.lastName}</h2>
                <span className="role-pill">{profileUser.role}</span>
              </div>
            </div>
            <dl className="um-profile-details">
              <div><dt>Email</dt><dd>{profileUser.email || "—"}</dd></div>
              <div><dt>Phone</dt><dd>{profileUser.phone || "—"}</dd></div>
              <div><dt>Farm</dt><dd>{profileUser.farmName || getUserFarmNames(profileUser, farms)}</dd></div>
              <div><dt>Address</dt><dd>{[profileUser.street, profileUser.barangay, profileUser.city].filter(Boolean).join(", ") || "—"}</dd></div>
              <div><dt>Status</dt><dd>{getAccountStatus(profileUser, presence, approvals)}</dd></div>
              <div><dt>Last seen</dt><dd>{getLastSeen(profileUser, presence, now)}</dd></div>
            </dl>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default UserManagement;