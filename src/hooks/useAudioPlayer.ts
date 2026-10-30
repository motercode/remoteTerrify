"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { describeError, log } from "@/lib/log";
import { getAudio } from "@/lib/storage/audioStore";

const MEDIA_ERRORS: Record<number, string> = {
  1: "reproducción abortada",
  2: "error de red al cargar el audio",
  3: "no se pudo decodificar el audio (archivo dañado o códec no soportado)",
  4: "formato de audio no soportado por este navegador",
};

/**
 * Un único <audio> para toda la app. Sale por la salida por defecto del
 * móvil, así que un altavoz Bluetooth emparejado se usa automáticamente.
 */
export function useAudioPlayer(
  audioId: string | null,
  loop: boolean,
  volume: number,
  onEnded: () => void,
) {
  const el = useRef<HTMLAudioElement | null>(null);
  const url = useRef<string | null>(null);
  const onEndedRef = useRef(onEnded);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = audioId !== null && loadedId === audioId;

  useEffect(() => {
    onEndedRef.current = onEnded;
  });

  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    const handlers: Partial<Record<keyof HTMLMediaElementEventMap, () => void>> = {
      ended: () => {
        setPlaying(false);
        log("info", "Audio terminado");
        onEndedRef.current();
      },
      playing: () => {
        setPlaying(true);
        log("info", `Audio sonando (volumen ${Math.round(a.volume * 100)}%${a.muted ? ", silenciado" : ""})`);
      },
      pause: () => setPlaying(false),
      loadedmetadata: () => log("info", `Audio cargado: ${a.duration.toFixed(1)} s`),
      error: () => {
        // Sin src no hay nada que reportar (se quita a propósito al deseleccionar).
        if (!a.getAttribute("src")) return;
        const code = a.error?.code ?? 0;
        const msg = MEDIA_ERRORS[code] ?? `error de audio desconocido (${code})`;
        setError(msg);
        log("error", `Audio: ${msg}${a.error?.message ? ` — ${a.error.message}` : ""}`);
      },
      stalled: () => log("warn", "Audio: la carga se ha detenido (stalled)"),
    };
    for (const [ev, fn] of Object.entries(handlers)) a.addEventListener(ev, fn);
    el.current = a;
    return () => {
      for (const [ev, fn] of Object.entries(handlers)) a.removeEventListener(ev, fn);
      a.pause();
      el.current = null;
    };
  }, []);

  useEffect(() => {
    if (el.current) {
      el.current.loop = loop;
      el.current.volume = volume;
    }
  }, [loop, volume]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = audioId ? await getAudio(audioId) : undefined;
      if (cancelled || !el.current) return;
      if (audioId && !stored) log("warn", "El audio seleccionado ya no existe en el almacenamiento");
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = stored ? URL.createObjectURL(stored.blob) : null;
      el.current.pause();
      if (url.current) el.current.src = url.current;
      else el.current.removeAttribute("src");
      setError(null);
      setLoadedId(stored ? stored.id : null);
      if (stored) {
        const type = stored.blob.type || "tipo desconocido";
        const playable = stored.blob.type ? el.current.canPlayType(stored.blob.type) : "";
        log(
          playable === "" && stored.blob.type ? "warn" : "info",
          `Audio seleccionado: ${stored.name} (${type}, ${(stored.blob.size / 1024).toFixed(0)} KB)` +
            (playable === "" && stored.blob.type ? " — el navegador dice que no soporta este tipo" : ""),
        );
      }
    })().catch((e: unknown) => {
      setError(describeError(e));
      log("error", `No se pudo cargar el audio: ${describeError(e)}`);
    });
    return () => {
      cancelled = true;
    };
  }, [audioId]);

  useEffect(
    () => () => {
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );

  /**
   * Llamar desde un gesto (botón ARMAR): reproduce el propio audio silenciado
   * y lo pausa. Así el navegador (sobre todo iOS) permite reproducirlo después
   * sin interacción, cuando lo dispare el acelerómetro.
   */
  const unlock = useCallback(async () => {
    const a = el.current;
    if (!a || !url.current) return;
    a.muted = true;
    try {
      await a.play();
      log("info", "Audio desbloqueado para reproducción automática");
    } catch (e) {
      log("warn", `No se pudo desbloquear el audio: ${describeError(e)}`);
    } finally {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    }
  }, []);

  const play = useCallback(async () => {
    const a = el.current;
    if (!a) return;
    if (!url.current) {
      log("warn", "No hay audio cargado: elige uno en la pestaña Audio");
      return;
    }
    a.muted = false;
    a.currentTime = 0;
    try {
      await a.play();
      setError(null);
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      log(
        "error",
        e instanceof DOMException && e.name === "NotAllowedError"
          ? `El navegador bloqueó la reproducción automática (${msg}). Pulsa ARMAR o Probar audio para desbloquearla.`
          : `No se pudo reproducir: ${msg}`,
      );
    }
  }, []);

  const stop = useCallback(() => {
    const a = el.current;
    if (!a || a.paused) return;
    a.pause();
    a.currentTime = 0;
    log("info", "Audio parado");
  }, []);

  return { ready, playing, error, unlock, play, stop };
}

/**
 * Pitido generado con Web Audio: comprueba que la salida de sonido funciona
 * (altavoz/Bluetooth) sin depender del archivo subido.
 */
export async function playTestBeep(volume: number): Promise<void> {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      log("error", "Este navegador no soporta Web Audio");
      return;
    }
    const ctx = new Ctx();
    if (ctx.state === "suspended") await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = Math.max(0.05, volume) * 0.3;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    osc.onended = () => void ctx.close();
    log("info", `Pitido de prueba (estado del contexto: ${ctx.state}, ${ctx.sampleRate} Hz)`);
  } catch (e) {
    log("error", `Pitido de prueba falló: ${describeError(e)}`);
  }
}
