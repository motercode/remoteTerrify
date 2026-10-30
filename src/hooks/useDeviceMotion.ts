"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { magnitude } from "@/lib/motion/evaluate";
import type { AppConfig, MotionSample } from "@/lib/motion/types";

export type MotionStatus =
  | "idle"
  | "unsupported"
  | "insecure"
  | "denied"
  | "waiting"
  | "active";

/** Duración del historial: cubre el gráfico (10 s) y los picos (30 s). */
const HISTORY_MS = 30_000;

interface IOSDeviceMotionEvent {
  requestPermission?: () => Promise<"granted" | "denied">;
}

/**
 * Escucha `devicemotion`, aplica un filtro paso-bajo y entrega cada muestra
 * a `onSample`. El historial vive en un ref para no re-renderizar a 60 Hz.
 */
export function useDeviceMotion(
  source: AppConfig["source"],
  smoothing: number,
  onSample: (s: MotionSample) => void,
) {
  const [status, setStatus] = useState<MotionStatus>("idle");
  const history = useRef<MotionSample[]>([]);
  const filtered = useRef<{ x: number; y: number; z: number } | null>(null);
  const settings = useRef({ source, smoothing, onSample });

  useEffect(() => {
    settings.current = { source, smoothing, onSample };
  });

  // Al cambiar de fuente el filtro arrastraría la gravedad: se reinicia.
  useEffect(() => {
    filtered.current = null;
  }, [source]);

  /** Inyecta una muestra (sensor real o simulador). */
  const push = useCallback((x: number, y: number, z: number) => {
    const a = settings.current.smoothing;
    const prev = filtered.current;
    const f = prev
      ? {
          x: a * prev.x + (1 - a) * x,
          y: a * prev.y + (1 - a) * y,
          z: a * prev.z + (1 - a) * z,
        }
      : { x, y, z };
    filtered.current = f;

    const now = performance.now();
    const sample: MotionSample = { ...f, mag: magnitude(f.x, f.y, f.z), t: now };
    const h = history.current;
    h.push(sample);
    while (h.length && h[0].t < now - HISTORY_MS) h.shift();
    settings.current.onSample(sample);
  }, []);

  const handler = useCallback(
    (e: DeviceMotionEvent) => {
      const acc =
        settings.current.source === "linear"
          ? e.acceleration
          : e.accelerationIncludingGravity;
      if (acc?.x == null || acc.y == null || acc.z == null) return;
      setStatus((s) => (s === "active" ? s : "active"));
      push(acc.x, acc.y, acc.z);
    },
    [push],
  );

  useEffect(() => {
    return () => window.removeEventListener("devicemotion", handler);
  }, [handler]);

  /** Debe llamarse desde un gesto del usuario (iOS lo exige). */
  const start = useCallback(async () => {
    if (!window.isSecureContext) return setStatus("insecure");
    if (typeof DeviceMotionEvent === "undefined") return setStatus("unsupported");
    const ios = DeviceMotionEvent as unknown as IOSDeviceMotionEvent;
    if (typeof ios.requestPermission === "function") {
      try {
        if ((await ios.requestPermission()) !== "granted") return setStatus("denied");
      } catch {
        return setStatus("denied");
      }
    }
    window.removeEventListener("devicemotion", handler);
    window.addEventListener("devicemotion", handler);
    // En escritorio el evento existe pero nunca llega: se queda en "waiting".
    setStatus((s) => (s === "active" ? s : "waiting"));
  }, [handler]);

  return { status, start, history, push };
}
