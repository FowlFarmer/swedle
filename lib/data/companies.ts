import companies from "@/.generated/companies.json";
import type { CompanyFacts } from "@/lib/types";

export const COMPANIES = companies satisfies Array<CompanyFacts & {
  compensationAsOf: string;
  provenanceNotes: string;
  dailyEligible: boolean;
}>;

export const DAILY_COMPANIES = COMPANIES.filter((company) => company.dailyEligible);
export const COMPANY_BY_SLUG = new Map(COMPANIES.map((company) => [company.slug, company]));
