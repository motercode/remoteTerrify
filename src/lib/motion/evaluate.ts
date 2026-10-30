import type { AxisCondition, MotionSample, RuleSet } from "./types";

export function evaluateCondition(c: AxisCondition, s: MotionSample): boolean {
  const v = s[c.axis];
  switch (c.op) {
    case ">":
      return v > c.threshold;
    case "<":
      return v < c.threshold;
    case "abs>":
      return Math.abs(v) > c.threshold;
    case "abs<":
      return Math.abs(v) < c.threshold;
  }
}

/** Un RuleSet sin condiciones activas nunca se cumple. */
export function evaluateRuleSet(rule: RuleSet, s: MotionSample): boolean {
  const active = rule.conditions.filter((c) => c.enabled);
  if (active.length === 0) return false;
  return rule.combine === "AND"
    ? active.every((c) => evaluateCondition(c, s))
    : active.some((c) => evaluateCondition(c, s));
}

export function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}
