import { describe, expect, it } from "vitest";
import { INITIAL_WIFI_TRACKER, stepWifi } from "./detect";

const cfg = { startSsid: "Casa", stopSsid: "Oficina", lostAfterMisses: 2 };

/** Aplica escaneos sucesivos y devuelve los disparos de cada uno. */
function run(scans: string[][], c = cfg) {
  let tracker = INITIAL_WIFI_TRACKER;
  return scans.map((ssids) => {
    const r = stepWifi(tracker, ssids, c);
    tracker = r.tracker;
    return { start: r.start, stop: r.stop };
  });
}

const none = { start: false, stop: false };

describe("stepWifi", () => {
  it("inicia cuando aparece la red de inicio", () => {
    expect(run([[], ["Vecino"], ["Casa"]])).toEqual([none, none, { start: true, stop: false }]);
  });

  it("dispara en el primer escaneo si la red de inicio ya estaba visible", () => {
    expect(run([["Casa"]])[0].start).toBe(true);
  });

  it("no repite el inicio mientras la red siga visible, sí al reaparecer", () => {
    expect(run([["Casa"], ["Casa"], [], ["Casa"]]).map((r) => r.start)).toEqual([
      true,
      false,
      false,
      true,
    ]);
  });

  it("para tras lostAfterMisses escaneos seguidos sin la red de parada", () => {
    expect(run([["Oficina"], [], []]).map((r) => r.stop)).toEqual([false, false, true]);
  });

  it("un solo escaneo perdido no para si la red vuelve", () => {
    expect(run([["Oficina"], [], ["Oficina"], []]).map((r) => r.stop)).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });

  it("no para por una red que nunca se ha visto", () => {
    expect(run([[], [], [], []]).some((r) => r.stop)).toBe(false);
  });

  it("no vuelve a parar hasta que la red reaparezca y se pierda otra vez", () => {
    const c = { ...cfg, lostAfterMisses: 1 };
    expect(run([["Oficina"], [], [], ["Oficina"], []], c).map((r) => r.stop)).toEqual([
      false,
      true,
      false,
      false,
      true,
    ]);
  });

  it("ignora redes sin configurar y espacios en el SSID", () => {
    const c = { startSsid: "  Casa ", stopSsid: "", lostAfterMisses: 1 };
    expect(run([["Casa"], []], c)).toEqual([{ start: true, stop: false }, none]);
  });

  it("puede usar la misma red para iniciar y parar", () => {
    const c = { startSsid: "Casa", stopSsid: "Casa", lostAfterMisses: 1 };
    expect(run([["Casa"], []], c)).toEqual([{ start: true, stop: false }, { start: false, stop: true }]);
  });
});
