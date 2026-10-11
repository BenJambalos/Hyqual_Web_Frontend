import { useMemo } from "react";
import { useCollection } from "./useCollection";

export function useDevices() {
  const { items, loading, error } = useCollection("devices");

  const devices = useMemo(() => items.map((item) => ({
    id: String(item.id).replace(/^device_/, ""),
    name: item.deviceName,
    status: item.status,
    connectivityStatus: item.connectivityStatus ?? "unknown",
    batteryPercentage: item.batteryPercentage ?? null,
    signalStrength: item.signalStrength ?? null,
    activeSensorsCount: item.activeSensorsCount ?? 0,
    lastSeenAt: item.lastSeenAt ?? null,
    farm: item.farmId,
    pond: item.pondId,
    registered: item.installedAt
      ? new Date(item.installedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : null,
    farmId: item.farmId,
    pondId: item.pondId,
  })), [items]);

  return { devices, loading, error };
}
