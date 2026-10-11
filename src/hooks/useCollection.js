import { useEffect, useState } from "react";
import { api } from "../api/client";

const REFRESH_INTERVAL_MS = 15000;

export function useCollection(collectionName) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let timer;

    const refresh = async () => {
      try {
        const nextItems = await api.collection(collectionName);
        if (active) {
          setItems(nextItems);
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
  }, [collectionName]);

  return { items, loading, error };
}
