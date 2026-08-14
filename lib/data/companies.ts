import companies from "@/.generated/companies.json";
import type { CompanyFacts } from "@/lib/types";

export const COMPANIES = companies satisfies Array<CompanyFacts & {
  compensationAsOf: string;
  provenanceNotes: string;
}>;

export const COMPANY_BY_SLUG = new Map(COMPANIES.map((company) => [company.slug, company]));
