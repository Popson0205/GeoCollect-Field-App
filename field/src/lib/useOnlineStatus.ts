// field/src/lib/useOnlineStatus.ts
// React hook: tracks network connectivity and triggers auto-sync on reconnect.
// Also manages Yjs WebSocket connect/disconnect lifecycle.

import { useEffect, useRef, useState, useCallback } from "react";
import { syncPendingFeatures } from "./sync";
import { getYjsRoom }          from "./crdt";

export interface OnlineStatus {
  isOnline:    boolean;
  lastOnline:  Date | null;
  syncPending: boolean;
  triggerSync: () => Promise<void>;
}

export function useOnlineStatus(projectId?: string): OnlineStatus {
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [lastOnline,  setLastOnline]  = useState<Date | null>(null);
  const [syncPending, setSyncPending] = useState(false);
  const syncLock = useRef(false);

  const triggerSync = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return;
    syncLock.current = true;
    setSyncPending(true);
    try {
      await syncPendingFeatures();

      // Reconnect Yjs WebSocket if we have a project room
      if (projectId) {
        const room = await getYjsRoom(projectId);
        await room.connect();
      }
    } catch (err) {
      console.warn("[Sync] Auto-sync failed:", err);
    } finally {
      syncLock.current = false;
      setSyncPending(false);
    }
  }, [projectId]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setLastOnline(new Date());
      await triggerSync();
    };

    const handleOffline = async () => {
      setIsOnline(false);
      // Disconnect Yjs WebSocket gracefully
      if (projectId) {
        const room = await getYjsRoom(projectId).catch(() => null);
        room?.disconnect();
      }
    };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    // Run sync on mount if already online
    if (navigator.onLine) triggerSync();

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [projectId, triggerSync]);

  return { isOnline, lastOnline, syncPending, triggerSync };
}
