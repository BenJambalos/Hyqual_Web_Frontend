import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import MultiFarmMonitoring from "./pages/MultiFarmMonitoring";
import FarmDetails from "./pages/FarmDetails";
import PondDetails from "./pages/PondDetails";
import FarmLocationMap from "./pages/FarmLocationMap";
import Alerts from "./pages/Alerts";
import ReportsAnalytics from "./pages/ReportsAnalytics";
import Profile from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

import SuperadminOverview from "./pages/superadmin/SuperadminOverview";
import UserManagement from "./pages/superadmin/UserManagement";
import ArchivedAccounts from "./pages/superadmin/ArchivedAccounts";
import DeviceRegistry from "./pages/superadmin/DeviceRegistry";
import AuditLogs from "./pages/superadmin/AuditLogs";
import AccountApproval from "./pages/superadmin/AccountApproval";
import { useUserPresence } from "./hooks/useUserPresence";

const ADMIN_ROLES = ["BFAR Admin", "Farm Owner"];

function App() {
  useUserPresence();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multi-farm"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <MultiFarmMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multi-farm/:farmId"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <FarmDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/multi-farm/:farmId/:pondId"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <PondDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farm-map"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <FarmLocationMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <Alerts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
              <ReportsAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/superadmin/overview"
          element={
            <ProtectedRoute allowedRoles={["Superadmin"]}>
              <SuperadminOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/users"
          element={
            <ProtectedRoute allowedRoles={["Superadmin"]}>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/users/archived"
          element={
            <ProtectedRoute allowedRoles={["Superadmin"]}>
              <ArchivedAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/devices"
          element={
            <ProtectedRoute allowedRoles={["Superadmin"]}>
              <DeviceRegistry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/logs"
          element={
            <ProtectedRoute allowedRoles={["Superadmin"]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/superadmin/approvals"
          element={
            <ProtectedRoute allowedRoles={["Superadmin"]}>
              <AccountApproval />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;