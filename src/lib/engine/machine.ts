/**
 * Máquina de estados del disparador, pura y con el tiempo inyectado.
 *
 * DISARMED → ARMED → START_PENDING → PLAYING → STOP_PENDING → ARMED
 *
 * El audio suena en PLAYING y STOP_PENDING. Las fuentes de disparo
 * (acelerómetro, y en el futuro voz) solo emiten eventos; no conocen el audio.
 */

export type Phase =
  | "DISARMED"
  | "ARMED"
  | "START_PENDING"
  | "PLAYING"
  | "STOP_PENDING";

export type TriggerSource = "motion" | "manual" | "voice";

export interface Timing {
  holdMs: number;
  delayMs: number;
}

export interface MachineConfig {
  start: Timing;
  stop: Timing;
}

export interface MachineState {
  phase: Phase;
  /** Momento en que la condición vigilada empezó a cumplirse sin interrupción. */
  matchSince: number | null;
  /** Momento en que vence el delay en las fases *_PENDING. */
  deadline: number | null;
  lastSource: TriggerSource | null;
}

export type MachineEvent =
  | { type: "ARM" }
  | { type: "DISARM" }
  /** Resultado de evaluar las reglas con una muestra del sensor. */
  | { type: "SAMPLE"; now: number; startMatch: boolean; stopMatch: boolean }
  /** Disparo externo: respeta el delay pero no el hold. */
  | { type: "TRIGGER_START"; now: number; source: TriggerSource }
  | { type: "TRIGGER_STOP"; now: number; source: TriggerSource }
  /** Acción manual inmediata, sin delay. */
  | { type: "FORCE_PLAY" }
  | { type: "FORCE_STOP" }
  | { type: "CANCEL_PENDING" }
  | { type: "AUDIO_ENDED" }
  | { type: "TICK"; now: number };

export const INITIAL_STATE: MachineState = {
  phase: "DISARMED",
  matchSince: null,
  deadline: null,
  lastSource: null,
};

export function isAudible(phase: Phase): boolean {
  return phase === "PLAYING" || phase === "STOP_PENDING";
}

function enter(
  phase: Phase,
  lastSource: MachineState["lastSource"],
  deadline: number | null = null,
): MachineState {
  return { phase, matchSince: null, deadline, lastSource };
}

function beginStart(
  now: number,
  cfg: MachineConfig,
  source: TriggerSource,
): MachineState {
  return cfg.start.delayMs > 0
    ? enter("START_PENDING", source, now + cfg.start.delayMs)
    : enter("PLAYING", source);
}

function beginStop(
  now: number,
  cfg: MachineConfig,
  source: TriggerSource,
): MachineState {
  return cfg.stop.delayMs > 0
    ? enter("STOP_PENDING", source, now + cfg.stop.delayMs)
    : enter("ARMED", source);
}

/** Lleva la cuenta del hold y devuelve true cuando se ha cumplido. */
function trackHold(
  state: MachineState,
  match: boolean,
  now: number,
  holdMs: number,
): { matchSince: number | null; held: boolean } {
  if (!match) return { matchSince: null, held: false };
  const matchSince = state.matchSince ?? now;
  return { matchSince, held: now - matchSince >= holdMs };
}

export function step(
  state: MachineState,
  event: MachineEvent,
  cfg: MachineConfig,
): MachineState {
  switch (event.type) {
    case "ARM":
      return state.phase === "DISARMED" ? enter("ARMED", state.lastSource) : state;

    case "DISARM":
      return enter("DISARMED", state.lastSource);

    case "SAMPLE": {
      if (state.phase === "ARMED") {
        const h = trackHold(state, event.startMatch, event.now, cfg.start.holdMs);
        if (h.held) return beginStart(event.now, cfg, "motion");
        return h.matchSince === state.matchSince
          ? state
          : { ...state, matchSince: h.matchSince };
      }
      if (state.phase === "PLAYING") {
        const h = trackHold(state, event.stopMatch, event.now, cfg.stop.holdMs);
        if (h.held) return beginStop(event.now, cfg, "motion");
        return h.matchSince === state.matchSince
          ? state
          : { ...state, matchSince: h.matchSince };
      }
      return state;
    }

    case "TRIGGER_START":
      return state.phase === "ARMED"
        ? beginStart(event.now, cfg, event.source)
        : state;

    case "TRIGGER_STOP":
      return state.phase === "PLAYING"
        ? beginStop(event.now, cfg, event.source)
        : state;

    case "FORCE_PLAY":
      return state.phase === "DISARMED" ? state : enter("PLAYING", "manual");

    case "FORCE_STOP":
      return state.phase === "DISARMED" ? state : enter("ARMED", "manual");

    case "CANCEL_PENDING":
      if (state.phase === "START_PENDING") return enter("ARMED", "manual");
      if (state.phase === "STOP_PENDING") return enter("PLAYING", "manual");
      return state;

    case "AUDIO_ENDED":
      return isAudible(state.phase) ? enter("ARMED", state.lastSource) : state;

    case "TICK":
      if (state.deadline === null || event.now < state.deadline) return state;
      if (state.phase === "START_PENDING") return enter("PLAYING", state.lastSource);
      if (state.phase === "STOP_PENDING") return enter("ARMED", state.lastSource);
      return state;
  }
}
