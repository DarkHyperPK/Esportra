import { useEffect, useRef, useState } from "react";
import type { HubConnection } from "@microsoft/signalr";
import { buildHubConnection, HubPaths, startWithRetry } from "@/lib/signalrClient";

type PublicVetoRealtimePayload = {
  sessionId?: string;
};

type UsePublicVetoRealtimeOptions = {
  sessionId?: string;
  enabled?: boolean;
  actingRef: React.RefObject<boolean>;
  onUpdated: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
};

export const usePublicVetoRealtime = ({
  sessionId,
  enabled = true,
  actingRef,
  onUpdated,
  onReset,
}: UsePublicVetoRealtimeOptions) => {
  const connectionRef = useRef<HubConnection | null>(null);
  const [connected, setConnected] = useState(false);
  const onUpdatedRef = useRef(onUpdated);
  const onResetRef = useRef(onReset);

  useEffect(() => {
    onUpdatedRef.current = onUpdated;
  }, [onUpdated]);

  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      setConnected(false);
      return;
    }

    let mounted = true;
    const connection = buildHubConnection(HubPaths.Veto);
    connectionRef.current = connection;

    const matchesSession = (payload: PublicVetoRealtimePayload) =>
      !payload?.sessionId || payload.sessionId === sessionId;

    const handleUpdated = (payload: PublicVetoRealtimePayload) => {
      if (!mounted || !matchesSession(payload) || actingRef.current) return;
      void onUpdatedRef.current();
    };

    const handleReset = (payload: PublicVetoRealtimePayload) => {
      if (!mounted || !matchesSession(payload) || actingRef.current) return;
      void onResetRef.current();
    };

    connection.on("PublicVetoUpdated", handleUpdated);
    connection.on("PublicVetoReset", handleReset);

    startWithRetry(connection)
      .then(async () => {
        if (!mounted) return;
        await connection.invoke("JoinPublicToolVeto", sessionId);
        if (mounted) setConnected(true);
      })
      .catch((error) => {
        console.error("[PublicVetoRealtime] Failed to connect:", error);
        if (mounted) setConnected(false);
      });

    connection.onreconnected(async () => {
      if (!mounted || !sessionId) return;
      try {
        await connection.invoke("JoinPublicToolVeto", sessionId);
        if (mounted) setConnected(true);
      } catch (error) {
        console.error("[PublicVetoRealtime] Rejoin failed:", error);
      }
    });

    connection.onclose(() => {
      if (mounted) setConnected(false);
    });

    return () => {
      mounted = false;
      setConnected(false);
      connection.off("PublicVetoUpdated", handleUpdated);
      connection.off("PublicVetoReset", handleReset);
      void connection.invoke("LeavePublicToolVeto", sessionId).catch(() => undefined);
      void connection.stop();
      connectionRef.current = null;
    };
  }, [actingRef, enabled, sessionId]);

  return { connected };
};
