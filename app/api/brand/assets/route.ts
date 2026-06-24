import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const ASSETS_DIR = path.join(process.cwd(), "public", "brand");
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

export interface BrandAsset {
  filename: string;
  url: string;       // public URL for <img> preview
  isLogo: boolean;
}

export async function GET() {
  if (!fs.existsSync(ASSETS_DIR)) {
    return NextResponse.json({ assets: [] });
  }

  const files = fs.readdirSync(ASSETS_DIR).filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTS.has(ext);
  });

  const assets: BrandAsset[] = files.map((f) => ({
    filename: f,
    url: `/brand/${f}`,
    isLogo: f.toLowerCase().includes("logo"),
  }));

  return NextResponse.json({ assets });
}
