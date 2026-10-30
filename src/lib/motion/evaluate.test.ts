import { describe, expect, it } from "vitest";
import { evaluateCondition, evaluateRuleSet } from "./evaluate";
import { DEFAULT_CONFIG, type AxisCondition, type MotionSample, type RuleSet } from "./types";

const s: MotionSample = { x: -6, y: 2, z: 0.5, mag: 6.35, t: 0 };

function cond(c: Partial<AxisCondition>): AxisCondition {
  return { enabled: true, axis: "x", op: ">", threshold: 0, ...c };
}

function rule(conditions: AxisCondition[], combine: RuleSet["combine"]): RuleSet {
  return { conditions, combine, holdMs: 0, delayMs: 0 };
}

describe("evaluateCondition", () => {
  it("compara con signo y en valor absoluto", () => {
    expect(evaluateCondition(cond({ op: ">", threshold: 5 }), s)).toBe(false);
    expect(evaluateCondition(cond({ op: "abs>", threshold: 5 }), s)).toBe(true);
    expect(evaluateCondition(cond({ op: "<", threshold: -5 }), s)).toBe(true);
    expect(evaluateCondition(cond({ axis: "z", op: "abs<", threshold: 1 }), s)).toBe(true);
    expect(evaluateCondition(cond({ axis: "mag", op: ">", threshold: 6 }), s)).toBe(true);
  });
});

describe("evaluateRuleSet", () => {
  const hit = cond({ axis: "y", op: ">", threshold: 1 });
  const miss = cond({ axis: "y", op: ">", threshold: 10 });

  it("AND exige todas, OR basta con una", () => {
    expect(evaluateRuleSet(rule([hit, miss], "AND"), s)).toBe(false);
    expect(evaluateRuleSet(rule([hit, miss], "OR"), s)).toBe(true);
    expect(evaluateRuleSet(rule([hit, hit], "AND"), s)).toBe(true);
  });

  it("ignora condiciones desactivadas", () => {
    expect(evaluateRuleSet(rule([hit, { ...miss, enabled: false }], "AND"), s)).toBe(true);
  });

  it("sin condiciones activas nunca se cumple", () => {
    expect(evaluateRuleSet(rule([{ ...hit, enabled: false }], "OR"), s)).toBe(false);
  });

  it("la configuración por defecto es coherente", () => {
    const still: MotionSample = { x: 0, y: 0, z: 0, mag: 0, t: 0 };
    const shake: MotionSample = { x: 20, y: 0, z: 0, mag: 20, t: 0 };
    expect(evaluateRuleSet(DEFAULT_CONFIG.start, shake)).toBe(true);
    expect(evaluateRuleSet(DEFAULT_CONFIG.start, still)).toBe(false);
    expect(evaluateRuleSet(DEFAULT_CONFIG.stop, still)).toBe(true);
  });
});
