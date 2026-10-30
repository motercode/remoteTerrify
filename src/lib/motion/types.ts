export type Axis = "x" | "y" | "z" | "mag";
export type Op = ">" | "<" | "abs>" | "abs<";

export const AXES: Axis[] = ["x", "y", "z", "mag"];
export const OPS: Op[] = [">", "<", "abs>", "abs<"];

export interface MotionSample {
  x: number;
  y: number;
  z: number;
  mag: number;
  t: number;
}

export interface AxisCondition {
  enabled: boolean;
  axis: Axis;
  op: Op;
  /** m/s² */
  threshold: number;
}

export interface RuleSet {
  /** Una condición por eje, en el orden de AXES. */
  conditions: AxisCondition[];
  combine: "AND" | "OR";
  /** Tiempo que la condición debe mantenerse para dispararse (anti-falsos). */
  holdMs: number;
  /** Espera entre el disparo y la acción (iniciar o parar el audio). */
  delayMs: number;
}

export interface AppConfig {
  /** linear = event.acceleration (sin gravedad); withGravity = accelerationIncludingGravity. */
  source: "linear" | "withGravity";
  /** 0 = sin suavizado, valores cercanos a 1 = suavizado fuerte. */
  smoothing: number;
  start: RuleSet;
  stop: RuleSet;
  audioId: string | null;
  loop: boolean;
  volume: number;
}

function conditions(
  overrides: Partial<Record<Axis, Partial<AxisCondition>>>,
): AxisCondition[] {
  return AXES.map((axis) => ({
    enabled: false,
    axis,
    op: "abs>",
    threshold: 5,
    ...overrides[axis],
  }));
}

export const DEFAULT_CONFIG: AppConfig = {
  source: "linear",
  smoothing: 0.5,
  start: {
    conditions: conditions({ mag: { enabled: true, op: ">", threshold: 12 } }),
    combine: "OR",
    holdMs: 200,
    delayMs: 0,
  },
  stop: {
    conditions: conditions({ mag: { enabled: true, op: "<", threshold: 1 } }),
    combine: "AND",
    holdMs: 3000,
    delayMs: 0,
  },
  audioId: null,
  loop: true,
  volume: 1,
};
