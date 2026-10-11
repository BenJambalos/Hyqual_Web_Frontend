import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api } from "../api/client";
import {
  ACTIVE_AUTH_SESSION_KEY,
  hasActiveAuthSession,
} from "../utils/authSession";

function getAccountBlockReason(userData = {}) {
  if (userData.archived === true) {
    return "This account has been archived. Please contact an administrator.";
  }

  const status = String(userData.status || "").toLowerCase();
  const approvalStatus = String(userData.approvalStatus || "").toLowerCase();

  if (status === "pending" || approvalStatus === "pending") {
    return "Your account is still pending approval.";
  }

  if (status === "inactive" || status === "disabled") {
    return "This account is inactive. Please contact an administrator.";
  }

  return "";
}

function ProtectedRoute({ children, allowedRoles }) {
  const [user, setUser] = useState(null);
  const [blockedReason, setBlockedReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const loadCurrentUser = async () => {
      if (!hasActiveAuthSession()) {
        sessionStorage.removeItem(ACTIVE_AUTH_SESSION_KEY);
        localStorage.removeItem("hyqual_user");
        try {
          await api.logout();
        } catch (error) {
          console.error("Unable to clear a restored session:", error);
        }
        setLoading(false);
        return;
      }

      try {
        const { user: currentUser } = await api.currentUser();
        if (!active) return;
        const reason = getAccountBlockReason(currentUser);
        if (reason) {
          localStorage.removeItem("hyqual_user");
          setBlockedReason(reason);
          setLoading(false);
          return;
        }

        localStorage.setItem("hyqual_user", JSON.stringify(currentUser));
        setUser(currentUser);
      } catch (error) {
        if (!active) return;
        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem("hyqual_user");
          sessionStorage.removeItem(ACTIVE_AUTH_SESSION_KEY);
          if (error.status === 403) setBlockedReason(error.message);
        } else {
          console.error("Failed to verify the current user:", error);
          setLoadError("Unable to verify your account. Please check your connection and try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return null;
  }

  if (blockedReason) {
    return <Navigate to="/login" replace state={{ from: location.pathname, reason: blockedReason }} />;
  }

  if (loadError) {
    return <p role="alert" style={{ padding: 40 }}>{loadError}</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === "Superadmin" ? "/superadmin/overview" : "/dashboard"}
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
