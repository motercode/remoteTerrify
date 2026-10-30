"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { addAudio, deleteAudio, listAudios, type StoredAudio } from "@/lib/storage/audioStore";
import { cn } from "@/lib/utils";

export function AudioPicker({
  audioId,
  loop,
  volume,
  onChange,
  error,
}: {
  audioId: string | null;
  loop: boolean;
  volume: number;
  onChange: (patch: { audioId?: string | null; loop?: boolean; volume?: number }) => void;
  error: string | null;
}) {
  const [audios, setAudios] = useState<StoredAudio[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => setAudios(await listAudios()), []);

  useEffect(() => {
    void listAudios().then(setAudios);
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const stored = await addAudio(file);
    await refresh();
    onChange({ audioId: stored.id });
  };

  const onDelete = async (id: string) => {
    await deleteAudio(id);
    if (id === audioId) onChange({ audioId: null });
    await refresh();
  };

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle>Audio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button variant="outline" className="w-full" onClick={() => fileInput.current?.click()}>
          <Upload /> Subir audio
        </Button>

        {audios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay audios guardados.</p>
        ) : (
          <ul className="space-y-2">
            {audios.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-2",
                  a.id === audioId && "border-primary bg-primary/10",
                )}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  onClick={() => onChange({ audioId: a.id })}
                >
                  <Check className={cn("size-4 shrink-0", a.id !== audioId && "invisible")} />
                  <span className="truncate text-sm">{a.name}</span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void onDelete(a.id)}
                  aria-label={`Borrar ${a.name}`}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between">
          <Label htmlFor="loop">Repetir en bucle</Label>
          <Switch id="loop" checked={loop} onCheckedChange={(v) => onChange({ loop: v })} />
        </div>
        <div className="space-y-2">
          <Label>Volumen: {Math.round(volume * 100)}%</Label>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[volume]}
            onValueChange={([v]) => onChange({ volume: v })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Suena por la salida activa del móvil: empareja antes el altavoz Bluetooth.
        </p>
        {error && <p className="text-sm text-red-400">Error de reproducción: {error}</p>}
      </CardContent>
    </Card>
  );
}
