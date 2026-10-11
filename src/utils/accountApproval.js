export function normalizeReferenceId(value) {
  return value == null ? "" : String(value).replace(/^user_/, "");
}

function findAccountApproval(user, approvals) {
  const userIds = [user.id, user.uid, user.userId]
    .filter(Boolean)
    .map(normalizeReferenceId);

  return approvals.find((approval) => [approval.id, approval.userId, approval.uid]
    .filter(Boolean)
    .map(normalizeReferenceId)
    .some((id) => userIds.includes(id)));
}

export function isApprovedForManagement(user, approvals) {
  const approval = findAccountApproval(user, approvals);
  if (approval) return String(approval.status).toLowerCase() === "approved";

  return ![user.status, user.approvalStatus]
    .some((status) => ["pending", "rejected"].includes(String(status || "").toLowerCase()));
}

export function getAccountStatus(user, presence, approvals) {
  const approval = findAccountApproval(user, approvals);
  if (approval && String(approval.status).toLowerCase() !== "approved") return "Pending";
  if (!approval && !isApprovedForManagement(user, approvals)) return "Pending";
  return presence[user.id]?.state === "online" ? "Active" : "Offline";
}