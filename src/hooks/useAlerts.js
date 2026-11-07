import { useMemo } from "react";
import { useCollection } from "./useCollection";
import { useFarms } from "./useFarms";
import { useLiveReading } from "./useLiveReading";
import { buildOfflineDeviceAlerts } from "../utils/monitoringStatus";
import {
  getAlertTimestamp,
  normalizeStoredAlerts,
  reconcileReadingAlerts,
} from "../utils/alertHelpers";

export function useAlerts() {
  const { items, loading: alertsLoading, error: alertsError } = useCollection("alerts");
  const { farms, loading: farmsLoading, error: farmsError } = useFarms();
  const { history } = useLiveReading();
  const offlineAlerts = useMemo(
    () => farmsLoading ? [] : buildOfflineDeviceAlerts(farms),
    [farms, farmsLoading],
  );
  const storedAlerts = normalizeStoredAlerts(items, farms);
  const generatedAlerts = reconcileReadingAlerts(history, farms);
  const alerts = [...generatedAlerts, ...offlineAlerts, ...storedAlerts]
    .sort((a, b) => (getAlertTimestamp(b.createdAt)?.getTime() ?? 0)
      - (getAlertTimestamp(a.createdAt)?.getTime() ?? 0));

  return {
    alerts,
    // Stored alerts can render while the larger RTDB history is still loading.
    // Reading-derived alerts are added automatically when that subscription updates.
    loading: alertsLoading || farmsLoading,
    error: alertsError || farmsError,
  };
}
