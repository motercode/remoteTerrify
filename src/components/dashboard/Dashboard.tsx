"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEngine } from "@/hooks/useEngine";
import type { MotionStatus } from "@/hooks/useDeviceMotion";
import { playTestBeep } from "@/hooks/useAudioPlayer";
import { installGlobalLogHandlers, log } from "@/lib/log";
import { DEFAULT_CONFIG, type AppConfig } from "@/lib/motion/types";
import { loadConfig, saveConfig } from "@/lib/storage/config";
import { AudioPicker } from "./AudioPicker";
import { LogConsole } from "./LogConsole";
import { RuleEditor } from "./RuleEditor";
import { SensorLive } from "./SensorLive";
import { SettingsPanel } from "./SettingsPanel";
import { StatusPanel } from "./StatusPanel";

const MOTION_WARNINGS: Partial<Record<MotionStatus, string>> = {
  insecure:
    "El navegador bloquea el acelerómetro fuera de HTTPS. Abre la app con https:// (npm run dev:phone).",
  unsupported: "Este navegador no ofrece acelerómetro.",
  denied: "Permiso de sensores denegado. Revísalo en los ajustes del navegador.",
  waiting: "Esperando datos del sensor… (en un PC no llegarán: usa el simulador).",
};

export function Dashboard() {
  // Este componente solo se monta en el cliente, así que se puede leer localStorage aquí.
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const { state, dispatch, arm, motion, audio, wakeLock } = useEngine(config);

  useEffect(() => saveConfig(config), [config]);

  useEffect(() => {
    installGlobalLogHandlers();
    log(
      window.isSecureContext ? "info" : "warn",
      `Página cargada en ${location.origin} (${window.isSecureContext ? "HTTPS" : "sin HTTPS: el sensor no funcionará"})`,
    );
  }, []);

  const patch = useCallback(
    (p: Partial<AppConfig>) => setConfig((c) => ({ ...c, ...p })),
    [],
  );

  // Permiso de sensores y desbloqueo de audio deben pedirse dentro del mismo
  // gesto (iOS), así que se lanzan a la vez en lugar de encadenarse.
  const onArm = async () => {
    await Promise.all([motion.status !== "active" ? motion.start() : null, arm()]);
  };

  const warnings: string[] = [];
  if (!config.audioId) warnings.push("Elige un audio en la pestaña Audio.");
  else if (!audio.ready) warnings.push("Cargando audio…");
  const motionWarning = MOTION_WARNINGS[motion.status];
  if (motionWarning) warnings.push(motionWarning);
  if (state.phase !== "DISARMED" && !wakeLock.held)
    warnings.push("No se pudo bloquear la pantalla encendida: si se apaga, el sensor se detiene.");

  return (
    <main className="mx-auto max-w-lg space-y-4 px-4 pb-12 pt-4">
      <header className="flex items-center gap-2">
        <Activity className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">remoteTerrify</h1>
      </header>

      <StatusPanel
        state={state}
        dispatch={dispatch}
        onArm={() => void onArm()}
        canPlay={audio.ready}
        warnings={warnings}
      />

      <Tabs defaultValue="sensor">
        <TabsList className="w-full">
          <TabsTrigger value="sensor">Sensor</TabsTrigger>
          <TabsTrigger value="start">Inicio</TabsTrigger>
          <TabsTrigger value="stop">Final</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
        </TabsList>

        <TabsContent value="sensor" className="space-y-4">
          {motion.status !== "active" && (
            <Button variant="outline" className="w-full" onClick={() => void motion.start()}>
              Activar sensores
            </Button>
          )}
          <SensorLive
            history={motion.history}
            config={config}
            push={motion.push}
            sensorActive={motion.status === "active"}
          />
          <SettingsPanel
            config={config}
            onChange={patch}
            onReset={() => setConfig({ ...DEFAULT_CONFIG, audioId: config.audioId })}
          />
        </TabsContent>

        <TabsContent value="start">
          <RuleEditor
            id="start"
            title="Condiciones de inicio"
            description="Cuándo empieza a sonar el audio (con la app armada)."
            delayLabel="Delay de inicio"
            rule={config.start}
            onChange={(start) => patch({ start })}
          />
        </TabsContent>

        <TabsContent value="stop">
          <RuleEditor
            id="stop"
            title="Condiciones de final"
            description="Cuándo se para el audio mientras suena."
            delayLabel="Delay de final"
            rule={config.stop}
            onChange={(stop) => patch({ stop })}
          />
        </TabsContent>

        <TabsContent value="audio">
          <AudioPicker
            audioId={config.audioId}
            loop={config.loop}
            volume={config.volume}
            onChange={patch}
            error={audio.error}
            ready={audio.ready}
            playing={audio.playing}
            onTestPlay={() => void audio.play()}
            onTestStop={audio.stop}
            onBeep={() => void playTestBeep(config.volume)}
          />
        </TabsContent>
      </Tabs>

      <LogConsole />
    </main>
  );
}
