"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useDeviceMotion } from "@/hooks/useDeviceMotion";
import { useWakeLock } from "@/hooks/useWakeLock";
import {
  INITIAL_STATE,
  isAudible,
  step,
  type MachineConfig,
  type MachineEvent,
} from "@/lib/engine/machine";
import { evaluateRuleSet } from "@/lib/motion/evaluate";
import type { AppConfig, MotionSample } from "@/lib/motion/types";

const TICK_MS = 50;

function machineConfig(c: AppConfig): MachineConfig {
  return {
    start: { holdMs: c.start.holdMs, delayMs: c.start.delayMs },
    stop: { holdMs: c.stop.holdMs, delayMs: c.stop.delayMs },
  };
}

/** Une sensor + máquina de estados + audio. Toda la lógica de decisión está en machine.ts. */
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

  const motion = useDeviceMotion(config.source, config.smoothing, onSample);
  const audio = useAudioPlayer(config.audioId, config.loop, config.volume, () =>
    dispatch({ type: "AUDIO_ENDED" }),
  );
  const armed = state.phase !== "DISARMED";
  const wakeLock = useWakeLock(armed);

  // Los delays vencen aunque no lleguen muestras.
  const pending = state.deadline !== null;
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => dispatch({ type: "TICK", now: performance.now() }), TICK_MS);
    return () => clearInterval(id);
  }, [pending, dispatch]);

  // El audio sigue a la fase: suena al entrar en zona audible y para al salir.
  const audible = isAudible(state.phase);
  const { play, stop } = audio;
  useEffect(() => {
    if (audible) void play();
    else stop();
  }, [audible, play, stop]);

  const arm = useCallback(async () => {
    await audio.unlock();
    dispatch({ type: "ARM" });
  }, [audio, dispatch]);

  return { state, dispatch, arm, motion, audio, wakeLock };
}
