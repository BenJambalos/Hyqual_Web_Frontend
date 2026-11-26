// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import UserFormModal from "./UserFormModal";

afterEach(cleanup);

describe("UserFormModal email validation", () => {
  it("shows an error and does not submit an invalid email", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <UserFormModal
        mode="add"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.type(screen.getByPlaceholderText("Email address"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /add user/i }));

    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email address.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps an existing email read-only and omits it from edit submissions", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <UserFormModal
        mode="edit"
        initialData={{
          firstName: "Ada",
          lastName: "Lovelace",
          middleName: "",
          phone: "",
          email: "ada@example.com",
          password: "",
          role: "BFAR Admin",
          farmName: "",
          street: "",
          barangay: "",
          city: "",
        }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const emailInput = screen.getByPlaceholderText("Email address");
    expect(emailInput).toHaveAttribute("readonly");
    expect(emailInput).toHaveValue("ada@example.com");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("email");
  });
});

describe("UserFormModal password visibility", () => {
  it("shows and hides the password being entered", async () => {
    const user = userEvent.setup();

    const { container } = render(
      <UserFormModal
        mode="add"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    const form = within(container);

    const passwordInput = form.getByLabelText("Password");
    await user.type(passwordInput, "example-password");
    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(form.getByRole("button", { name: "Show password" }));
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(passwordInput).toHaveValue("example-password");

    await user.click(form.getByRole("button", { name: "Hide password" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
