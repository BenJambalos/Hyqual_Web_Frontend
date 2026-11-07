import { useMemo } from "react";
import { useCollection } from "./useCollection";

export function parseDatabaseTimestamp(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`).getTime();
  }
  return new Date(value).getTime();
}

function normalizeReferenceId(value) {
  return value == null ? "" : String(value).replace(/^user_/, "");
}

function getUserName(users, ownerId) {
  const normalizedOwnerId = normalizeReferenceId(ownerId);
  const user = users.find((item) => [
    item.id,
    item.uid,
    item.userId,
  ].some((value) => normalizeReferenceId(value) === normalizedOwnerId));

  if (!user) return "";
  if (user.displayName) return user.displayName;
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

export function useFarms() {
  const { items: sourceFarms, loading: farmsLoading, error: farmsError } = useCollection("farms");
  const { items: sourcePonds, loading: pondsLoading, error: pondsError } = useCollection("ponds");
  const { items: sourceDevices, loading: devicesLoading, error: devicesError } = useCollection("devices");
  const { items: users, loading: usersLoading, error: usersError } = useCollection("directory");

  const farms = useMemo(() => sourceFarms.map((farm) => {
    const ownerId = farm.ownerId ?? farm.owner_id ?? farm.farmerId ?? farm.farmer_id;
    return {
      ...farm,
      id: String(farm.id).replace(/^farm_/, ""),
      name: farm.farmName ?? farm.name ?? "Unnamed farm",
      ownerId,
      owner: getUserName(users, ownerId),
      location: farm.location ?? "Location unavailable",
      lat: Number(farm.latitude),
      lng: Number(farm.longitude),
      ponds: sourcePonds
        .filter((pond) => String(pond.farmId ?? "").replace(/^farm_/, "") === String(farm.id).replace(/^farm_/, ""))
        .map((pond) => {
          const pondId = String(pond.id).replace(/^pond_/, "");
          const now = Date.now();
          const activeDevices = sourceDevices.filter((device) =>
            String(device.pondId ?? "").replace(/^pond_/, "") === pondId
            && String(device.status).toLowerCase() === "active");
          const lastReadingAt = parseDatabaseTimestamp(pond.latestReading?.recordedAt);
          const hasRecentReading = Number.isFinite(lastReadingAt)
            && now - lastReadingAt >= 0
            && now - lastReadingAt <= 5 * 60 * 1000;
          const hasOnlineDevice = activeDevices.some((device) => {
            const lastSeenAt = device.lastSeenAt ? parseDatabaseTimestamp(device.lastSeenAt) : NaN;
            return ["online", "weak"].includes(String(device.connectivityStatus).toLowerCase())
              || (Number.isFinite(lastSeenAt)
                && now - lastSeenAt >= 0
                && now - lastSeenAt <= 5 * 60 * 1000);
          });

          return {
            id: pondId,
            name: pond.pondName ?? pond.name ?? pond.id,
            temp: pond.latestReading?.temperature ?? null,
            ph: pond.latestReading?.phLevel ?? null,
            do: pond.latestReading?.dissolvedOxygen ?? null,
            sal: pond.latestReading?.salinity ?? null,
            registeredDevice: pond.registeredDevice === true || activeDevices.length > 0,
            deviceOnline: pond.deviceOnline === true || (activeDevices.length > 0
              && (hasOnlineDevice || hasRecentReading)),
          };
        }),
    };
  }), [sourceFarms, sourcePonds, sourceDevices, users]);

  return {
    farms,
    loading: farmsLoading || pondsLoading || devicesLoading || usersLoading,
    error: farmsError || pondsError || devicesError || usersError,
  };
}
