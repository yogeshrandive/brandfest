import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { BrandConfig } from "@/lib/types";

export const runtime = "nodejs";

const BRAND_PATH = path.join(process.cwd(), "config", "brand.json");

export async function GET() {
  const brand: BrandConfig = JSON.parse(fs.readFileSync(BRAND_PATH, "utf-8"));
  return NextResponse.json(brand);
}

export async function PATCH(req: NextRequest) {
  let updates: Partial<BrandConfig>;
  try {
    updates = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current: BrandConfig = JSON.parse(fs.readFileSync(BRAND_PATH, "utf-8"));
  const merged: BrandConfig = {
    ...current,
    ...updates,
    colors: { ...current.colors, ...(updates.colors ?? {}) },
    contact: { ...current.contact, ...(updates.contact ?? {}) },
  };

  let persisted = false;
  try {
    fs.writeFileSync(BRAND_PATH, JSON.stringify(merged, null, 2) + "\n");
    persisted = true;
  } catch {
    // Vercel production: filesystem is read-only. Return the merged config anyway
    // so the UI can offer a manual download.
  }

  return NextResponse.json({ brand: merged, persisted });
}
