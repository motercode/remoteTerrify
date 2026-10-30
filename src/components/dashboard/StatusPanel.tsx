"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Power, PowerOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { MachineEvent, MachineState, Phase } from "@/lib/engine/machine";
import { cn } from "@/lib/utils";

const PHASES: Record<Phase, { label: string; className: string }> = {
  DISARMED: { label: "Desarmado", className: "bg-muted text-muted-foreground" },
  ARMED: { label: "Armado · esperando inicio", className: "bg-sky-600 text-white" },
  START_PENDING: { label: "Iniciando…", className: "bg-amber-500 text-black" },
  PLAYING: { label: "Reproduciendo", className: "bg-emerald-600 text-white" },
  STOP_PENDING: { label: "Parando…", className: "bg-orange-600 text-white" },
};

const SOURCES = { motion: "acelerómetro", manual: "manual", voice: "voz" } as const;

function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (deadline === null) return;
    let raf = 0;
    const loop = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [deadline]);
  return deadline === null ? null : Math.max(0, deadline - now);
}

export function StatusPanel({
  state,
  dispatch,
  onArm,
  canPlay,
  warnings,
}: {
  state: MachineState;
  dispatch: (e: MachineEvent) => void;
  onArm: () => void;
  canPlay: boolean;
  warnings: string[];
}) {
  const left = useCountdown(state.deadline);
  const phase = PHASES[state.phase];
  const disarmed = state.phase === "DISARMED";
  const pending = state.phase === "START_PENDING" || state.phase === "STOP_PENDING";
  const audible = state.phase === "PLAYING" || state.phase === "STOP_PENDING";

  return (
    <Card className="gap-4 py-4">
      <CardContent className="space-y-4 px-4">
        <div
          className={cn(
            "rounded-lg px-4 py-5 text-center transition-colors",
            phase.className,
          )}
        >
          <div className="text-2xl font-semibold">{phase.label}</div>
          {left !== null && (
            <div className="mt-1 text-4xl font-bold tabular-nums">
              {(left / 1000).toFixed(1)} s
            </div>
          )}
          {state.lastSource && !disarmed && (
            <div className="mt-1 text-xs opacity-80">
              último disparo: {SOURCES[state.lastSource]}
            </div>
          )}
        </div>

        {disarmed ? (
          <Button size="lg" className="h-14 w-full text-lg" onClick={onArm} disabled={!canPlay}>
            <Power /> ARMAR
          </Button>
        ) : (
          <Button
            size="lg"
            variant="secondary"
            className="h-14 w-full text-lg"
            onClick={() => dispatch({ type: "DISARM" })}
          >
            <PowerOff /> DESARMAR
          </Button>
        )}

        {!disarmed && (
          <div className="grid grid-cols-2 gap-2">
            {pending ? (
              <Button
                variant="outline"
                className="col-span-2"
                onClick={() => dispatch({ type: "CANCEL_PENDING" })}
              >
                <X /> Cancelar espera
              </Button>
            ) : audible ? (
              <Button
                variant="outline"
                className="col-span-2"
                onClick={() => dispatch({ type: "FORCE_STOP" })}
              >
                <Pause /> Parar ahora
              </Button>
            ) : (
              <Button
                variant="outline"
                className="col-span-2"
                onClick={() => dispatch({ type: "FORCE_PLAY" })}
              >
                <Play /> Reproducir ahora
              </Button>
            )}
          </div>
        )}

        {warnings.map((w) => (
          <p key={w} className="rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-300">
            {w}
          </p>
        ))}
      </CardContent>
    </Card>
  );
}
