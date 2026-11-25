// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import UserManagement from "./UserManagement";

const mocks = vi.hoisted(() => ({
  addUser: vi.fn(),
  updateUser: vi.fn(),
  archiveUser: vi.fn(),
}));

vi.mock("../../hooks/useUsers", () => ({
  useUsers: () => ({
    users: [],
    addUser: mocks.addUser,
    updateUser: mocks.updateUser,
    archiveUser: mocks.archiveUser,
  }),
}));

vi.mock("../../hooks/useFarms", () => ({ useFarms: () => ({ farms: [] }) }));
vi.mock("../../hooks/useCollection", () => ({ useCollection: () => ({ items: [] }) }));
vi.mock("../../hooks/useUserPresence", () => ({ useUserPresence: () => ({}) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("UserManagement BFAR Admin replacement", () => {
  it("asks for confirmation before creating a BFAR Admin and submits only after confirmation", async () => {
    const user = userEvent.setup();
    mocks.addUser.mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <UserManagement />
      </MemoryRouter>,
    );

    const addButtons = screen.getAllByRole("button", { name: /add user/i });
    await user.click(addButtons[addButtons.length - 1]);
    await user.type(screen.getByPlaceholderText("First name"), "New");
    await user.type(screen.getByPlaceholderText("Last name"), "Admin");
    await user.type(screen.getByPlaceholderText("Email address"), "admin@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    const submitButtons = screen.getAllByRole("button", { name: /add user/i });
    await user.click(submitButtons[submitButtons.length - 1]);

    expect(await screen.findByText(/if an active bfar admin account exists, it will be disabled/i))
      .toBeInTheDocument();
    expect(mocks.addUser).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(mocks.addUser).toHaveBeenCalledWith(expect.objectContaining({
      role: "BFAR Admin",
      email: "admin@example.com",
      replaceActiveAdmin: true,
    }));
  });
});
