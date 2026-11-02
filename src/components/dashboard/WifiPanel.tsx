"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WifiStatus } from "@/hooks/useWifiScan";
import { MIN_SCAN_INTERVAL_MS, type WifiConfig, type WifiNetwork } from "@/lib/wifi/types";

function SsidInput({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (ssid: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        list="wifi-ssids"
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="Nombre de la red (SSID)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function WifiPanel({
  wifi,
  onChange,
  status,
  networks,
  lastScanAt,
  onScan,
}: {
  wifi: WifiConfig;
  onChange: (w: WifiConfig) => void;
  status: WifiStatus;
  networks: WifiNetwork[];
  lastScanAt: Date | null;
  onScan: () => void;
}) {
  const ssids = [...new Set(networks.map((n) => n.ssid))];
  const supported = status !== "unsupported";
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle>WiFi</CardTitle>
        <CardDescription>
          Inicia el audio al ver una red y lo para al dejar de ver otra (con la app armada).
          Respeta los delays de Inicio y Final.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="wifi-enabled">Disparar por WiFi</Label>
          <Switch
            id="wifi-enabled"
            checked={wifi.enabled}
            disabled={!supported}
            onCheckedChange={(enabled) => onChange({ ...wifi, enabled })}
          />
        </div>

        <datalist id="wifi-ssids">
          {ssids.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <SsidInput
          id="wifi-start"
          label="Red que inicia"
          hint="Al aparecer esta red empieza el audio. Vacío: no inicia por WiFi."
          value={wifi.startSsid}
          onChange={(startSsid) => onChange({ ...wifi, startSsid })}
        />
        <SsidInput
          id="wifi-stop"
          label="Red que para"
          hint="Al dejar de verse esta red se para el audio. Vacío: no para por WiFi."
          value={wifi.stopSsid}
          onChange={(stopSsid) => onChange({ ...wifi, stopSsid })}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="wifi-interval">Escanear cada</Label>
            <div className="flex items-center gap-2">
              <Input
                id="wifi-interval"
                type="number"
                inputMode="numeric"
                min={MIN_SCAN_INTERVAL_MS / 1000}
                step={5}
                value={wifi.scanIntervalMs / 1000}
                onChange={(e) =>
                  onChange({
                    ...wifi,
                    scanIntervalMs: Math.max(
                      MIN_SCAN_INTERVAL_MS,
                      Math.round(Number(e.target.value) * 1000) || 0,
                    ),
                  })
                }
              />
              <span className="text-sm text-muted-foreground">s</span>
            </div>
            <p className="text-xs text-muted-foreground">Android no permite menos de 30 s.</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wifi-misses">Perdida tras</Label>
            <div className="flex items-center gap-2">
              <Input
                id="wifi-misses"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={wifi.lostAfterMisses}
                onChange={(e) =>
                  onChange({
                    ...wifi,
                    lostAfterMisses: Math.max(1, Math.round(Number(e.target.value)) || 1),
                  })
                }
              />
              <span className="text-sm text-muted-foreground">escaneos</span>
            </div>
            <p className="text-xs text-muted-foreground">Seguidos sin ver la red de parada.</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Redes visibles
              {lastScanAt && (
                <span className="ml-2 font-normal text-muted-foreground">
                  {lastScanAt.toLocaleTimeString()}
                </span>
              )}
            </span>
            <Button variant="outline" size="sm" disabled={!supported} onClick={onScan}>
              <RefreshCw /> Escanear
            </Button>
          </div>
          {networks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {supported ? "Sin resultados todavía." : "El escaneo WiFi solo funciona en la app Android."}
            </p>
          ) : (
            <ul className="divide-y rounded-md border text-sm">
              {networks.map((n) => (
                <li key={n.bssid} className="flex items-center justify-between px-3 py-1.5">
                  <span className="truncate">{n.ssid}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{n.level} dBm</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
