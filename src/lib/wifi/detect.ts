/**
 * Convierte escaneos WiFi sucesivos en disparos, pura y testeada.
 *
 * - Inicio: la red de inicio pasa de no visible a visible.
 * - Final: la red de parada, que se había visto, falta en `lostAfterMisses` escaneos seguidos.
 */

import type { WifiConfig } from "./types";

export interface WifiTracker {
  startVisible: boolean;
  stopSeen: boolean;
  stopMisses: number;
}

/** Al armar se parte de aquí: si la red de inicio ya está visible, el primer escaneo dispara. */
export const INITIAL_WIFI_TRACKER: WifiTracker = {
  startVisible: false,
  stopSeen: false,
  stopMisses: 0,
};

export function stepWifi(
  tracker: WifiTracker,
  visibleSsids: string[],
  cfg: Pick<WifiConfig, "startSsid" | "stopSsid" | "lostAfterMisses">,
): { tracker: WifiTracker; start: boolean; stop: boolean } {
  const visible = new Set(visibleSsids.map((s) => s.trim()));
  const startSsid = cfg.startSsid.trim();
  const stopSsid = cfg.stopSsid.trim();

  const startVisible = startSsid !== "" && visible.has(startSsid);
  const start = startVisible && !tracker.startVisible;

  let { stopSeen, stopMisses } = tracker;
  let stop = false;
  if (stopSsid === "") {
    stopSeen = false;
    stopMisses = 0;
  } else if (visible.has(stopSsid)) {
    stopSeen = true;
    stopMisses = 0;
  } else if (stopSeen) {
    stopMisses += 1;
    if (stopMisses >= Math.max(1, cfg.lostAfterMisses)) {
      stop = true;
      stopSeen = false;
      stopMisses = 0;
    }
  }

  return { tracker: { startVisible, stopSeen, stopMisses }, start, stop };
}
