"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { DataSource } from "./source";
import type { Topic } from "./types";
import { getSampleDataSource } from "./sample-source";
import { getSupabaseDataSource } from "./supabase-source";

const DataContext = createContext<DataSource | null>(null);

function pickSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? getSupabaseDataSource() : getSampleDataSource();
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [source] = useState<DataSource>(() => pickSource());
  return <DataContext.Provider value={source}>{children}</DataContext.Provider>;
}

export function useDataSource() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataSource must be used inside <DataProvider>");
  return ctx;
}

/**
 * Fetch data and keep it live.
 *
 * Reads from the data source, then re-reads whenever one of `topics` changes
 * (Realtime event, another tab, or a write on this page). Refetching instead of
 * patching keeps the database as the single source of truth for both portals.
 */
export function useLiveQuery<T>(
  load: (ds: DataSource) => Promise<T>,
  topics: Topic[],
): { data: T | undefined; error: Error | null; loading: boolean; refresh: () => void } {
  const ds = useDataSource();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const seq = useRef(0);

  const refresh = useCallback(() => {
    const mine = ++seq.current; // ignore out-of-order responses
    loadRef
      .current(ds)
      .then((d) => {
        if (mine !== seq.current) return;
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if (mine !== seq.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [ds]);

  const topicKey = topics.join("|");
  useEffect(() => {
    refresh();
    const unsub = ds.subscribe(topicKey.split("|") as Topic[], () => refresh());
    // Catch up after the tab was in the background or the network dropped.
    const onWake = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", refresh);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", refresh);
    };
  }, [ds, refresh, topicKey]);

  return { data, error, loading, refresh };
}

export function useConnectionStatus() {
  const ds = useDataSource();
  const [connected, setConnected] = useState(true);
  useEffect(() => ds.onConnectionChange(setConnected), [ds]);
  return connected;
}
