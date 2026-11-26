import { NextRequest, NextResponse } from "next/server";
import { runSeoCheck, SEO_TOOL_IDS, type SeoToolId } from "@/lib/seo-tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple in-memory throttle: max 30 checks per IP per minute (per instance).
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_HITS = 30;

function throttled(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > MAX_HITS;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json(
      { error: "Too many checks from this network — please wait a minute and try again." },
      { status: 429 },
    );
  }
  const sp = req.nextUrl.searchParams;
  const tool = (sp.get("tool") ?? "") as SeoToolId;
  if (!SEO_TOOL_IDS.includes(tool)) {
    return NextResponse.json(
      { error: `Unknown tool. Use ?tool= one of: ${SEO_TOOL_IDS.join(", ")}.` },
      { status: 400 },
    );
  }
  const url = sp.get("url") ?? "";
  const url2 = sp.get("url2") ?? "";
  const keyword = sp.get("keyword") ?? "";
  if (tool !== "brief" && !url) {
    return NextResponse.json({ error: "Missing ?url= parameter." }, { status: 400 });
  }
  try {
    const result = await runSeoCheck(tool, { url, url2, keyword });
    return NextResponse.json(result, {
      status: result.error ? 422 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "The check failed unexpectedly. Please try again." },
      { status: 500 },
    );
  }
}
