import { DEFAULT_CONFIG, type AppConfig } from "@/lib/motion/types";

const KEY = "remoteTerrify.config.v1";

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CONFIG;
    const saved = JSON.parse(raw) as Partial<AppConfig>;
    return {
      ...DEFAULT_CONFIG,
      ...saved,
      start: { ...DEFAULT_CONFIG.start, ...saved.start },
      stop: { ...DEFAULT_CONFIG.stop, ...saved.stop },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    // Almacenamiento no disponible (modo privado): la config vive solo en memoria.
  }
}
