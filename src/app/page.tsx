"use client";

import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Vector3 = {
  x: number;
  y: number;
  z: number;
};

const DEFAULT_START: Vector3 = { x: 8, y: 8, z: 8 };
const DEFAULT_END: Vector3 = { x: 3, y: 3, z: 3 };

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function Home() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const [startThreshold, setStartThreshold] = useState<Vector3>(DEFAULT_START);
  const [endThreshold, setEndThreshold] = useState<Vector3>(DEFAULT_END);
  const [startDelayMs, setStartDelayMs] = useState(0);
  const [endDelayMs, setEndDelayMs] = useState(0);

  const [acceleration, setAcceleration] = useState<Vector3>({ x: 0, y: 0, z: 0 });
  const [useDeviceMotion, setUseDeviceMotion] = useState(false);
  const [deviceMotionAvailable, setDeviceMotionAvailable] = useState(false);

  useEffect(() => {
    setDeviceMotionAvailable(typeof window !== "undefined" && "DeviceMotionEvent" in window);
  }, []);

  useEffect(() => {
    if (!useDeviceMotion || !deviceMotionAvailable) {
      return;
    }

    const onMotion = (event: DeviceMotionEvent) => {
      const next = event.accelerationIncludingGravity;
      if (!next) return;

      setAcceleration({
        x: Number(next.x ?? 0),
        y: Number(next.y ?? 0),
        z: Number(next.z ?? 0),
      });
    };

    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [useDeviceMotion, deviceMotionAvailable]);

  useEffect(() => {
    return () => {
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
      }
      if (endTimeoutRef.current) {
        clearTimeout(endTimeoutRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const absAcceleration = useMemo(
    () => ({
      x: Math.abs(acceleration.x),
      y: Math.abs(acceleration.y),
      z: Math.abs(acceleration.z),
    }),
    [acceleration],
  );

  const meetsStartCondition =
    absAcceleration.x >= startThreshold.x &&
    absAcceleration.y >= startThreshold.y &&
    absAcceleration.z >= startThreshold.z;

  const meetsEndCondition =
    absAcceleration.x <= endThreshold.x &&
    absAcceleration.y <= endThreshold.y &&
    absAcceleration.z <= endThreshold.z;

  const clearStartTimeout = () => {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }
  };

  const clearEndTimeout = () => {
    if (endTimeoutRef.current) {
      clearTimeout(endTimeoutRef.current);
      endTimeoutRef.current = null;
    }
  };

  const playAudio = () => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const stopAudio = () => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
  };

  useEffect(() => {
    if (!audioUrl) {
      clearStartTimeout();
      clearEndTimeout();
      if (isPlaying) {
        stopAudio();
      }
      return;
    }

    if (!isPlaying) {
      clearEndTimeout();

      if (meetsStartCondition) {
        if (!startTimeoutRef.current) {
          startTimeoutRef.current = setTimeout(() => {
            startTimeoutRef.current = null;
            playAudio();
          }, Math.max(0, startDelayMs));
        }
      } else {
        clearStartTimeout();
      }

      return;
    }

    clearStartTimeout();

    if (meetsEndCondition) {
      if (!endTimeoutRef.current) {
        endTimeoutRef.current = setTimeout(() => {
          endTimeoutRef.current = null;
          stopAudio();
        }, Math.max(0, endDelayMs));
      }
      return;
    }

    clearEndTimeout();
  }, [audioUrl, endDelayMs, isPlaying, meetsEndCondition, meetsStartCondition, startDelayMs]);

  const onAudioFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) {
      return;
    }

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioName(selected.name);
    setAudioUrl(URL.createObjectURL(selected));
    setIsPlaying(false);
  };

  const updateThreshold = (
    axis: keyof Vector3,
    value: string,
    setter: Dispatch<SetStateAction<Vector3>>,
  ) => {
    setter((current) => ({ ...current, [axis]: Math.max(0, toNumber(value, current[axis])) }));
  };

  const updateManualAcceleration = (axis: keyof Vector3, value: string) => {
    setAcceleration((current) => ({ ...current, [axis]: toNumber(value, current[axis]) }));
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard de sonido por acelerómetro</h1>
        <p className="text-muted-foreground">
          Funciona en local y sin conexión: carga un audio desde tu equipo y configura umbrales por eje para inicio y final.
        </p>
      </header>

      <section className="grid gap-6 rounded-xl border border-border bg-card p-5 text-card-foreground md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Audio local</h2>
          <input type="file" accept="audio/*" onChange={onAudioFileChange} className="block w-full text-sm" />
          <p className="text-sm text-muted-foreground">{audioName ? `Archivo: ${audioName}` : "Selecciona un archivo de audio"}</p>
          {audioUrl ? <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} /> : null}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm"
              onClick={playAudio}
              disabled={!audioUrl}
            >
              Reproducir ahora
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-sm"
              onClick={stopAudio}
              disabled={!audioUrl}
            >
              Detener
            </button>
            <span className="text-sm text-muted-foreground">Estado: {isPlaying ? "reproduciendo" : "detenido"}</span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium">Fuente de aceleración</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useDeviceMotion}
              onChange={(event) => setUseDeviceMotion(event.target.checked)}
              disabled={!deviceMotionAvailable}
            />
            Usar acelerómetro del dispositivo
          </label>
          {!deviceMotionAvailable ? (
            <p className="text-sm text-muted-foreground">Tu navegador no expone DeviceMotionEvent. Usa controles manuales.</p>
          ) : null}
          <p className="text-sm text-muted-foreground">Si no usas acelerómetro real, ajusta manualmente los valores:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={axis} className="space-y-1 text-sm">
                <span className="font-medium uppercase">{axis}</span>
                <input
                  type="number"
                  value={acceleration[axis]}
                  onChange={(event) => updateManualAcceleration(axis, event.target.value)}
                  disabled={useDeviceMotion}
                  className="w-full rounded-md border border-input bg-background px-2 py-1"
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-xl border border-border bg-card p-5 text-card-foreground md:grid-cols-2">
        <fieldset className="space-y-3">
          <legend className="text-lg font-medium">Condición de inicio (umbral mínimo por eje)</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={`start-${axis}`} className="space-y-1 text-sm">
                <span className="font-medium uppercase">{axis}</span>
                <input
                  type="number"
                  min={0}
                  value={startThreshold[axis]}
                  onChange={(event) => updateThreshold(axis, event.target.value, setStartThreshold)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1"
                />
              </label>
            ))}
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Delay de inicio (ms)</span>
            <input
              type="number"
              min={0}
              value={startDelayMs}
              onChange={(event) => setStartDelayMs(Math.max(0, toNumber(event.target.value, startDelayMs)))}
              className="w-full rounded-md border border-input bg-background px-2 py-1"
            />
          </label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-lg font-medium">Condición de final (umbral máximo por eje)</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(["x", "y", "z"] as const).map((axis) => (
              <label key={`end-${axis}`} className="space-y-1 text-sm">
                <span className="font-medium uppercase">{axis}</span>
                <input
                  type="number"
                  min={0}
                  value={endThreshold[axis]}
                  onChange={(event) => updateThreshold(axis, event.target.value, setEndThreshold)}
                  className="w-full rounded-md border border-input bg-background px-2 py-1"
                />
              </label>
            ))}
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Delay de final (ms)</span>
            <input
              type="number"
              min={0}
              value={endDelayMs}
              onChange={(event) => setEndDelayMs(Math.max(0, toNumber(event.target.value, endDelayMs)))}
              className="w-full rounded-md border border-input bg-background px-2 py-1"
            />
          </label>
        </fieldset>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 text-sm text-card-foreground">
        <p>
          Aceleración actual (absoluta): X {absAcceleration.x.toFixed(2)} | Y {absAcceleration.y.toFixed(2)} | Z {absAcceleration.z.toFixed(2)}
        </p>
        <p className="mt-2 text-muted-foreground">
          Inicio automático: {meetsStartCondition ? "cumple" : "no cumple"}. Final automático: {meetsEndCondition ? "cumple" : "no cumple"}.
        </p>
      </section>
    </main>
  );
}
