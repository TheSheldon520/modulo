// apps/web/lib/sales-deal-stages-ui.test.ts
//
// Unit tests for the kanban stage UI helpers. Pure node environment — no DOM.

import { describe, expect, it } from "vitest";

import {
  getKanbanColumnDotClasses,
  getKanbanColumnHeaderClasses,
} from "./sales-deal-stages-ui";

describe("getKanbanColumnHeaderClasses", () => {
  it('returns text-info for "info" (lead)', () => {
    expect(getKanbanColumnHeaderClasses("info")).toBe("text-info");
  });

  it('returns text-text-secondary for "neutral" (qualified)', () => {
    expect(getKanbanColumnHeaderClasses("neutral")).toBe("text-text-secondary");
  });

  it('returns text-warning for "warning" (proposal)', () => {
    expect(getKanbanColumnHeaderClasses("warning")).toBe("text-warning");
  });

  it('returns text-success for "success" (won)', () => {
    expect(getKanbanColumnHeaderClasses("success")).toBe("text-success");
  });

  it('returns text-danger for "danger" (lost)', () => {
    expect(getKanbanColumnHeaderClasses("danger")).toBe("text-danger");
  });
});

describe("getKanbanColumnDotClasses", () => {
  it('returns bg-info/60 for "info"', () => {
    expect(getKanbanColumnDotClasses("info")).toBe("bg-info/60");
  });

  it('returns low-opacity neutral for "neutral"', () => {
    expect(getKanbanColumnDotClasses("neutral")).toBe("bg-text-tertiary/40");
  });

  it('returns bg-warning/60 for "warning"', () => {
    expect(getKanbanColumnDotClasses("warning")).toBe("bg-warning/60");
  });

  it('returns bg-success/60 for "success"', () => {
    expect(getKanbanColumnDotClasses("success")).toBe("bg-success/60");
  });

  it('returns bg-danger/60 for "danger"', () => {
    expect(getKanbanColumnDotClasses("danger")).toBe("bg-danger/60");
  });
});
