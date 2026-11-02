"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useDeviceMotion, type MotionStatus } from "@/hooks/useDeviceMotion";
import { log } from "@/lib/log";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useWifiScan, type WifiStatus } from "@/hooks/useWifiScan";
import {
  INITIAL_STATE,
  isAudible,
  step,
  type MachineConfig,
  type MachineEvent,
} from "@/lib/engine/machine";
import { evaluateRuleSet } from "@/lib/motion/evaluate";
import type { AppConfig, MotionSample } from "@/lib/motion/types";
import { INITIAL_WIFI_TRACKER, stepWifi } from "@/lib/wifi/detect";

const TICK_MS = 50;

const MOTION_STATUS_TEXT: Record<MotionStatus, string> = {
  idle: "sin activar",
  waiting: "activado, esperando datos",
  active: "recibiendo datos",
  insecure: "bloqueado: la página no está en HTTPS",
  unsupported: "este navegador no tiene acelerómetro",
  denied: "permiso denegado",
};

const WIFI_STATUS_TEXT: Record<WifiStatus, string> = {
  unsupported: "solo disponible en la app Android",
  off: "desactivado",
  denied: "permiso de ubicación denegado",
  locationOff: "la ubicación del móvil está desactivada",
  scanning: "escaneando",
};

function machineConfig(c: AppConfig): MachineConfig {
  return {
    start: { holdMs: c.start.holdMs, delayMs: c.start.delayMs },
    stop: { holdMs: c.stop.holdMs, delayMs: c.stop.delayMs },
  };
}

/** Une sensor + WiFi + máquina de estados + audio. Toda la lógica de decisión está en machine.ts. */
export function useEngine(config: AppConfig) {
  const [state, setState] = useState(INITIAL_STATE);
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  });

  const dispatch = useCallback((event: MachineEvent) => {
    setState((s) => step(s, event, machineConfig(configRef.current)));
  }, []);

  const onSample = useCallback(
    (s: MotionSample) => {
      const c = configRef.current;
      dispatch({
        type: "SAMPLE",
        now: s.t,
        startMatch: evaluateRuleSet(c.start, s),
        stopMatch: evaluateRuleSet(c.stop, s),
      });
    },
    [dispatch],
  );

  const wifiTracker = useRef(INITIAL_WIFI_TRACKER);
  const onWifiScan = useCallback(
    (ssids: string[]) => {
      const c = configRef.current.wifi;
      const r = stepWifi(wifiTracker.current, ssids, c);
      wifiTracker.current = r.tracker;
      const now = performance.now();
      if (r.start) {
        log("info", `WiFi: aparece «${c.startSsid.trim()}»`);
        dispatch({ type: "TRIGGER_START", now, source: "wifi" });
      }
      if (r.stop) {
        log("info", `WiFi: perdida «${c.stopSsid.trim()}»`);
        dispatch({ type: "TRIGGER_STOP", now, source: "wifi" });
      }
    },
    [dispatch],
  );

  const motion = useDeviceMotion(config.source, config.smoothing, onSample);
  const audio = useAudioPlayer(config.audioId, config.loop, config.volume, () =>
    dispatch({ type: "AUDIO_ENDED" }),
  );
  const wifi = useWifiScan(config.wifi.enabled, config.wifi.scanIntervalMs, onWifiScan);
  const armed = state.phase !== "DISARMED";
  const wakeLock = useWakeLock(armed);

  // Los delays vencen aunque no lleguen muestras.
  const pending = state.deadline !== null;
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => dispatch({ type: "TICK", now: performance.now() }), TICK_MS);
    return () => clearInterval(id);
  }, [pending, dispatch]);

  const { phase, lastSource } = state;
  useEffect(() => {
    log("info", `Estado: ${phase}${lastSource ? ` (origen: ${lastSource})` : ""}`);
  }, [phase, lastSource]);

  useEffect(() => {
    const failed = ["insecure", "unsupported", "denied"].includes(motion.status);
    log(failed ? "error" : "info", `Sensor: ${MOTION_STATUS_TEXT[motion.status]}`);
  }, [motion.status]);

  useEffect(() => {
    const failed = ["denied", "locationOff"].includes(wifi.status);
    log(failed ? "error" : "info", `WiFi: ${WIFI_STATUS_TEXT[wifi.status]}`);
  }, [wifi.status]);

  // El audio sigue a la fase: suena al entrar en zona audible y para al salir.
  const audible = isAudible(state.phase);
  const { play, stop } = audio;
  useEffect(() => {
    if (audible) void play();
    else stop();
  }, [audible, play, stop]);

  const arm = useCallback(async () => {
    await audio.unlock();
    // Una red de inicio ya visible al armar cuenta como recién aparecida.
    wifiTracker.current = INITIAL_WIFI_TRACKER;
    dispatch({ type: "ARM" });
  }, [audio, dispatch]);

  return { state, dispatch, arm, motion, audio, wakeLock, wifi };
}
