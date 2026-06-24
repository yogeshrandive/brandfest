import { NextResponse } from "next/server";
import { loadScenes } from "@/lib/scenes";

export const runtime = "nodejs";

export async function GET() {
  const scenes = loadScenes();
  return NextResponse.json(scenes);
}
