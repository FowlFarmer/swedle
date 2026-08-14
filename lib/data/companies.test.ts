import { describe, expect, it } from "vitest";

import { COMPANIES, COMPANY_BY_SLUG, DAILY_COMPANIES } from "@/lib/data/companies";

describe("company catalog", () => {
  it("keeps a broad searchable catalog", () => {
    expect(COMPANIES.length).toBeGreaterThanOrEqual(350);
    expect(new Set(COMPANIES.map((company) => company.slug)).size).toBe(COMPANIES.length);

    for (const slug of ["xai", "wealthsimple", "citadel", "citadel-securities", "ramp", "ripple", "splunk"]) {
      expect(COMPANY_BY_SLUG.has(slug), `${slug} is missing`).toBe(true);
    }
  });

  it("classifies every listing and keeps automatic answers high-recall", () => {
    expect(COMPANIES.every((company) => typeof company.dailyEligible === "boolean")).toBe(true);
    expect(DAILY_COMPANIES.length).toBeGreaterThanOrEqual(100);
    expect(DAILY_COMPANIES.length).toBeLessThanOrEqual(140);
    expect(DAILY_COMPANIES.length).toBeLessThan(COMPANIES.length);

    for (const slug of ["xai", "citadel", "ramp", "ripple", "splunk"]) {
      expect(COMPANY_BY_SLUG.get(slug)?.dailyEligible, `${slug} should be daily eligible`).toBe(true);
    }

    for (const slug of ["indeed", "wealthsimple"]) {
      expect(COMPANY_BY_SLUG.get(slug)?.dailyEligible, `${slug} should be guess-only`).toBe(false);
    }
  });
});
