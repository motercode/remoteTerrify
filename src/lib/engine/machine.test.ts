import { describe, expect, it } from "vitest";
import {
  INITIAL_STATE,
  step,
  type MachineConfig,
  type MachineEvent,
  type MachineState,
} from "./machine";

const cfg: MachineConfig = {
  start: { holdMs: 100, delayMs: 1000 },
  stop: { holdMs: 500, delayMs: 2000 },
};

function run(events: MachineEvent[], c = cfg, s: MachineState = INITIAL_STATE) {
  return events.reduce((acc, e) => step(acc, e, c), s);
}

const sample = (now: number, startMatch: boolean, stopMatch = false): MachineEvent => ({
  type: "SAMPLE",
  now,
  startMatch,
  stopMatch,
});

describe("machine", () => {
  it("ignora muestras mientras está desarmada", () => {
    expect(run([sample(0, true), sample(500, true)]).phase).toBe("DISARMED");
  });

  it("requiere que la condición se mantenga holdMs", () => {
    const s = run([{ type: "ARM" }, sample(0, true), sample(50, true)]);
    expect(s.phase).toBe("ARMED");
    expect(run([sample(100, true)], cfg, s).phase).toBe("START_PENDING");
  });

  it("reinicia el hold si la condición se interrumpe", () => {
    const s = run([
      { type: "ARM" },
      sample(0, true),
      sample(80, false),
      sample(90, true),
      sample(150, true),
    ]);
    expect(s.phase).toBe("ARMED");
    expect(run([sample(190, true)], cfg, s).phase).toBe("START_PENDING");
  });

  it("aplica el delay de inicio y luego reproduce", () => {
    const s = run([{ type: "ARM" }, sample(0, true), sample(100, true)]);
    expect(s.deadline).toBe(1100);
    expect(run([{ type: "TICK", now: 1099 }], cfg, s).phase).toBe("START_PENDING");
    const playing = run([{ type: "TICK", now: 1100 }], cfg, s);
    expect(playing.phase).toBe("PLAYING");
    expect(playing.lastSource).toBe("motion");
  });

  it("sin delay pasa directamente a PLAYING", () => {
    const c = { ...cfg, start: { holdMs: 0, delayMs: 0 } };
    expect(run([{ type: "ARM" }, sample(0, true)], c).phase).toBe("PLAYING");
  });

  it("para con las condiciones de final, su hold y su delay, y se rearma", () => {
    const c = { ...cfg, start: { holdMs: 0, delayMs: 0 } };
    let s = run([{ type: "ARM" }, sample(0, true), sample(10, false, true)], c);
    expect(s.phase).toBe("PLAYING");
    s = run([sample(510, false, true)], c, s);
    expect(s.phase).toBe("STOP_PENDING");
    expect(s.deadline).toBe(2510);
    s = run([{ type: "TICK", now: 2510 }], c, s);
    expect(s.phase).toBe("ARMED");
  });

  it("las condiciones de inicio no actúan mientras suena", () => {
    const c = { ...cfg, start: { holdMs: 0, delayMs: 0 } };
    const s = run([{ type: "ARM" }, sample(0, true), sample(10, true), sample(5000, true)], c);
    expect(s.phase).toBe("PLAYING");
  });

  it("cancelar un pendiente vuelve a la fase anterior", () => {
    const s = run([{ type: "ARM" }, sample(0, true), sample(100, true)]);
    expect(run([{ type: "CANCEL_PENDING" }], cfg, s).phase).toBe("ARMED");
    const playing = run([{ type: "FORCE_PLAY" }, sample(0, false, true), sample(500, false, true)], cfg, s);
    expect(playing.phase).toBe("STOP_PENDING");
    expect(run([{ type: "CANCEL_PENDING" }], cfg, playing).phase).toBe("PLAYING");
  });

  it("los disparos externos respetan el delay pero no el hold", () => {
    let s = run([{ type: "ARM" }, { type: "TRIGGER_START", now: 0, source: "voice" }]);
    expect(s.phase).toBe("START_PENDING");
    expect(s.lastSource).toBe("voice");
    s = run([{ type: "TICK", now: 1000 }, { type: "TRIGGER_STOP", now: 1000, source: "voice" }], cfg, s);
    expect(s.phase).toBe("STOP_PENDING");
  });

  it("forzar play/stop es inmediato y desarmar corta todo", () => {
    let s = run([{ type: "ARM" }, { type: "FORCE_PLAY" }]);
    expect(s.phase).toBe("PLAYING");
    s = run([{ type: "FORCE_STOP" }], cfg, s);
    expect(s.phase).toBe("ARMED");
    s = run([{ type: "FORCE_PLAY" }, { type: "DISARM" }], cfg, s);
    expect(s.phase).toBe("DISARMED");
    expect(run([{ type: "FORCE_PLAY" }], cfg, s).phase).toBe("DISARMED");
  });

  it("el fin del audio (sin bucle) vuelve a ARMED", () => {
    const s = run([{ type: "ARM" }, { type: "FORCE_PLAY" }, { type: "AUDIO_ENDED" }]);
    expect(s.phase).toBe("ARMED");
  });
});
