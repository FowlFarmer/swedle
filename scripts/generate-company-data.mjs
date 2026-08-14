import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourcePaths = [
  resolve("data/companies.sql"),
  resolve("data/companies-expanded.sql"),
];
const eligibilityPath = resolve("data/daily-eligible-companies.txt");
const outputPath = resolve(".generated/companies.json");
const source = (await Promise.all(sourcePaths.map((path) => readFile(path, "utf8")))).join("\n");
const eligibleSlugs = new Set(
  (await readFile(eligibilityPath, "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")),
);
const rowPattern = /\('([^']+)', '([^']+)', (\d+), (\d+), '([^']+)', (\d+), array\[([^\]]+)\], array\[([^\]]+)\], '([^']*)'\)/g;
const parseArray = (value) => [...value.matchAll(/'([^']+)'/g)].map((match) => match[1]);
const companies = [];

for (const match of source.matchAll(rowPattern)) {
  companies.push({
    id: match[1],
    slug: match[1],
    name: match[2],
    foundingYear: Number(match[3]),
    newGradTcUsd: Number(match[4]),
    compensationAsOf: match[5],
    sizeBand: Number(match[6]),
    domains: parseArray(match[7]),
    sweOffices: parseArray(match[8]),
    provenanceNotes: match[9],
    dailyEligible: eligibleSlugs.has(match[1]),
  });
}

const duplicateSlugs = companies
  .map((company) => company.slug)
  .filter((slug, index, slugs) => slugs.indexOf(slug) !== index);

if (duplicateSlugs.length > 0) {
  throw new Error(`Duplicate company slugs: ${[...new Set(duplicateSlugs)].join(", ")}.`);
}

const catalogSlugs = new Set(companies.map((company) => company.slug));
const unknownEligibleSlugs = [...eligibleSlugs].filter((slug) => !catalogSlugs.has(slug));
if (unknownEligibleSlugs.length > 0) {
  throw new Error(`Unknown daily-eligible slugs: ${unknownEligibleSlugs.join(", ")}.`);
}

if (companies.length < 250) {
  throw new Error(`Expected at least 250 companies, parsed ${companies.length}.`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(companies, null, 2)}\n`);
console.log(`Generated ${companies.length} companies.`);
