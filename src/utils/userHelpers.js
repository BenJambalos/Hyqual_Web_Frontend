export function getFullName(user) {
  if (!user) return "Guest";
  return `${user.firstName} ${user.lastName}`;
}

export function getInitials(user) {
  if (!user) return "?";
  return `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`;
}