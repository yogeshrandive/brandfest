"use client";

import type { BrandConfig } from "./types";

// Browser-only persistence. Brand profile and the LLM model list live here,
// not in server config — so users can experiment freely from their own device.

const BRAND_KEY = "bf.brand";
const MODELS_KEY = "bf.models";
const ACTIVE_KEY = "bf.activeModels";

export const DEFAULT_MODELS = [
  "google/gemini-flash-1.5",
  "anthropic/claude-haiku-4-5",
  "openai/gpt-4o-mini",
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

// ── Brand ──
export function getBrand(): BrandConfig | null {
  return read<BrandConfig | null>(BRAND_KEY, null);
}
export function saveBrand(brand: BrandConfig) {
  write(BRAND_KEY, brand);
}

// ── Models ──
export function getModels(): string[] {
  const list = read<string[]>(MODELS_KEY, DEFAULT_MODELS);
  return list.length ? list : DEFAULT_MODELS;
}
export function saveModels(list: string[]) {
  write(MODELS_KEY, list);
}
export function addModel(id: string): string[] {
  const trimmed = id.trim();
  const list = getModels();
  if (!trimmed || list.includes(trimmed)) return list;
  const next = [...list, trimmed];
  saveModels(next);
  return next;
}
export function deleteModel(id: string): string[] {
  const next = getModels().filter((m) => m !== id);
  saveModels(next);
  // keep active list consistent
  setActiveModels(getActiveModels().filter((m) => m !== id));
  return next;
}

// ── Active (selected for compare) ──
export function getActiveModels(): string[] {
  const active = read<string[]>(ACTIVE_KEY, []);
  const models = getModels();
  const valid = active.filter((m) => models.includes(m));
  return valid.length ? valid : models.slice(0, 1);
}
export function setActiveModels(list: string[]) {
  write(ACTIVE_KEY, list);
}
