"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Capacitor,
  registerPlugin,
  type PermissionState,
  type PluginListenerHandle,
} from "@capacitor/core";
import { log } from "@/lib/log";
import { MIN_SCAN_INTERVAL_MS, type WifiNetwork } from "@/lib/wifi/types";

export type WifiStatus = "unsupported" | "off" | "denied" | "locationOff" | "scanning";

interface WifiScanResults {
  networks: WifiNetwork[];
  locationEnabled: boolean;
}

/** Plugin nativo de android/app/src/main/java/.../WifiScanPlugin.java. */
interface WifiScanPlugin {
  checkPermissions(): Promise<{ location: PermissionState }>;
  requestPermissions(): Promise<{ location: PermissionState }>;
  startScan(): Promise<{ started: boolean }>;
  getResults(): Promise<WifiScanResults>;
  addListener(
    event: "scanResults",
    fn: (r: WifiScanResults) => void,
  ): Promise<PluginListenerHandle>;
}

const WifiScan = registerPlugin<WifiScanPlugin>("WifiScan");

async function ensurePermission(): Promise<boolean> {
  const { location } = await WifiScan.checkPermissions();
  if (location === "granted") return true;
  return (await WifiScan.requestPermissions()).location === "granted";
}

/**
 * Escanea las redes WiFi visibles cada `intervalMs` mientras `enabled` y entrega
 * los SSID de cada escaneo nuevo a `onScan`. Solo funciona dentro de la app Android.
 */
export function useWifiScan(
  enabled: boolean,
  intervalMs: number,
  onScan: (ssids: string[]) => void,
) {
  const native = Capacitor.isNativePlatform();
  const [problem, setProblem] = useState<"denied" | "locationOff" | null>(null);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);
  const settings = useRef({ enabled, onScan });

  useEffect(() => {
    settings.current = { enabled, onScan };
  });

  /** fresh = escaneo nuevo; los resultados en caché solo refrescan la lista. */
  const handle = useCallback((r: WifiScanResults, fresh: boolean) => {
    setNetworks([...r.networks].sort((a, b) => b.level - a.level));
    setLastScanAt(new Date());
    const { enabled, onScan } = settings.current;
    setProblem(r.locationEnabled ? null : "locationOff");
    if (fresh && enabled && r.locationEnabled) onScan(r.networks.map((n) => n.ssid));
  }, []);

  useEffect(() => {
    if (!native) return;
    const sub = WifiScan.addListener("scanResults", (r) => handle(r, true));
    return () => void sub.then((s) => s.remove());
  }, [native, handle]);

  const scanNow = useCallback(async () => {
    if (!native) return;
    try {
      if (!(await ensurePermission())) {
        setProblem("denied");
        return;
      }
      const { started } = await WifiScan.startScan();
      // Si arranca, los resultados llegan por el evento "scanResults".
      if (!started) {
        log("warn", "WiFi: Android ha limitado el escaneo, se muestran los últimos resultados");
        handle(await WifiScan.getResults(), false);
      }
    } catch (e) {
      log("error", `WiFi: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [native, handle]);

  useEffect(() => {
    if (!native || !enabled) return;
    const scan = () => void scanNow();
    const first = setTimeout(scan, 0);
    const id = setInterval(scan, Math.max(MIN_SCAN_INTERVAL_MS, intervalMs));
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [native, enabled, intervalMs, scanNow]);

  const status: WifiStatus = !native
    ? "unsupported"
    : !enabled
      ? "off"
      : (problem ?? "scanning");

  return { status, networks, lastScanAt, scanNow };
}
