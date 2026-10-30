"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudio } from "@/lib/storage/audioStore";

/** Medio segundo de silencio, para desbloquear la reproducción con un gesto. */
const SILENCE =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

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
  const [error, setError] = useState<string | null>(null);
  const ready = audioId !== null && loadedId === audioId;

  useEffect(() => {
    onEndedRef.current = onEnded;
  });

  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    a.onended = () => onEndedRef.current();
    el.current = a;
    return () => {
      a.pause();
      a.onended = null;
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
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = stored ? URL.createObjectURL(stored.blob) : null;
      el.current.pause();
      if (url.current) el.current.src = url.current;
      else el.current.removeAttribute("src");
      setLoadedId(stored ? stored.id : null);
    })().catch((e: unknown) => setError(String(e)));
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

  /** Llamar desde un gesto (botón ARMAR) para que luego se pueda reproducir solo. */
  const unlock = useCallback(async () => {
    const a = el.current;
    if (!a) return;
    a.src = SILENCE;
    try {
      await a.play();
    } catch {
      // Si el navegador lo rechaza, el primer play() real lo volverá a intentar.
    }
    a.pause();
    if (url.current) a.src = url.current;
    else a.removeAttribute("src");
  }, []);

  const play = useCallback(async () => {
    const a = el.current;
    if (!a || !url.current) return;
    a.currentTime = 0;
    try {
      await a.play();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const stop = useCallback(() => {
    const a = el.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
  }, []);

  return { ready, error, unlock, play, stop };
}
