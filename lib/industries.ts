import fs from "fs";
import path from "path";
import type { Industry, Subcategory } from "./types";

const INDUSTRIES_DIR = path.join(process.cwd(), "config", "industries");

export function loadIndustries(): Industry[] {
  if (!fs.existsSync(INDUSTRIES_DIR)) return [];
  return fs
    .readdirSync(INDUSTRIES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(INDUSTRIES_DIR, f), "utf-8")) as Industry);
}

export function loadIndustry(id: string): Industry | null {
  const file = path.join(INDUSTRIES_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Industry;
}

export function loadSubcategory(industryId: string, subId: string): Subcategory | null {
  const industry = loadIndustry(industryId);
  if (!industry) return null;
  return industry.subcategories.find((s) => s.id === subId) ?? null;
}
