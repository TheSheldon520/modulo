// modules/sales-analytics/__tests__/stages.test.ts
//
// Tests for the pipeline stages source of truth. Documenting the contract
// here protects the Kanban / overview / table consumers against accidental
// reordering, colour drift, or lifecycle mis-bucketing.

import { describe, expect, it } from "vitest";

import {
  STAGES,
  getStageDescriptor,
  isClosedStage,
  isOpenStage,
} from "../lib/stages";
import { DEAL_STAGES } from "../schemas";

describe("STAGES", () => {
  it("contains exactly the five canonical stages in funnel order", () => {
    expect(STAGES.map((s) => s.id)).toEqual([
      "lead",
      "qualified",
      "proposal",
      "won",
      "lost",
    ]);
  });

  it("aligns 1:1 with the DEAL_STAGES enum from schemas.ts", () => {
    // Every canonical stage must have a descriptor (and vice versa).
    const ids = STAGES.map((s) => s.id);
    expect([...ids].sort()).toEqual([...DEAL_STAGES].sort());
  });

  it("maps each stage to the documented semantic colour", () => {
    const colours = Object.fromEntries(STAGES.map((s) => [s.id, s.color]));
    expect(colours).toEqual({
      lead: "info",
      qualified: "neutral",
      proposal: "warning",
      won: "success",
      lost: "danger",
    });
  });

  it("buckets stages into the correct lifecycle types", () => {
    const types = Object.fromEntries(STAGES.map((s) => [s.id, s.type]));
    expect(types).toEqual({
      lead: "open",
      qualified: "open",
      proposal: "open",
      won: "won",
      lost: "lost",
    });
  });

  it("re-uses the stage id as the i18n label suffix", () => {
    // The Kanban / table call t(`stages.${stage.label}`) — keeping label
    // and id in sync removes a manual mapping that's easy to drift.
    for (const stage of STAGES) {
      expect(stage.label).toBe(stage.id);
    }
  });
});

describe("getStageDescriptor", () => {
  it("returns the descriptor for a known stage", () => {
    const descriptor = getStageDescriptor("won");
    expect(descriptor).toBeDefined();
    expect(descriptor?.id).toBe("won");
    expect(descriptor?.color).toBe("success");
    expect(descriptor?.type).toBe("won");
  });

  it("returns undefined for an unknown stage (no crash on stale data)", () => {
    expect(getStageDescriptor("renegotiation")).toBeUndefined();
    expect(getStageDescriptor("")).toBeUndefined();
  });
});

describe("isOpenStage / isClosedStage", () => {
  it("treats lead, qualified, proposal as open", () => {
    expect(isOpenStage("lead")).toBe(true);
    expect(isOpenStage("qualified")).toBe(true);
    expect(isOpenStage("proposal")).toBe(true);
  });

  it("treats won and lost as not-open", () => {
    expect(isOpenStage("won")).toBe(false);
    expect(isOpenStage("lost")).toBe(false);
  });

  it("treats won and lost as closed", () => {
    expect(isClosedStage("won")).toBe(true);
    expect(isClosedStage("lost")).toBe(true);
  });

  it("treats open stages as not-closed", () => {
    expect(isClosedStage("lead")).toBe(false);
    expect(isClosedStage("qualified")).toBe(false);
    expect(isClosedStage("proposal")).toBe(false);
  });
});
