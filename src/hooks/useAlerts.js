import { useMemo } from "react";
import { useCollection } from "./useCollection";
import { useFarms } from "./useFarms";
import { useLiveReading } from "./useLiveReading";
import { useDeviceStatus } from "./useDeviceStatus";
import { LIVE_DEVICE_TARGET } from "../config/liveDeviceConfig";
import { buildReadingAlerts, getAlertTimestamp, normalizeStoredAlerts } from "../utils/alertHelpers";

export function useAlerts() {
  const { items, loading: alertsLoading, error: alertsError } = useCollection("alerts");
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();
  const { history } = useLiveReading();
  const { statusReady, deviceOnline } = useDeviceStatus();

  const alerts = useMemo(() => {
    const storedAlerts = normalizeStoredAlerts(items, farms);
    const generatedAlerts = buildReadingAlerts(history, farms);
    const offlineAlerts = statusReady && !deviceOnline ? [{
      id: "device-offline",
      farmId: LIVE_DEVICE_TARGET.farmId,
      pondId: LIVE_DEVICE_TARGET.pondId,
      farmName: farms.find((farm) => String(farm.id) === String(LIVE_DEVICE_TARGET.farmId))?.name ?? "",
      pond: LIVE_DEVICE_TARGET.pondId,
      status: "offline",
      riskLabel: "Communication",
      parameter: "Device",
      message: "Monitoring device is offline and is not sending readings.",
      trend: "No current data",
      displayTime: "Now",
      date: new Date().toISOString().slice(0, 10),
      daysAgo: 0,
      createdAt: new Date().toISOString(),
    }] : [];

    return [...generatedAlerts, ...offlineAlerts, ...storedAlerts]
      .sort((a, b) => getAlertTimestamp(b.createdAt) - getAlertTimestamp(a.createdAt));
  }, [items, farms, history, statusReady, deviceOnline]);

  return {
    alerts,
    // Stored alerts can render while the larger RTDB history is still loading.
    // Reading-derived alerts are added automatically when that subscription updates.
    loading: alertsLoading || farmsLoading,
    error: alertsError || farmsError,
  };
}
