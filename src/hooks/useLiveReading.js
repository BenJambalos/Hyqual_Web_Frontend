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
    const key = `${entry.pondId ?? ""}:${entry.createdAt}`;
    const current = historyByTimestamp.get(key) || { pondId: entry.pondId };
    current[param] = entry.value;
    historyByTimestamp.set(key, current);
  }));

  const history = [...historyByTimestamp.entries()]
    .map(([key, values]) => {
      const createdAt = key.slice(key.indexOf(":") + 1);
      const sal = ecToSalinity(values.ec);
      return {
        pondId: values.pondId,
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

export function useLiveReading(pondId, farmId) {
  const [result, setResult] = useState({
    pondId,
    farmId,
    reading: null,
    history: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let timer;
    const params = ["temperature", "ph", "do", "ec"];

    const refresh = async () => {
      try {
        const values = await Promise.all(params.map((param) => api.readings(param, { pondId, farmId })));
        if (!active) return;
        const data = buildReadingData(Object.fromEntries(params.map((param, index) => [
          param,
          values[index],
        ])));
        setResult({
          pondId,
          farmId,
          reading: data.reading,
          history: data.history,
          loading: false,
          error: null,
        });
      } catch (error) {
        if (active) {
          console.error("Unable to load live readings:", error);
          setResult({
            pondId,
            farmId,
            reading: null,
            history: [],
            loading: false,
            error,
          });
        }
      } finally {
        if (active) timer = window.setTimeout(refresh, 5000);
      }
    };

    refresh();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [pondId, farmId]);

  return result.pondId === pondId && result.farmId === farmId
    ? result
    : { reading: null, history: [], loading: true, error: null };
}
