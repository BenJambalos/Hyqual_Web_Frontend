export function formatLastSeen(user, presence, now) {
  if (presence[user.id]?.state === "online") return "Now";

  const presenceTimestamp = presence[user.id]?.lastChanged;
  const lastSeenValue = Number.isFinite(presenceTimestamp)
    ? presenceTimestamp
    : user.lastSeen?.toDate?.() ?? user.lastSeen;
  if (lastSeenValue == null || lastSeenValue === "") return "Never";

  const lastSeen = new Date(lastSeenValue);
  if (Number.isNaN(lastSeen.getTime())) return String(lastSeenValue);

  const minutesAgo = Math.max(0, Math.floor((now - lastSeen.getTime()) / 60000));
  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) return `${hoursAgo} hr ago`;
  return lastSeen.toLocaleString();
}
