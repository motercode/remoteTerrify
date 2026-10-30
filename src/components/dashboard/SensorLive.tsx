"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { AXES, type AppConfig, type Axis, type MotionSample } from "@/lib/motion/types";

export const AXIS_COLORS: Record<Axis, string> = {
  x: "#f87171",
  y: "#4ade80",
  z: "#60a5fa",
  mag: "#c084fc",
};

const WINDOW_MS = 10_000;
const SIM_HZ = 30;

/** Lee el historial en un bucle de animación: no provoca renders de React. */
function useLiveCanvas(
  canvas: RefObject<HTMLCanvasElement | null>,
  values: RefObject<HTMLDivElement | null>,
  history: RefObject<MotionSample[]>,
  config: AppConfig,
) {
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  });

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = canvas.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const data = history.current;
      const cfg = configRef.current;
      const thresholds = [...cfg.start.conditions, ...cfg.stop.conditions]
        .filter((cond) => cond.enabled)
        .map((cond) => cond.threshold);
      const peak = Math.max(
        10,
        ...thresholds.map(Math.abs),
        ...data.map((s) => Math.max(Math.abs(s.x), Math.abs(s.y), Math.abs(s.z), s.mag)),
      );
      const range = peak * 1.1;
      const yOf = (v: number) => h / 2 - (v / range) * (h / 2);

      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Umbrales: verde = inicio, rojo = final.
      ctx.setLineDash([4, 4]);
      for (const [rule, color] of [
        [cfg.start, "rgba(74,222,128,0.6)"],
        [cfg.stop, "rgba(248,113,113,0.6)"],
      ] as const) {
        for (const cond of rule.conditions) {
          if (!cond.enabled) continue;
          ctx.strokeStyle = color;
          const lines = cond.op.startsWith("abs")
            ? [cond.threshold, -cond.threshold]
            : [cond.threshold];
          for (const t of lines) {
            ctx.beginPath();
            ctx.moveTo(0, yOf(t));
            ctx.lineTo(w, yOf(t));
            ctx.stroke();
          }
        }
      }
      ctx.setLineDash([]);

      const now = performance.now();
      const xOf = (t: number) => w - ((now - t) / WINDOW_MS) * w;
      for (const axis of AXES) {
        ctx.strokeStyle = AXIS_COLORS[axis];
        ctx.lineWidth = axis === "mag" ? 2 : 1.25;
        ctx.beginPath();
        data.forEach((s, i) => {
          if (i === 0) ctx.moveTo(xOf(s.t), yOf(s[axis]));
          else ctx.lineTo(xOf(s.t), yOf(s[axis]));
        });
        ctx.stroke();
      }

      const last = data[data.length - 1];
      if (last && values.current) {
        for (const axis of AXES) {
          const el = values.current.querySelector<HTMLElement>(`[data-axis="${axis}"]`);
          if (el) el.textContent = last[axis].toFixed(2);
        }
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [canvas, values, history]);
}

/** Genera muestras falsas para probar sin móvil. */
function useSimulator(enabled: boolean, push: (x: number, y: number, z: number) => void) {
  const [sim, setSim] = useState({ x: 0, y: 0, z: 0 });
  const simRef = useRef(sim);
  useEffect(() => {
    simRef.current = sim;
  });
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      const s = simRef.current;
      push(s.x, s.y, s.z);
    }, 1000 / SIM_HZ);
    return () => clearInterval(id);
  }, [enabled, push]);
  return [sim, setSim] as const;
}

export function SensorLive({
  history,
  config,
  push,
  sensorActive,
}: {
  history: RefObject<MotionSample[]>;
  config: AppConfig;
  push: (x: number, y: number, z: number) => void;
  sensorActive: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const values = useRef<HTMLDivElement>(null);
  const [simulate, setSimulate] = useState(false);
  const simEnabled = simulate && !sensorActive;
  const [sim, setSim] = useSimulator(simEnabled, push);
  useLiveCanvas(canvas, values, history, config);

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>Acelerómetro (m/s²)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4">
        <div ref={values} className="grid grid-cols-4 gap-2 text-center">
          {AXES.map((axis) => (
            <div key={axis} className="rounded-md bg-muted/50 py-2">
              <div className="text-xs uppercase" style={{ color: AXIS_COLORS[axis] }}>
                {axis === "mag" ? "total" : axis}
              </div>
              <div data-axis={axis} className="font-mono text-lg tabular-nums">
                –
              </div>
            </div>
          ))}
        </div>
        <canvas ref={canvas} className="h-40 w-full rounded-md bg-black/30" />
        <p className="text-xs text-muted-foreground">
          Líneas discontinuas: umbrales de <span className="text-green-400">inicio</span> y{" "}
          <span className="text-red-400">final</span>. Últimos 10 s.
        </p>

        {!sensorActive && (
          <div className="space-y-3 rounded-md border border-dashed p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sim">Simulador (sin sensor)</Label>
              <Switch id="sim" checked={simulate} onCheckedChange={setSimulate} />
            </div>
            {simEnabled &&
              (["x", "y", "z"] as const).map((axis) => (
                <div key={axis} className="flex items-center gap-3">
                  <span className="w-4 text-xs uppercase" style={{ color: AXIS_COLORS[axis] }}>
                    {axis}
                  </span>
                  <Slider
                    min={-20}
                    max={20}
                    step={0.5}
                    value={[sim[axis]]}
                    onValueChange={([v]) => setSim((s) => ({ ...s, [axis]: v }))}
                  />
                  <span className="w-10 text-right font-mono text-xs">{sim[axis]}</span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
