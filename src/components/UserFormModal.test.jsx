import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import UserFormModal from "./UserFormModal";

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
});
