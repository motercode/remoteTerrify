"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { OPS, type AxisCondition, type Op, type RuleSet } from "@/lib/motion/types";
import { cn } from "@/lib/utils";
import { AXIS_COLORS } from "./SensorLive";

const OP_LABELS: Record<Op, string> = {
  ">": "mayor que",
  "<": "menor que",
  "abs>": "|valor| mayor que",
  "abs<": "|valor| menor que",
};

const MAX_THRESHOLD = 30;

function SecondsInput({
  id,
  label,
  hint,
  ms,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  ms: number;
  onChange: (ms: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          value={ms / 1000}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) * 1000) || 0))}
        />
        <span className="text-sm text-muted-foreground">s</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ConditionRow({
  cond,
  onChange,
}: {
  cond: AxisCondition;
  onChange: (c: AxisCondition) => void;
}) {
  const signed = cond.op === ">" || cond.op === "<";
  const min = signed ? -MAX_THRESHOLD : 0;
  return (
    <div className={cn("space-y-2 rounded-md border p-3", !cond.enabled && "opacity-60")}>
      <div className="flex items-center justify-between">
        <span className="font-medium uppercase" style={{ color: AXIS_COLORS[cond.axis] }}>
          {cond.axis === "mag" ? "Total (magnitud)" : `Eje ${cond.axis}`}
        </span>
        <Switch
          checked={cond.enabled}
          onCheckedChange={(enabled) => onChange({ ...cond, enabled })}
          aria-label={`Activar eje ${cond.axis}`}
        />
      </div>
      {cond.enabled && (
        <>
          <div className="flex items-center gap-2">
            <Select
              value={cond.op}
              onValueChange={(op: Op) =>
                onChange({
                  ...cond,
                  op,
                  threshold: op.startsWith("abs") ? Math.abs(cond.threshold) : cond.threshold,
                })
              }
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPS.map((op) => (
                  <SelectItem key={op} value={op}>
                    {OP_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              inputMode="decimal"
              step={0.1}
              className="w-24"
              value={cond.threshold}
              onChange={(e) => onChange({ ...cond, threshold: Number(e.target.value) || 0 })}
            />
          </div>
          <Slider
            min={min}
            max={MAX_THRESHOLD}
            step={0.1}
            value={[cond.threshold]}
            onValueChange={([threshold]) => onChange({ ...cond, threshold })}
          />
        </>
      )}
    </div>
  );
}

export function RuleEditor({
  id,
  title,
  description,
  delayLabel,
  rule,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  delayLabel: string;
  rule: RuleSet;
  onChange: (r: RuleSet) => void;
}) {
  const active = rule.conditions.filter((c) => c.enabled).length;
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        <div className="flex items-center justify-between">
          <Label>Combinar condiciones</Label>
          <Select
            value={rule.combine}
            onValueChange={(combine: RuleSet["combine"]) => onChange({ ...rule, combine })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">Todas (Y)</SelectItem>
              <SelectItem value="OR">Cualquiera (O)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rule.conditions.map((cond, i) => (
          <ConditionRow
            key={cond.axis}
            cond={cond}
            onChange={(c) =>
              onChange({ ...rule, conditions: rule.conditions.map((o, j) => (j === i ? c : o)) })
            }
          />
        ))}
        {active === 0 && (
          <p className="text-sm text-amber-300">
            Sin condiciones activas: este disparador nunca se activará.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <SecondsInput
            id={`${id}-hold`}
            label="Mantener"
            hint="Tiempo que debe cumplirse sin interrupción."
            ms={rule.holdMs}
            onChange={(holdMs) => onChange({ ...rule, holdMs })}
          />
          <SecondsInput
            id={`${id}-delay`}
            label={delayLabel}
            hint="Espera tras el disparo."
            ms={rule.delayMs}
            onChange={(delayMs) => onChange({ ...rule, delayMs })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
