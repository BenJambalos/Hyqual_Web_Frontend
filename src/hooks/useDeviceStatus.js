import { useEffect, useState } from "react";
import { api } from "../api/client";

export const DEVICE_SENSORS = [
  { key: "temperature", label: "Temp" },
  { key: "ph", label: "pH" },
  { key: "do", label: "DO" },
  { key: "ec", label: "EC" },
];

export function useDeviceStatus() {
  const [batteryPercent, setBatteryPercent] = useState(null);
  const [sensorStatus, setSensorStatus] = useState({});
  const [assignment, setAssignment] = useState(null);

  useEffect(() => {
    let active = true;
    let timer;

    const refresh = async () => {
      try {
        const [battery, status, nextAssignment] = await Promise.all([
          api.deviceState("battery"),
          api.deviceState("status"),
          api.deviceState("assignment"),
        ]);
        if (!active) return;

        const percent = Number(battery?.percent);
        setBatteryPercent(Number.isFinite(percent) ? percent : null);
        setSensorStatus(Object.fromEntries(DEVICE_SENSORS.map(({ key }) => [
          key,
          {
            online: status?.[key]?.working === true,
            lastUpdated: status?.[key]?.createdAt ?? null,
          },
        ])));
        setAssignment(nextAssignment?.farmId != null && nextAssignment?.pondId != null
          ? { farmId: Number(nextAssignment.farmId), pondId: String(nextAssignment.pondId) }
          : null);
      } catch (error) {
        if (active) console.error("Unable to load device status:", error);
      } finally {
        if (active) timer = window.setTimeout(refresh, 5000);
      }
    };

    refresh();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const statusReady = Object.keys(sensorStatus).length === DEVICE_SENSORS.length;
  const deviceOnline = statusReady && DEVICE_SENSORS.every(({ key }) => sensorStatus[key]?.online);

  return { batteryPercent, sensorStatus, assignment, statusReady, deviceOnline };
}
