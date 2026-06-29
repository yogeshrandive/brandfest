import { NextResponse } from "next/server";
import { loadIndustries } from "@/lib/industries";

export const runtime = "nodejs";

export async function GET() {
  const industries = loadIndustries();
  return NextResponse.json(industries);
}
