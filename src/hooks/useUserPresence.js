import { useEffect, useState } from "react";
import { api } from "../api/client";

const HEARTBEAT_INTERVAL_MS = 30000;
const PRESENCE_REFRESH_INTERVAL_MS = 15000;

export function useUserPresence(trackCurrentUser = true) {
  const [presence, setPresence] = useState({});

  useEffect(() => {
    let active = true;
    let timer;

    if (trackCurrentUser) {
      const heartbeat = async () => {
        try {
          await api.heartbeat();
        } catch (error) {
          if (active && error.status !== 401) {
            console.error("Unable to update user presence:", error);
          }
        } finally {
          if (active) timer = window.setTimeout(heartbeat, HEARTBEAT_INTERVAL_MS);
        }
      };
      heartbeat();
    } else {
      const refreshPresence = async () => {
        try {
          const nextPresence = await api.presence();
          if (active) setPresence(nextPresence);
        } catch (error) {
          if (active) console.error("Unable to load user presence:", error);
        } finally {
          if (active) timer = window.setTimeout(refreshPresence, PRESENCE_REFRESH_INTERVAL_MS);
        }
      };
      refreshPresence();
    }

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trackCurrentUser]);

  return presence;
}
