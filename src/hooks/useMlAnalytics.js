import { useEffect, useState } from "react";
import { api } from "../api/client";

const REFRESH_INTERVAL_MS = 60000;

export function useMlAnalytics() {
  const [data, setData] = useState({
    counts: { riskResults: 0, upcomingForecasts: 0 },
    riskResults: [],
    forecasts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let timer;

    const refresh = async () => {
      try {
        const nextData = await api.mlAnalytics();
        if (active) {
          setData(nextData);
          setError(null);
        }
      } catch (nextError) {
        if (active) setError(nextError);
      } finally {
        if (active) {
          setLoading(false);
          timer = window.setTimeout(refresh, REFRESH_INTERVAL_MS);
        }
      }
    };

    refresh();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  return { ...data, loading, error };
}
