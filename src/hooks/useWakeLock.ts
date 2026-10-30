"use client";

import { useEffect, useState } from "react";

/**
 * Mantiene la pantalla encendida mientras `active` sea true: con la pantalla
 * apagada el navegador deja de entregar eventos del acelerómetro.
 */
export function useWakeLock(active: boolean) {
  const [held, setHeld] = useState(false);
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  useEffect(() => {
    if (!active || !supported) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) return void s.release();
        sentinel = s;
        setHeld(true);
        s.addEventListener("release", () => setHeld(false));
      } catch {
        setHeld(false);
      }
    };

    // El bloqueo se pierde al ocultar la pestaña; se recupera al volver.
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
      setHeld(false);
    };
  }, [active, supported]);

  return { supported, held };
}
