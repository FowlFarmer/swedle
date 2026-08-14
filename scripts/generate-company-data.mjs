import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const sourcePath = resolve("data/companies.sql");
const outputPath = resolve(".generated/companies.json");
const source = await readFile(sourcePath, "utf8");
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
  });
}

if (companies.length < 70) {
  throw new Error(`Expected at least 70 companies, parsed ${companies.length}.`);
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(companies, null, 2)}\n`);
console.log(`Generated ${companies.length} companies.`);
