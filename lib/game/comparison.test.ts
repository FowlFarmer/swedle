import { describe, expect, it } from "vitest";

import { buildShareText, compareCompanies, compareSets } from "@/lib/game/comparison";
import type { CompanyFacts } from "@/lib/types";

const apple: CompanyFacts = {
  id: "apple",
  slug: "apple",
  name: "Apple",
  foundingYear: 1976,
  newGradTcUsd: 180000,
  sizeBand: 6,
  domains: ["hardware", "software", "services"],
  sweOffices: ["Cupertino", "Seattle"],
};

const amd: CompanyFacts = {
  id: "amd",
  slug: "amd",
  name: "AMD",
  foundingYear: 1969,
  newGradTcUsd: 145000,
  sizeBand: 6,
  domains: ["hardware"],
  sweOffices: ["Austin", "Bay Area"],
};

describe("set comparison", () => {
  it("marks identical normalized sets exact", () => {
    expect(compareSets(["Cloud", "AI"], ["ai", "cloud"])).toBe("exact");
  });

  it("marks a non-empty subset overlap partial", () => {
    expect(compareSets(apple.domains, amd.domains)).toBe("partial");
  });

  it("marks disjoint sets as misses", () => {
    expect(compareSets(["fintech"], ["robotics"])).toBe("miss");
  });
});

describe("company comparison", () => {
  it("makes Apple versus AMD orange for domain overlap", () => {
    const result = compareCompanies(apple, amd, 1);
    expect(result.cells.domains.tone).toBe("partial");
    expect(result.cells.size.tone).toBe("exact");
    expect(result.cells.founded.direction).toBe("lower");
    expect(result.cells.compensation.direction).toBe("lower");
  });

  it("does not leak names into the share result", () => {
    const guess = compareCompanies(apple, amd, 1);
    const text = buildShareText("#20260813", "lost", [guess]);
    expect(text).toContain("X/5");
    expect(text).toContain("🟧");
    expect(text).not.toContain("Apple");
    expect(text).not.toContain("AMD");
  });
});
