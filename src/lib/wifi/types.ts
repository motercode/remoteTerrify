export interface WifiNetwork {
  ssid: string;
  bssid: string;
  /** dBm */
  level: number;
}

export interface WifiConfig {
  enabled: boolean;
  /** Red cuya aparición inicia el audio. Vacío = no inicia. */
  startSsid: string;
  /** Red cuya pérdida para el audio. Vacío = no para. */
  stopSsid: string;
  scanIntervalMs: number;
  /** Escaneos seguidos sin ver la red de parada para darla por perdida (a veces se salta redes). */
  lostAfterMisses: number;
}

/** Android limita startScan() a ~4 llamadas cada 2 minutos en primer plano. */
export const MIN_SCAN_INTERVAL_MS = 30_000;

export const DEFAULT_WIFI_CONFIG: WifiConfig = {
  enabled: false,
  startSsid: "",
  stopSsid: "",
  scanIntervalMs: MIN_SCAN_INTERVAL_MS,
  lostAfterMisses: 2,
};
