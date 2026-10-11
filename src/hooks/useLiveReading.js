import { useEffect, useState } from "react";
import { api } from "../api/client";
import { getOverallStatus } from "../utils/thresholds";

function ecToSalinity(ecMillisiemensPerCm) {
  if (ecMillisiemensPerCm == null) return null;
  return Math.round(ecMillisiemensPerCm * 0.64 * 100) / 100;
}

function buildReadingData(entriesByParam) {
  const params = ["temperature", "ph", "do", "ec"];
  const latestByParam = Object.fromEntries(params.map((param) => [
    param,
    entriesByParam[param].at(-1) || null,
  ]));
  const reading = {
    temp: latestByParam.temperature?.value ?? null,
    ph: latestByParam.ph?.value ?? null,
    do: latestByParam.do?.value ?? null,
    sal: ecToSalinity(latestByParam.ec?.value),
    lastUpdated: latestByParam.temperature?.createdAt ?? null,
  };

  const historyByTimestamp = new Map();
  params.forEach((param) => entriesByParam[param].forEach((entry) => {
    const current = historyByTimestamp.get(entry.createdAt) || {};
    current[param] = entry.value;
    historyByTimestamp.set(entry.createdAt, current);
  }));

  const history = [...historyByTimestamp.entries()]
    .map(([createdAt, values]) => {
      const sal = ecToSalinity(values.ec);
      return {
        time: new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        temp: values.temperature ?? null,
        ph: values.ph ?? null,
        do: values.do ?? null,
        sal,
        status: getOverallStatus({
          temp: values.temperature,
          ph: values.ph,
          do: values.do,
          sal,
        }),
        createdAt,
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { reading, history };
}

export function useLiveReading() {
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let timer;
    const params = ["temperature", "ph", "do", "ec"];

    const refresh = async () => {
      try {
        const values = await Promise.all(params.map((param) => api.readings(param)));
        if (!active) return;
        const data = buildReadingData(Object.fromEntries(params.map((param, index) => [
          param,
          values[index],
        ])));
        setReading(data.reading);
        setHistory(data.history);
      } catch (error) {
        if (active) console.error("Unable to load live readings:", error);
      } finally {
        if (active) {
          setLoading(false);
          timer = window.setTimeout(refresh, 5000);
        }
      }
    };

    refresh();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  return { reading, history, loading };
}
