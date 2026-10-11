import { useMemo } from "react";
import { useCollection } from "./useCollection";

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
        .map((pond) => ({
          id: String(pond.id).replace(/^pond_/, ""),
          name: pond.pondName ?? pond.name ?? pond.id,
          temp: pond.latestReading?.temperature ?? null,
          ph: pond.latestReading?.phLevel ?? null,
          do: pond.latestReading?.dissolvedOxygen ?? null,
          sal: pond.latestReading?.salinity ?? null,
        })),
    };
  }), [sourceFarms, sourcePonds, users]);

  return {
    farms,
    loading: farmsLoading || pondsLoading || usersLoading,
    error: farmsError || pondsError || usersError,
  };
}
