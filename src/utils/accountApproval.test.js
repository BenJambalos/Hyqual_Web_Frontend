import { describe, expect, it } from "vitest";
import { getAccountStatus, isApprovedForManagement } from "./accountApproval";

describe("approved account visibility", () => {
  it("hides a pending account", () => {
    expect(isApprovedForManagement({ id: "owner-1", status: "Pending" }, [])).toBe(false);
  });

  it("shows an approved application even if its user profile is still pending", () => {
    expect(isApprovedForManagement(
      { id: "owner-1", status: "Pending" },
      [{ userId: "owner-1", status: "Approved" }]
    )).toBe(true);
  });

  it("hides a rejected application", () => {
    expect(isApprovedForManagement(
      { id: "owner-1", status: "Active" },
      [{ userId: "owner-1", status: "Rejected" }]
    )).toBe(false);
  });

  it("keeps active accounts created directly by a superadmin", () => {
    expect(isApprovedForManagement({ id: "admin-added", status: "Active" }, [])).toBe(true);
  });

  it("uses heartbeat presence for active and offline account status", () => {
    const admin = { id: "admin-1", status: "Active" };

    expect(getAccountStatus(admin, { "admin-1": { state: "online" } }, [])).toBe("Active");
    expect(getAccountStatus(admin, { "admin-1": { state: "offline" } }, [])).toBe("Offline");
  });
});