"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { AppConfig } from "@/lib/motion/types";

export function SettingsPanel({
  config,
  onChange,
  onReset,
}: {
  config: AppConfig;
  onChange: (patch: Partial<AppConfig>) => void;
  onReset: () => void;
}) {
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle>Sensor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 px-4">
        <div className="space-y-2">
          <Label>Fuente de aceleración</Label>
          <Select
            value={config.source}
            onValueChange={(source: AppConfig["source"]) => onChange({ source })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Sin gravedad (solo movimiento)</SelectItem>
              <SelectItem value="withGravity">Con gravedad (detecta orientación)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Con gravedad, el móvil en reposo marca ~9,8 m/s² en el eje que apunta hacia
            abajo: útil para detectar si está boca arriba, de pie, etc.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Suavizado: {Math.round(config.smoothing * 100)}%</Label>
          <Slider
            min={0}
            max={0.95}
            step={0.05}
            value={[config.smoothing]}
            onValueChange={([smoothing]) => onChange({ smoothing })}
          />
          <p className="text-xs text-muted-foreground">
            Más suavizado = menos falsos disparos por vibraciones, pero reacción más lenta.
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={onReset}>
          <RotateCcw /> Restaurar configuración por defecto
        </Button>
      </CardContent>
    </Card>
  );
}
