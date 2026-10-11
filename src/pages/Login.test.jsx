import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, test, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

import Login from "./Login";
import ProtectedRoute from "../components/ProtectedRoute";
import { api } from "../api/client";
import { ACTIVE_AUTH_SESSION_KEY } from "../utils/authSession";

vi.mock("../api/client", () => ({
  api: {
    login: vi.fn(),
    currentUser: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  sessionStorage.setItem(ACTIVE_AUTH_SESSION_KEY, "true");
  api.currentUser.mockRejectedValue(Object.assign(new Error("Not authenticated"), { status: 401 }));
  api.logout.mockResolvedValue();
});

describe("Login page", () => {
  test("creates a session-only client session after a successful login", async () => {
    const user = userEvent.setup();
    const account = { id: "user-123", uid: "user-123", role: "Farm Owner", email: "user@example.com" };
    api.login.mockResolvedValue({ user: account });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.queryByRole("checkbox", { name: /remember me/i })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText("Password", { exact: true }), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(api.login).toHaveBeenCalledWith("user@example.com", "password123");
    expect(sessionStorage.getItem(ACTIVE_AUTH_SESSION_KEY)).toBe("true");
    expect(JSON.parse(localStorage.getItem("hyqual_user"))).toEqual(account);
  });

  test("sends a reset request when the forgot-password flow is submitted", async () => {
    const user = userEvent.setup();
    api.requestPasswordReset.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /forgot password\?/i }));
    await user.type(screen.getByLabelText(/email address/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(api.requestPasswordReset).toHaveBeenCalledWith("user@example.com");
    expect(screen.getByText(/if the account exists, a password reset link will be sent/i)).toBeInTheDocument();
  });

  test("blocks non-superadmin users from superadmin routes", async () => {
    api.currentUser.mockResolvedValue({
      user: { id: "user-123", uid: "user-123", role: "Farm Owner", status: "Active" },
    });
    render(
      <MemoryRouter initialEntries={["/superadmin/overview"]}>
        <Routes>
          <Route
            path="/superadmin/overview"
            element={<ProtectedRoute allowedRoles={["Superadmin"]}><div>Superadmin Overview</div></ProtectedRoute>}
          />
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Superadmin Overview")).not.toBeInTheDocument();
  });

  test("blocks superadmin users from administrator routes", async () => {
    api.currentUser.mockResolvedValue({
      user: { id: "admin-123", uid: "admin-123", role: "Superadmin", status: "Active" },
    });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={<ProtectedRoute allowedRoles={["BFAR Admin", "Farm Owner"]}><div>Admin Dashboard</div></ProtectedRoute>}
          />
          <Route path="/superadmin/overview" element={<div>Superadmin Overview</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Superadmin Overview")).toBeInTheDocument();
    expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
  });

  test("redirects pending accounts to login with the account status reason", async () => {
    api.currentUser.mockRejectedValue(Object.assign(
      new Error("This account is not active."),
      { status: 403 }
    ));
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>}
          />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Login")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  test("rejects a restored client session without the session marker", async () => {
    sessionStorage.clear();
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={<ProtectedRoute><div>Dashboard</div></ProtectedRoute>}
          />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Login")).toBeInTheDocument();
    expect(api.currentUser).not.toHaveBeenCalled();
  });
});
