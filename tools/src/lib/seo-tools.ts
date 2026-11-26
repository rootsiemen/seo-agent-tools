/**
 * SEO checker tools engine — live URL analysis for the 8 clickable SEO
 * tools on frinjo.me (technical, schema, sitemap, on-page, meta tags,
 * robots.txt, AI readiness, images).
 *
 * Every analyzer fetches the target page server-side and runs real checks
 * on the returned HTML / headers. Fetches are SSRF-guarded: only http and
 * https, and localhost / private / reserved hosts are rejected both as
 * literal hostnames and after DNS resolution, on every redirect hop.
 */

import { lookup } from "node:dns/promises";
import net from "node:net";

export type SeoToolId =
  | "technical"
  | "schema"
  | "sitemap"
  | "onpage"
  | "metatags"
  | "robots"
  | "ai-readiness"
  | "images"
  | "local"
  | "backlinks"
  | "competitor"
  | "internal"
  | "brief";

export const SEO_TOOL_IDS: SeoToolId[] = [
  "technical",
  "schema",
  "sitemap",
  "onpage",
  "metatags",
  "robots",
  "ai-readiness",
  "images",
  "local",
  "backlinks",
  "competitor",
  "internal",
  "brief",
];

export type SeoCheckStatus = "pass" | "warn" | "fail";

export interface SeoCheck {
  label: string;
  status: SeoCheckStatus;
  detail: string;
}

export interface SeoResultItem {
  label: string;
  value: string;
  status?: SeoCheckStatus;
}

export interface SeoToolResult {
  tool: SeoToolId;
  url: string;
  finalUrl: string;
  fetchedAt: string;
  score: number;
  checks: SeoCheck[];
  summary: string;
  items?: SeoResultItem[];
  rawText?: string;
  compare?: {
    aLabel: string;
    bLabel: string;
    scoreA: number;
    scoreB: number;
    rows: { label: string; a: string; b: string }[];
  };
  error?: string;
}

const UA =
  "Mozilla/5.0 (compatible; FrinjoSeoChecker/1.0; +https://frinjo.me/seo)";
const TIMEOUT_MS = 10_000;
const MAX_BODY = 2 * 1024 * 1024;

/* ---------------- SSRF protection ---------------- */

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    const [a, b] = p;
    if (a === 0) return true; // 0.0.0.0/8 "this host"
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 + 192.0.2.0/24 (TEST-NET-1)
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT shared space
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a === 198 && b === 51) return true; // TEST-NET-2
    if (a === 203 && b === 0) return true; // TEST-NET-3 (203.0.113.0/24)
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true; // loopback / unspecified
    if (v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return true; // link-local fe80::/10
    if (v.startsWith("fc") || v.startsWith("fd")) return true; // unique local fc00::/7
    if (v.startsWith("ff")) return true; // multicast
    if (v.startsWith("2001:db8")) return true; // documentation
    if (v.startsWith("::ffff:")) {
      const mapped = v.slice("::ffff:".length);
      if (net.isIPv4(mapped)) return isPrivateIp(mapped);
      return true;
    }
    return false;
  }
  return true; // not a parseable IP — treat as unsafe when used as an IP
}

/** Returns an error message when the URL must not be fetched, else null. */
export async function assertSafeUrl(u: URL): Promise<string | null> {
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return "Only http:// and https:// URLs can be checked.";
  }
  const host = u.hostname.toLowerCase();
  if (!host) return "That URL has no host name.";
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home") ||
    host.endsWith(".lan") ||
    host.endsWith(".intranet")
  ) {
    return "Local and internal addresses can't be checked — enter a public website URL.";
  }
  const bare = host.replace(/^\[|\]$/g, "");
  if (net.isIP(bare)) {
    if (isPrivateIp(bare)) {
      return "Private, loopback and reserved IP addresses can't be checked.";
    }
    return null;
  }
  // Resolve and reject hostnames that point at private addresses.
  try {
    const records = await lookup(host, { all: true, verbatim: true });
    for (const r of records) {
      // 198.18.0.0/15 is the benchmarking range (RFC 2544): never a real
      // internal target, but fake-IP proxies map every public host into it.
      // Ignore it in DNS results only — a literal 198.18 IP stays blocked
      // by the isIP branch above, and all true private ranges still block.
      const benchmark =
        net.isIPv4(r.address) && (r.address.startsWith("198.18.") || r.address.startsWith("198.19."));
      if (isPrivateIp(r.address) && !benchmark) {
        return "That host resolves to a private IP address, so it can't be checked.";
      }
    }
  } catch {
    // DNS failure will surface as a fetch error below.
  }
  return null;
}

export class SeoFetchError extends Error {}

interface FetchResult {
  status: number;
  headers: Headers;
  body: string;
  finalUrl: string;
  ms: number;
  redirects: number;
}

/** Fetch with manual redirect following; every hop is SSRF-checked. */
export async function fetchSafe(input: string, maxBody = MAX_BODY): Promise<FetchResult> {
  let current = input;
  let redirects = 0;
  const start = Date.now();
  for (;;) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      throw new SeoFetchError("That doesn't look like a valid URL.");
    }
    const err = await assertSafeUrl(u);
    if (err) throw new SeoFetchError(err);
    let res: Response;
    try {
      res = await fetch(current, {
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,application/xml,text/plain,*/*",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new SeoFetchError(
        `Could not fetch ${current} — the site is unreachable or took longer than ${TIMEOUT_MS / 1000}s to respond.`,
      );
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (loc && redirects < 5) {
        current = new URL(loc, current).toString();
        redirects++;
        continue;
      }
    }
    let body = "";
    try {
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          body += decoder.decode(value, { stream: true });
          if (body.length > maxBody) {
            body = body.slice(0, maxBody);
            await reader.cancel().catch(() => undefined);
            break;
          }
        }
        body += decoder.decode();
      } else {
        body = (await res.text()).slice(0, maxBody);
      }
    } catch {
      // keep whatever partial body arrived
    }
    return { status: res.status, headers: res.headers, body, finalUrl: current, ms: Date.now() - start, redirects };
  }
}

/** fetchSafe that never throws — returns null on any failure. */
async function fetchSafeOrNull(input: string, maxBody = MAX_BODY): Promise<FetchResult | null> {
  try {
    return await fetchSafe(input, maxBody);
  } catch {
    return null;
  }
}

export function normalizeUrl(input: string): string | null {
  let u = input.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/* ---------------- tiny HTML helpers (no dependencies) ---------------- */

function stripTags(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function visibleText(html: string): string {
  const noScripts = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  return stripTags(noScripts);
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3] ?? "") : null;
}

function allTags(html: string, name: string): string[] {
  return html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];
}

function tagContents(html: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(stripTags(m[1]));
  return out;
}

function getTitle(html: string): string | null {
  const t = tagContents(html, "title")[0];
  return t ? t : null;
}

function getMeta(html: string, key: string, byProperty = false): string | null {
  for (const tag of allTags(html, "meta")) {
    const k = byProperty ? attr(tag, "property") : attr(tag, "name");
    if (k && k.toLowerCase() === key.toLowerCase()) return attr(tag, "content");
  }
  return null;
}

function getCanonical(html: string): string | null {
  for (const tag of allTags(html, "link")) {
    const rel = attr(tag, "rel");
    if (rel && rel.toLowerCase().split(/\s+/).includes("canonical")) return attr(tag, "href");
  }
  return null;
}

function getFavicon(html: string): string | null {
  for (const tag of allTags(html, "link")) {
    const rel = attr(tag, "rel");
    if (rel && /icon/i.test(rel)) return attr(tag, "href");
  }
  return null;
}

interface ImgInfo {
  src: string;
  alt: string | null;
  format: string;
  lazy: boolean;
  hasDims: boolean;
}

function collectImages(html: string, base: string): ImgInfo[] {
  const out: ImgInfo[] = [];
  for (const tag of allTags(html, "img")) {
    const rawSrc = attr(tag, "src") ?? attr(tag, "data-src") ?? "";
    let src = rawSrc;
    try {
      src = new URL(rawSrc, base).toString();
    } catch {
      // keep raw
    }
    const clean = src.split(/[?#]/)[0];
    const ext = clean.includes(".") ? clean.slice(clean.lastIndexOf(".") + 1).toLowerCase() : "";
    const format = ["jpg", "jpeg", "png", "webp", "avif", "svg", "gif", "bmp", "ico"].includes(ext)
      ? ext
      : "unknown";
    out.push({
      src,
      alt: attr(tag, "alt"),
      format,
      lazy: (attr(tag, "loading") ?? "").toLowerCase() === "lazy",
      hasDims: attr(tag, "width") !== null && attr(tag, "height") !== null,
    });
  }
  return out;
}

function countLinks(html: string, finalUrl: string): { internal: number; external: number } {
  let internal = 0;
  let external = 0;
  const origin = new URL(finalUrl).origin;
  for (const tag of allTags(html, "a")) {
    const href = attr(tag, "href");
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    try {
      const u = new URL(href, finalUrl);
      if (u.origin === origin) internal++;
      else if (/^https?:$/.test(u.protocol)) external++;
    } catch {
      // ignore malformed hrefs
    }
  }
  return { internal, external };
}

/* ---------------- check plumbing ---------------- */

interface WCheck extends SeoCheck {
  weight: number;
  earned: number;
}

function mk(label: string, status: SeoCheckStatus, detail: string, weight = 1): WCheck {
  return { label, status, detail, weight, earned: status === "pass" ? 1 : status === "warn" ? 0.5 : 0 };
}

function finish(
  tool: SeoToolId,
  url: string,
  page: FetchResult,
  checks: WCheck[],
  summary: string,
  extra?: Partial<SeoToolResult>,
): SeoToolResult {
  const max = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + c.weight * c.earned, 0);
  return {
    tool,
    url,
    finalUrl: page.finalUrl,
    fetchedAt: new Date().toISOString(),
    score: max ? Math.round((got / max) * 100) : 0,
    checks: checks.map(({ label, status, detail }) => ({ label, status, detail })),
    summary,
    ...extra,
  };
}

function failCount(checks: WCheck[]): number {
  return checks.filter((c) => c.status === "fail").length;
}

/* ---------------- robots.txt parsing ---------------- */

export interface RobotsGroup {
  agents: string[];
  disallow: string[];
  allow: string[];
}

export interface RobotsParsed {
  groups: RobotsGroup[];
  sitemaps: string[];
}

export function parseRobotsFull(text: string): RobotsParsed {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const k = line.slice(0, idx).trim().toLowerCase();
    const v = line.slice(idx + 1).trim();
    if (k === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(v);
      lastWasAgent = true;
    } else if (k === "sitemap") {
      sitemaps.push(v);
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
      if (!current) continue;
      if (k === "disallow") current.disallow.push(v);
      if (k === "allow") current.allow.push(v);
    }
  }
  return { groups, sitemaps };
}

/** Is `path` blocked for `agent`? Longest-match wins, Allow beats Disallow on ties. */
export function robotsBlocks(parsed: RobotsParsed, agent: string, path: string): boolean {
  const a = agent.toLowerCase();
  let group: RobotsGroup | undefined = parsed.groups.find((g) =>
    g.agents.some((x) => x.toLowerCase() === a),
  );
  if (!group) group = parsed.groups.find((g) => g.agents.includes("*"));
  if (!group) return false;
  let bestLen = -1;
  let blocked = false;
  for (const d of group.disallow) {
    if (d && path.startsWith(d) && d.length > bestLen) {
      bestLen = d.length;
      blocked = true;
    }
  }
  for (const al of group.allow) {
    if (al && path.startsWith(al) && al.length >= bestLen) {
      bestLen = al.length;
      blocked = false;
    }
  }
  return blocked;
}

export const AI_CRAWLERS = ["GPTBot", "ClaudeBot", "Google-Extended", "PerplexityBot"];

/* ---------------- 1. Technical SEO ---------------- */

async function analyzeTechnical(url: string, page: FetchResult): Promise<SeoToolResult> {
  const html = page.body;
  const final = new URL(page.finalUrl);
  const checks: WCheck[] = [];
  checks.push(
    mk(
      "HTTP status",
      page.status === 200 ? "pass" : page.status < 400 ? "warn" : "fail",
      `Server returned ${page.status} for the final URL.`,
      2,
    ),
  );
  checks.push(
    mk(
      "HTTPS",
      final.protocol === "https:" ? "pass" : "fail",
      final.protocol === "https:" ? "Final URL is served over HTTPS." : `Final URL uses ${final.protocol} — not secure.`,
      2,
    ),
  );
  checks.push(
    mk(
      "Redirects",
      page.redirects === 0 ? "pass" : page.redirects <= 2 ? "warn" : "fail",
      page.redirects === 0
        ? "The URL responds directly, with no redirect chain."
        : `The URL redirects ${page.redirects} time${page.redirects === 1 ? "" : "s"} before the final page.`,
    ),
  );
  checks.push(
    mk(
      "Response time",
      page.ms < 800 ? "pass" : page.ms < 2000 ? "warn" : "fail",
      `Server responded in ${page.ms.toLocaleString()} ms (time to full HTML download).`,
    ),
  );
  const kb = Math.round(page.body.length / 1024);
  checks.push(
    mk(
      "HTML size",
      page.body.length < 200 * 1024 ? "pass" : page.body.length < 500 * 1024 ? "warn" : "fail",
      `The HTML document is ${kb.toLocaleString()} KB before compression.`,
    ),
  );
  const title = getTitle(html);
  checks.push(mk("Title tag", title ? "pass" : "fail", title ? `Title found: “${title}”` : "No <title> tag found.", 2));
  const desc = getMeta(html, "description");
  checks.push(
    mk("Meta description", desc ? "pass" : "fail", desc ? "A meta description is present." : "No meta description found.", 2),
  );
  const canonical = getCanonical(html);
  checks.push(
    mk("Canonical URL", canonical ? "pass" : "warn", canonical ? `Canonical: ${canonical}` : "No canonical link tag — search engines will guess the preferred URL."),
  );
  const robotsMeta = (getMeta(html, "robots") ?? "").toLowerCase();
  checks.push(
    mk(
      "Robots meta",
      /noindex/.test(robotsMeta) ? "fail" : "pass",
      robotsMeta ? `Robots meta: “${robotsMeta}”${/noindex/.test(robotsMeta) ? " — this page asks search engines NOT to index it." : ""}` : "No robots meta tag — the page is indexable by default.",
      2,
    ),
  );
  const h1s = tagContents(html, "h1");
  checks.push(
    mk(
      "H1 heading",
      h1s.length === 1 ? "pass" : h1s.length === 0 ? "fail" : "warn",
      h1s.length === 0 ? "No H1 heading found." : h1s.length === 1 ? `Exactly one H1: “${h1s[0]}”` : `${h1s.length} H1 headings found — a page should have exactly one.`,
    ),
  );
  const viewport = getMeta(html, "viewport");
  checks.push(
    mk("Mobile viewport", viewport ? "pass" : "fail", viewport ? `Viewport: ${viewport}` : "No viewport meta tag — the page will render zoomed-out on phones."),
  );
  const charsetTag = allTags(html, "meta").find((t) => attr(t, "charset") !== null);
  const httpEquiv = getMeta(html, "content-type");
  checks.push(
    mk("Character encoding", charsetTag || httpEquiv ? "pass" : "warn", charsetTag ? `Charset declared: ${attr(charsetTag, "charset")}` : httpEquiv ? "Charset declared via http-equiv." : "No charset declaration found in the HTML."),
  );
  const origin = final.origin;
  const [robotsRes, sitemapRes] = await Promise.all([
    fetchSafeOrNull(origin + "/robots.txt", 256 * 1024),
    fetchSafeOrNull(origin + "/sitemap.xml", 256 * 1024),
  ]);
  checks.push(
    mk(
      "robots.txt reachable",
      robotsRes && robotsRes.status === 200 ? "pass" : "fail",
      robotsRes && robotsRes.status === 200 ? `${origin}/robots.txt returns 200.` : `${origin}/robots.txt could not be fetched (status ${robotsRes?.status ?? "error"}).`,
    ),
  );
  checks.push(
    mk(
      "sitemap.xml reachable",
      sitemapRes && sitemapRes.status === 200 ? "pass" : "warn",
      sitemapRes && sitemapRes.status === 200 ? `${origin}/sitemap.xml returns 200.` : `${origin}/sitemap.xml could not be fetched (status ${sitemapRes?.status ?? "error"}).`,
    ),
  );
  const fails = failCount(checks);
  return finish(
    "technical",
    url,
    page,
    checks,
    fails === 0
      ? "Technical foundations look solid — the page is reachable, secure, indexable and well-formed."
      : `${fails} technical problem${fails === 1 ? "" : "s"} found. Fix the red items first: they are the ones that block crawling and indexing.`,
  );
}

/* ---------------- 2. Schema / structured data ---------------- */

const REQUIRED_FIELDS: Record<string, string[]> = {
  Article: ["headline"],
  BlogPosting: ["headline"],
  NewsArticle: ["headline"],
  Organization: ["name"],
  LocalBusiness: ["name"],
  FAQPage: ["mainEntity"],
  Product: ["name"],
  BreadcrumbList: ["itemListElement"],
  WebSite: ["name"],
  Person: ["name"],
  Recipe: ["name"],
  Event: ["name", "startDate"],
  VideoObject: ["name", "thumbnailUrl", "uploadDate"],
  HowTo: ["name", "step"],
};

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur && typeof cur === "object") cur = (cur as Record<string, unknown>)[part];
    else return undefined;
  }
  return cur;
}

async function analyzeSchema(url: string, page: FetchResult): Promise<SeoToolResult> {
  const html = page.body;
  const checks: WCheck[] = [];
  const blocks = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  const parsed: unknown[] = [];
  let invalid = 0;
  for (const block of blocks) {
    const inner = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    try {
      parsed.push(JSON.parse(inner));
    } catch {
      invalid++;
    }
  }
  checks.push(
    mk(
      "JSON-LD present",
      blocks.length > 0 ? "pass" : "fail",
      blocks.length > 0 ? `${blocks.length} JSON-LD block${blocks.length === 1 ? "" : "s"} found on the page.` : "No JSON-LD structured data found — the page is invisible to rich results.",
      3,
    ),
  );
  if (blocks.length > 0) {
    checks.push(
      mk(
        "JSON-LD is valid JSON",
        invalid === 0 ? "pass" : "fail",
        invalid === 0 ? "Every JSON-LD block parses as valid JSON." : `${invalid} of ${blocks.length} JSON-LD block(s) contain invalid JSON and will be ignored by Google.`,
        2,
      ),
    );
  }
  // Collect typed nodes.
  const typedNodes: { type: string; node: Record<string, unknown> }[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node && typeof node === "object") {
      const rec = node as Record<string, unknown>;
      const t = rec["@type"];
      const types = typeof t === "string" ? [t] : Array.isArray(t) ? t.filter((x): x is string => typeof x === "string") : [];
      for (const type of types) typedNodes.push({ type, node: rec });
      Object.values(rec).forEach(walk);
    }
  };
  parsed.forEach(walk);
  const typeNames = [...new Set(typedNodes.map((n) => n.type))].sort();
  checks.push(
    mk(
      "Schema types found",
      typeNames.length > 0 ? "pass" : "warn",
      typeNames.length > 0 ? `Types detected: ${typeNames.join(", ")}.` : "Blocks parse but declare no @type.",
      2,
    ),
  );
  const hasContext = parsed.some(
    (p) => p && typeof p === "object" && "@context" in (p as Record<string, unknown>),
  );
  if (blocks.length > 0) {
    checks.push(
      mk("@context declared", hasContext ? "pass" : "warn", hasContext ? "Top-level @context is declared (schema.org)." : "No top-level @context found — nested @graph blocks may still carry it."),
    );
  }
  // Per-type required fields.
  const checkedTypes = new Set<string>();
  for (const { type, node } of typedNodes) {
    const req = REQUIRED_FIELDS[type];
    if (!req || checkedTypes.has(type)) continue;
    checkedTypes.add(type);
    const missing = req.filter((f) => getPath(node, f) === undefined || getPath(node, f) === "");
    checks.push(
      mk(
        `${type} required fields`,
        missing.length === 0 ? "pass" : "warn",
        missing.length === 0
          ? `${type} includes its required field${req.length === 1 ? "" : "s"} (${req.join(", ")}).`
          : `${type} is missing recommended required field(s): ${missing.join(", ")}.`,
      ),
    );
  }
  const microdata = html.match(/itemtype\s*=\s*["'][^"']*schema\.org[^"']*["']/gi) ?? [];
  checks.push(
    mk(
      "Microdata",
      microdata.length > 0 ? "pass" : "warn",
      microdata.length > 0 ? `${microdata.length} element(s) carry schema.org microdata (itemtype).` : "No schema.org microdata found — fine if JSON-LD covers everything, but worth knowing.",
    ),
  );
  const fails = failCount(checks);
  return finish(
    "schema",
    url,
    page,
    checks,
    typeNames.length > 0
      ? `Found ${typeNames.length} schema type${typeNames.length === 1 ? "" : "s"}: ${typeNames.join(", ")}.${fails ? " Fix the red items — invalid JSON-LD is silently ignored by search engines." : ""}`
      : "No usable structured data on this page. Adding JSON-LD is the fastest route to rich results.",
    { items: typeNames.map((t) => ({ label: t, value: "JSON-LD", status: "pass" as const })) },
  );
}

/* ---------------- 3. Sitemap ---------------- */

function extractLocs(xml: string): string[] {
  const out: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) out.push(m[1]);
  return out;
}

async function analyzeSitemap(url: string, page: FetchResult): Promise<SeoToolResult> {
  const origin = new URL(page.finalUrl).origin;
  const checks: WCheck[] = [];
  let sitemapRes = await fetchSafeOrNull(origin + "/sitemap.xml");
  let sitemapUrl = origin + "/sitemap.xml";
  if (!sitemapRes || sitemapRes.status !== 200) {
    // Fall back to a Sitemap: line in robots.txt.
    const robotsRes = await fetchSafeOrNull(origin + "/robots.txt", 256 * 1024);
    const declared = robotsRes && robotsRes.status === 200 ? parseRobotsFull(robotsRes.body).sitemaps : [];
    if (declared.length > 0) {
      sitemapUrl = declared[0];
      sitemapRes = await fetchSafeOrNull(declared[0]);
    }
  }
  const found = !!sitemapRes && sitemapRes.status === 200;
  checks.push(
    mk(
      "Sitemap exists",
      found ? "pass" : "fail",
      found ? `Sitemap found at ${sitemapUrl}.` : `No sitemap at ${origin}/sitemap.xml and none declared in robots.txt.`,
      3,
    ),
  );
  if (!found || !sitemapRes) {
    return finish("sitemap", url, page, checks, "No sitemap could be fetched. Without one, search engines must discover every page by following links.");
  }
  const xml = sitemapRes.body;
  const isIndex = /<sitemapindex/i.test(xml);
  checks.push(
    mk("Sitemap format", "pass", isIndex ? "This is a sitemap index that points to child sitemaps." : "This is a standard URL sitemap (urlset)."),
  );
  let urls: string[] = [];
  let childCount = 0;
  if (isIndex) {
    const children = extractLocs(xml).slice(0, 10);
    childCount = extractLocs(xml).length;
    for (const child of children) {
      const childRes = await fetchSafeOrNull(child);
      if (childRes && childRes.status === 200) urls.push(...extractLocs(childRes.body));
      if (urls.length > 5000) break;
    }
  } else {
    urls = extractLocs(xml);
  }
  checks.push(
    mk(
      "URL count",
      urls.length > 0 ? "pass" : "fail",
      isIndex
        ? `${childCount} child sitemap(s); counted ${urls.length.toLocaleString()} URLs across the first ${Math.min(childCount, 10)} children.`
        : `${urls.length.toLocaleString()} URLs listed in the sitemap.`,
      2,
    ),
  );
  const lastmodCount = (xml.match(/<lastmod>/gi) ?? []).length;
  checks.push(
    mk(
      "<lastmod> dates",
      lastmodCount > 0 ? "pass" : "warn",
      lastmodCount > 0 ? `${lastmodCount.toLocaleString()} <lastmod> entries in the top-level sitemap help crawlers prioritise fresh pages.` : "No <lastmod> dates — Google can still crawl, but fresh content gets no priority signal.",
    ),
  );
  // Sample-check up to 5 URLs.
  const sample = urls.slice(0, 5);
  let okCount = 0;
  const sampleItems: SeoResultItem[] = [];
  for (const u of sample) {
    const r = await fetchSafeOrNull(u, 64 * 1024);
    const status = r ? r.status : 0;
    if (status === 200) okCount++;
    sampleItems.push({ label: u, value: status ? `HTTP ${status}` : "unreachable", status: status === 200 ? "pass" : "fail" });
  }
  checks.push(
    mk(
      "Sampled URLs are live",
      sample.length === 0 ? "warn" : okCount === sample.length ? "pass" : okCount >= 3 ? "warn" : "fail",
      sample.length === 0
        ? "No URLs available to sample."
        : `${okCount} of ${sample.length} sampled URLs returned 200. Dead URLs in a sitemap waste crawl budget.`,
      2,
    ),
  );
  return finish(
    "sitemap",
    url,
    page,
    checks,
    `Sitemap lists ${urls.length.toLocaleString()} URLs.${okCount < sample.length ? " Some sampled URLs are not live — prune them." : " Sampled URLs are all live."}`,
    { items: sampleItems },
  );
}

/* ---------------- 4. On-page SEO ---------------- */

async function analyzeOnPage(url: string, page: FetchResult): Promise<SeoToolResult> {
  const html = page.body;
  const checks: WCheck[] = [];
  const title = getTitle(html);
  const tLen = title?.length ?? 0;
  checks.push(
    mk(
      "Title length",
      !title ? "fail" : tLen >= 30 && tLen <= 60 ? "pass" : tLen >= 20 && tLen <= 70 ? "warn" : "fail",
      title ? `Title is ${tLen} characters: “${title}” (aim for 30–60).` : "No title tag found.",
      2,
    ),
  );
  const desc = getMeta(html, "description");
  const dLen = desc?.length ?? 0;
  checks.push(
    mk(
      "Meta description length",
      !desc ? "fail" : dLen >= 120 && dLen <= 160 ? "pass" : dLen >= 70 && dLen <= 180 ? "warn" : "fail",
      desc ? `Description is ${dLen} characters (aim for 120–160).` : "No meta description found.",
      2,
    ),
  );
  const h1s = tagContents(html, "h1");
  const h2s = tagContents(html, "h2");
  const h3s = tagContents(html, "h3");
  checks.push(
    mk("H1 count", h1s.length === 1 ? "pass" : h1s.length === 0 ? "fail" : "warn", `${h1s.length} H1 heading(s)${h1s[0] ? `: “${h1s[0]}”` : ""}.`, 2),
  );
  checks.push(
    mk("H2 / H3 structure", h2s.length >= 2 ? "pass" : h2s.length === 1 ? "warn" : "fail", `${h2s.length} H2 and ${h3s.length} H3 headings structure the page.`),
  );
  // Heading order: first heading on the page should be the H1.
  const firstHeading = html.match(/<h([1-6])\b/i);
  checks.push(
    mk(
      "Heading order",
      firstHeading && firstHeading[1] === "1" ? "pass" : "warn",
      firstHeading ? `The first heading in the document is an H${firstHeading[1]}${firstHeading[1] === "1" ? " — correct." : " — it should be the H1."}` : "No headings found at all.",
    ),
  );
  const text = visibleText(html);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  checks.push(
    mk(
      "Word count",
      words >= 600 ? "pass" : words >= 300 ? "warn" : "fail",
      `${words.toLocaleString()} words of readable text. Thin pages (under ~300 words) rarely rank for anything competitive.`,
      2,
    ),
  );
  const links = countLinks(html, page.finalUrl);
  checks.push(
    mk("Internal links", links.internal >= 3 ? "pass" : links.internal > 0 ? "warn" : "fail", `${links.internal} internal links point to other pages on this site.`),
  );
  checks.push(
    mk("External links", links.external > 0 ? "pass" : "warn", `${links.external} external links. A few authoritative outbound links are a healthy signal; zero can look insular.`),
  );
  const images = collectImages(html, page.finalUrl);
  const missingAlt = images.filter((i) => i.alt === null || i.alt.trim() === "").length;
  checks.push(
    mk(
      "Image alt text",
      images.length === 0 ? "warn" : missingAlt === 0 ? "pass" : missingAlt <= Math.ceil(images.length * 0.25) ? "warn" : "fail",
      images.length === 0 ? "No images on the page." : `${images.length} images, ${missingAlt} missing alt text.`,
    ),
  );
  const ratio = html.length ? Math.round((text.length / html.length) * 100) : 0;
  checks.push(
    mk("Text-to-HTML ratio", ratio >= 10 ? "pass" : ratio >= 5 ? "warn" : "fail", `Readable text is about ${ratio}% of the HTML — the rest is markup, scripts and styles.`),
  );
  return finish(
    "onpage",
    url,
    page,
    checks,
    `On-page basics scored from the live HTML: ${words.toLocaleString()} words, ${links.internal} internal links, ${h2s.length} H2 sections.`,
  );
}

/* ---------------- 5. Meta tags ---------------- */

async function analyzeMetaTags(url: string, page: FetchResult): Promise<SeoToolResult> {
  const html = page.body;
  const checks: WCheck[] = [];
  const items: SeoResultItem[] = [];
  const add = (label: string, value: string | null, weight = 1, missingStatus: SeoCheckStatus = "fail") => {
    checks.push(
      mk(label, value ? "pass" : missingStatus, value ? `${label}: “${value.length > 140 ? value.slice(0, 140) + "…" : value}”` : `No ${label.toLowerCase()} found.`, weight),
    );
    items.push({ label, value: value ?? "— missing —", status: value ? "pass" : missingStatus });
  };
  add("Title tag", getTitle(html), 2);
  add("Meta description", getMeta(html, "description"), 2);
  add("Canonical URL", getCanonical(html), 1, "warn");
  add("Open Graph title", getMeta(html, "og:title", true));
  add("Open Graph description", getMeta(html, "og:description", true));
  add("Open Graph image", getMeta(html, "og:image", true), 1, "warn");
  add("Open Graph type", getMeta(html, "og:type", true), 1, "warn");
  const twitterCard = getMeta(html, "twitter:card");
  add("Twitter card", twitterCard, 1, "warn");
  const robotsMeta = getMeta(html, "robots");
  checks.push(
    mk(
      "Robots meta",
      robotsMeta && /noindex/i.test(robotsMeta) ? "fail" : "pass",
      robotsMeta ? `Robots meta: “${robotsMeta}”${/noindex/i.test(robotsMeta) ? " — noindex is set!" : ""}` : "Not set — page is indexable by default (good).",
    ),
  );
  items.push({ label: "Robots meta", value: robotsMeta ?? "not set (indexable)", status: robotsMeta && /noindex/i.test(robotsMeta) ? "fail" : "pass" });
  add("Viewport", getMeta(html, "viewport"));
  const charsetTag = allTags(html, "meta").find((t) => attr(t, "charset") !== null);
  const charset = charsetTag ? attr(charsetTag, "charset") : getMeta(html, "content-type");
  add("Charset", charset);
  add("Favicon", getFavicon(html), 1, "warn");
  const langTag = html.match(/<html\b[^>]*>/i)?.[0];
  const lang = langTag ? attr(langTag, "lang") : null;
  add("Language (html lang)", lang, 1, "warn");
  const fails = failCount(checks);
  return finish(
    "metatags",
    url,
    page,
    checks,
    fails === 0
      ? "All core meta tags are in place — the values below are exactly what search engines and social platforms read."
      : `${fails} core tag(s) missing. The table below shows every value this page actually serves.`,
    { items },
  );
}

/* ---------------- 6. robots.txt ---------------- */

async function analyzeRobots(url: string, page: FetchResult): Promise<SeoToolResult> {
  const origin = new URL(page.finalUrl).origin;
  const checks: WCheck[] = [];
  const res = await fetchSafeOrNull(origin + "/robots.txt", 512 * 1024);
  const exists = !!res && res.status === 200;
  checks.push(
    mk(
      "robots.txt exists",
      exists ? "pass" : "fail",
      exists ? `${origin}/robots.txt returns 200.` : `${origin}/robots.txt could not be fetched (status ${res?.status ?? "error"}) — crawlers will assume everything is allowed.`,
      3,
    ),
  );
  if (!exists || !res) {
    return finish("robots", url, page, checks, "No robots.txt found. Every crawler — including AI crawlers — is allowed by default.");
  }
  const parsed = parseRobotsFull(res.body);
  checks.push(
    mk("User-agent groups", parsed.groups.length > 0 ? "pass" : "warn", `${parsed.groups.length} user-agent group(s) defined: ${parsed.groups.map((g) => g.agents.join(", ")).join(" · ") || "none"}.`),
  );
  checks.push(
    mk(
      "Sitemap declared",
      parsed.sitemaps.length > 0 ? "pass" : "warn",
      parsed.sitemaps.length > 0 ? `Sitemap line(s): ${parsed.sitemaps.join(", ")}.` : "No Sitemap: line in robots.txt — add one so crawlers find your sitemap even if the URL changes.",
      2,
    ),
  );
  const starBlocked = robotsBlocks(parsed, "Googlebot", "/");
  checks.push(
    mk(
      "Homepage crawlable",
      starBlocked ? "fail" : "pass",
      starBlocked ? "The rules block / for general crawlers — the homepage itself is disallowed!" : "The homepage path / is not disallowed for general crawlers.",
      2,
    ),
  );
  for (const bot of AI_CRAWLERS) {
    const blockedRoot = robotsBlocks(parsed, bot, "/");
    const mentioned = parsed.groups.some((g) => g.agents.some((a) => a.toLowerCase() === bot.toLowerCase()));
    checks.push(
      mk(
        `${bot} access`,
        blockedRoot ? "warn" : "pass",
        blockedRoot
          ? `${bot} is fully blocked (Disallow: /)${mentioned ? "" : " via the * group"}.`
          : mentioned
            ? `${bot} has its own group and is not blocked from /.`
            : `${bot} is not mentioned — allowed by default under the general rules.`,
      ),
    );
  }
  const important = ["/blog", "/tools", "/services", "/products", "/shop"];
  const blockedImportant = important.filter((p) => robotsBlocks(parsed, "Googlebot", p + "/x"));
  checks.push(
    mk(
      "Important paths open",
      blockedImportant.length === 0 ? "pass" : "warn",
      blockedImportant.length === 0
        ? "Common content paths (/blog, /tools, /services…) are not disallowed."
        : `These common paths appear disallowed for general crawlers: ${blockedImportant.join(", ")}.`,
    ),
  );
  const items: SeoResultItem[] = parsed.groups.map((g) => ({
    label: `User-agent: ${g.agents.join(", ")}`,
    value: [
      ...g.disallow.map((d) => `Disallow: ${d || "(empty — allow all)"}`),
      ...g.allow.map((a) => `Allow: ${a}`),
    ].join(" · ") || "No rules",
  }));
  return finish(
    "robots",
    url,
    page,
    checks,
    `${parsed.groups.length} rule group(s) in robots.txt. AI crawlers: ${AI_CRAWLERS.map((b) => `${b} ${robotsBlocks(parsed, b, "/") ? "blocked" : "allowed"}`).join(", ")}.`,
    { items, rawText: res.body.slice(0, 4000) },
  );
}

/* ---------------- 7. AI readiness (BotView-lite) ---------------- */

async function analyzeAiReadiness(url: string, page: FetchResult): Promise<SeoToolResult> {
  const html = page.body;
  const origin = new URL(page.finalUrl).origin;
  const checks: WCheck[] = [];
  const [llmsRes, robotsRes] = await Promise.all([
    fetchSafeOrNull(origin + "/llms.txt", 256 * 1024),
    fetchSafeOrNull(origin + "/robots.txt", 256 * 1024),
  ]);
  const llmsOk = !!llmsRes && llmsRes.status === 200 && llmsRes.body.trim().length > 0;
  checks.push(
    mk(
      "llms.txt present",
      llmsOk ? "pass" : "fail",
      llmsOk ? `${origin}/llms.txt exists (${Math.round(llmsRes.body.length / 1024)} KB) — AI crawlers get a clean map of your key pages.` : `No llms.txt at ${origin}/llms.txt — AI engines have to guess your site structure.`,
      3,
    ),
  );
  if (llmsOk && llmsRes) {
    const links = (llmsRes.body.match(/https?:\/\//g) ?? []).length;
    checks.push(
      mk("llms.txt links to key pages", links >= 3 ? "pass" : "warn", `llms.txt contains ${links} link(s); at least 3 key-page links is a good baseline.`),
    );
  }
  const robotsText = robotsRes && robotsRes.status === 200 ? robotsRes.body : null;
  const parsed = robotsText ? parseRobotsFull(robotsText) : null;
  const blockedBots = parsed ? AI_CRAWLERS.filter((b) => robotsBlocks(parsed, b, "/")) : [];
  checks.push(
    mk(
      "AI crawlers allowed",
      !parsed ? "pass" : blockedBots.length === 0 ? "pass" : blockedBots.length < AI_CRAWLERS.length ? "warn" : "fail",
      !parsed
        ? "No robots.txt — AI crawlers are allowed by default."
        : blockedBots.length === 0
          ? "GPTBot, ClaudeBot, Google-Extended and PerplexityBot can all read this site."
          : `Blocked AI crawlers: ${blockedBots.join(", ")}. Blocked engines cannot cite you.`,
      3,
    ),
  );
  const schemaBlocks = html.match(/application\/ld\+json/i);
  checks.push(
    mk("Structured data for machines", schemaBlocks ? "pass" : "fail", schemaBlocks ? "JSON-LD structured data is present — AI engines parse facts from it directly." : "No JSON-LD found — AI engines must infer every fact from prose.", 2),
  );
  const text = visibleText(html);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  checks.push(
    mk(
      "Readable text in raw HTML",
      words >= 300 ? "pass" : words >= 100 ? "warn" : "fail",
      `${words.toLocaleString()} words are readable in the raw HTML without running JavaScript. Most AI crawlers do not execute JS — this is all they see.`,
      2,
    ),
  );
  const semantic = ["<article", "<main", "<header", "<nav", "<section"].filter((t) => html.toLowerCase().includes(t));
  checks.push(
    mk("Semantic HTML structure", semantic.length >= 3 ? "pass" : semantic.length > 0 ? "warn" : "fail", `Semantic landmarks found: ${semantic.map((s) => s.slice(1)).join(", ") || "none"}. Landmarks help machines segment and quote content.`),
  );
  const h1s = tagContents(html, "h1");
  const h2s = tagContents(html, "h2");
  checks.push(
    mk(
      "Clear headings to quote",
      h1s.length === 1 && h2s.length >= 2 ? "pass" : h2s.length > 0 ? "warn" : "fail",
      `1 H1 (${h1s.length} found) and ${h2s.length} H2 sections — question-shaped headings with short answers under them are what AI answers quote.`,
    ),
  );
  const ratio = html.length ? Math.round((text.length / html.length) * 100) : 0;
  checks.push(
    mk("Content extractability", ratio >= 10 ? "pass" : ratio >= 5 ? "warn" : "fail", `Readable text is ~${ratio}% of the HTML. Low ratios mean content is buried in markup or rendered client-side.`),
  );
  return finish(
    "ai-readiness",
    url,
    page,
    checks,
    llmsOk && blockedBots.length === 0
      ? "This site is well set up for AI search: llms.txt exists and no major AI crawler is blocked."
      : "AI search readiness has gaps — for the full 25+ check version, run BotView (linked below).",
  );
}

/* ---------------- 8. Image SEO ---------------- */

async function analyzeImages(url: string, page: FetchResult): Promise<SeoToolResult> {
  const images = collectImages(page.body, page.finalUrl);
  const checks: WCheck[] = [];
  checks.push(
    mk("Images found", images.length > 0 ? "pass" : "warn", `${images.length} <img> element(s) on the page.`, 2),
  );
  if (images.length === 0) {
    return finish("images", url, page, checks, "No images to audit on this page.");
  }
  const missingAlt = images.filter((i) => i.alt === null);
  const emptyAlt = images.filter((i) => i.alt !== null && i.alt.trim() === "");
  const withAlt = images.length - missingAlt.length - emptyAlt.length;
  checks.push(
    mk(
      "Alt text coverage",
      missingAlt.length === 0 ? "pass" : missingAlt.length <= Math.ceil(images.length * 0.25) ? "warn" : "fail",
      `${withAlt} images have descriptive alt text, ${emptyAlt.length} have empty alt (decorative), ${missingAlt.length} are missing the alt attribute entirely.`,
      3,
    ),
  );
  const noDims = images.filter((i) => !i.hasDims);
  checks.push(
    mk(
      "Width & height attributes",
      noDims.length === 0 ? "pass" : noDims.length <= images.length / 2 ? "warn" : "fail",
      `${images.length - noDims.length} of ${images.length} images declare width and height. Missing dimensions cause layout shift (CLS).`,
      2,
    ),
  );
  const lazy = images.filter((i) => i.lazy);
  checks.push(
    mk(
      "Lazy loading",
      lazy.length > 0 ? "pass" : "warn",
      `${lazy.length} of ${images.length} images use loading="lazy". Below-the-fold images should be lazy; the hero image should not.`,
    ),
  );
  const modern = images.filter((i) => i.format === "webp" || i.format === "avif");
  checks.push(
    mk(
      "Modern formats (WebP/AVIF)",
      modern.length === images.length ? "pass" : modern.length > 0 ? "warn" : "fail",
      `${modern.length} of ${images.length} images use WebP or AVIF. Legacy JPEG/PNG files are typically 25–50% heavier.`,
    ),
  );
  const items: SeoResultItem[] = images.slice(0, 50).map((i) => ({
    label: i.src.length > 90 ? i.src.slice(0, 90) + "…" : i.src,
    value: `alt: ${i.alt === null ? "MISSING" : i.alt.trim() === "" ? "(empty)" : `“${i.alt.slice(0, 60)}”`} · ${i.format} · ${i.lazy ? "lazy" : "eager"} · ${i.hasDims ? "dimensions set" : "no dimensions"}`,
    status: i.alt === null ? "fail" : i.alt.trim() === "" ? "warn" : "pass",
  }));
  return finish(
    "images",
    url,
    page,
    checks,
    `${images.length} images audited: ${missingAlt.length} missing alt, ${noDims.length} without dimensions, ${modern.length} in modern formats.`,
    { items },
  );
}

/* ---------------- link collection with anchors ---------------- */

export interface LinkInfo {
  href: string;
  anchor: string;
  rel: string;
  internal: boolean;
  domain: string;
}

export function collectLinks(html: string, finalUrl: string): LinkInfo[] {
  const out: LinkInfo[] = [];
  const origin = new URL(finalUrl).origin;
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = `<a${m[1]}>`;
    const href = attr(tag, "href");
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) continue;
    let u: URL;
    try {
      u = new URL(href, finalUrl);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol)) continue;
    out.push({
      href: u.toString(),
      anchor: stripTags(m[2]) || "(no anchor text)",
      rel: (attr(tag, "rel") ?? "").toLowerCase(),
      internal: u.origin === origin,
      domain: u.hostname.replace(/^www\./, ""),
    });
  }
  return out;
}

/* ---------------- 9. Local SEO ---------------- */

async function analyzeLocal(url: string, page: FetchResult): Promise<SeoToolResult> {
  const html = page.body;
  const checks: WCheck[] = [];
  const items: SeoResultItem[] = [];
  // Schema types on the page.
  const types = new Set<string>();
  for (const block of html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    for (const m of block.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(m[1]);
  }
  const localTypes = [...types].filter((t) => /LocalBusiness|Store|Restaurant|Dentist|Attorney|Plumber|Electrician|HVAC|ProfessionalService|MedicalBusiness|AutoRepair/i.test(t));
  checks.push(
    mk(
      "LocalBusiness schema",
      localTypes.length > 0 ? "pass" : types.has("Organization") ? "warn" : "fail",
      localTypes.length > 0
        ? `Local schema found: ${localTypes.join(", ")}.`
        : types.has("Organization")
          ? "Organization schema exists but no LocalBusiness subtype — local searches get weaker signals."
          : "No LocalBusiness or Organization schema found. Local businesses should declare who and where they are in JSON-LD.",
      3,
    ),
  );
  if (localTypes.length > 0 || types.size > 0) {
    items.push({ label: "Schema types", value: [...types].join(", ") || "none", status: localTypes.length > 0 ? "pass" : "warn" });
  }
  const text = visibleText(html);
  const phone = text.match(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0];
  checks.push(
    mk("Phone number on page", phone ? "pass" : "fail", phone ? `Phone number found in page text: ${phone}.` : "No phone number pattern found in the page text — local customers need a tap-to-call number.", 2),
  );
  if (phone) items.push({ label: "Phone", value: phone, status: "pass" });
  const street = text.match(/\b\d{1,6}\s+[A-Z][A-Za-z0-9.' ]{2,40}?\b(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Suite|Ste|Highway|Hwy|Court|Ct|Parkway|Pkwy)\b\.?/i)?.[0];
  const zip = text.match(/\b\d{5}(-\d{4})?\b/)?.[0];
  checks.push(
    mk(
      "Address signals",
      street && zip ? "pass" : street || zip ? "warn" : "fail",
      street && zip
        ? `Street address and ZIP found: “${street}”, ${zip}. Consistent NAP (name, address, phone) is a core local ranking factor.`
        : "Full street address + ZIP not found in the page text. Add the exact address you use on your Google Business Profile.",
      2,
    ),
  );
  if (street) items.push({ label: "Address", value: street + (zip ? `, ${zip}` : ""), status: "pass" });
  const mapsLink =
    /href\s*=\s*["'][^"']*(google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(html) ||
    /<iframe[^>]*src\s*=\s*["'][^"']*google\.com\/maps\/embed/i.test(html);
  checks.push(
    mk("Google Maps link or embed", mapsLink ? "pass" : "warn", mapsLink ? "The page links to or embeds Google Maps — visitors can get directions in one tap." : "No Google Maps link or embedded map found. A directions link is one of the highest-converting elements on a local page."),
  );
  const hoursInSchema = /"openingHours/i.test(html);
  const hoursInText = /(open(ing)?\s*hours|mon(day)?\s*[–-]\s*fri|9\s*(am|a\.m\.)\s*[–-]\s*5\s*(pm|p\.m\.))/i.test(text);
  checks.push(
    mk(
      "Opening hours",
      hoursInSchema ? "pass" : hoursInText ? "warn" : "fail",
      hoursInSchema
        ? "Opening hours are declared in structured data (openingHours)."
        : hoursInText
          ? "Opening hours appear in the text but not in schema — add openingHours to your LocalBusiness JSON-LD."
          : "No opening hours found in schema or text. 'Open now' searches can't match this page.",
    ),
  );
  const hasRating = /"aggregateRating"/i.test(html);
  checks.push(
    mk(
      "Review / rating schema",
      hasRating ? "pass" : "warn",
      hasRating
        ? "AggregateRating schema is present — star ratings can appear in search results. (Only use it with genuine, on-page reviews.)"
        : "No AggregateRating schema. Genuine review stars in results lift local click-through noticeably.",
    ),
  );
  return finish(
    "local",
    url,
    page,
    checks,
    localTypes.length > 0 && phone
      ? "Core local signals are present: local schema, phone and address details search engines can match against your Google Business Profile."
      : "Local signals are incomplete — schema, NAP details and a Maps link are the foundations of ranking in the map pack.",
    { items },
  );
}

/* ---------------- 10. Backlink checker (outgoing profile, v1) ---------------- */

async function analyzeBacklinks(url: string, page: FetchResult): Promise<SeoToolResult> {
  const links = collectLinks(page.body, page.finalUrl);
  const external = links.filter((l) => !l.internal);
  const checks: WCheck[] = [];
  checks.push(
    mk("Outgoing external links", external.length > 0 ? "pass" : "warn", `${external.length} links on this page point to other websites. This tool audits the links you GIVE — see the note below about links you receive.`, 2),
  );
  const domains = new Map<string, number>();
  for (const l of external) domains.set(l.domain, (domains.get(l.domain) ?? 0) + 1);
  checks.push(
    mk("Unique external domains", domains.size > 0 ? "pass" : "warn", `Links point to ${domains.size} unique domain(s): ${[...domains.keys()].slice(0, 8).join(", ")}${domains.size > 8 ? "…" : ""}.`),
  );
  const nofollow = external.filter((l) => /nofollow|sponsored|ugc/.test(l.rel));
  const nfRatio = external.length ? Math.round((nofollow.length / external.length) * 100) : 0;
  checks.push(
    mk(
      "Follow vs nofollow",
      external.length === 0 ? "warn" : nfRatio <= 50 ? "pass" : "warn",
      `${external.length - nofollow.length} followed, ${nofollow.length} with rel="nofollow/sponsored/ugc" (${nfRatio}%). Paid and untrusted links should be nofollow/sponsored; editorial citations should usually be followed.`,
    ),
  );
  const emptyAnchors = external.filter((l) => l.anchor === "(no anchor text)");
  checks.push(
    mk(
      "Anchor text quality",
      emptyAnchors.length === 0 ? "pass" : "warn",
      emptyAnchors.length === 0
        ? "Every external link has readable anchor text."
        : `${emptyAnchors.length} external link(s) have no anchor text (image links without alt, or icon links) — they pass less context to the target page.`,
    ),
  );
  const httpLinks = external.filter((l) => l.href.startsWith("http://"));
  checks.push(
    mk("Links to insecure (http) pages", httpLinks.length === 0 ? "pass" : "warn", httpLinks.length === 0 ? "No outgoing links to plain-http pages." : `${httpLinks.length} external link(s) still point to http:// URLs — update them to https where the target supports it.`),
  );
  const items: SeoResultItem[] = external.slice(0, 60).map((l) => ({
    label: l.domain,
    value: `“${l.anchor.slice(0, 60)}” → ${l.href.length > 80 ? l.href.slice(0, 80) + "…" : l.href}${/nofollow|sponsored|ugc/.test(l.rel) ? ` · rel="${l.rel}"` : " · followed"}`,
    status: /nofollow|sponsored|ugc/.test(l.rel) ? "warn" : "pass",
  }));
  return finish(
    "backlinks",
    url,
    page,
    checks,
    `Outgoing profile: ${external.length} external links to ${domains.size} domains. NOTE: this audits links FROM this page. Links pointing TO your site (referring domains) live in paid link indexes (Ahrefs/Moz) — no free tool can count them honestly, so we don't fake a number.`,
    { items },
  );
}

/* ---------------- 11. Internal link checker ---------------- */

async function analyzeInternal(url: string, page: FetchResult): Promise<SeoToolResult> {
  const links = collectLinks(page.body, page.finalUrl);
  const internal = links.filter((l) => l.internal);
  const checks: WCheck[] = [];
  checks.push(
    mk("Internal links found", internal.length >= 3 ? "pass" : internal.length > 0 ? "warn" : "fail", `${internal.length} internal links on this page.`, 2),
  );
  const targets = new Map<string, number>();
  for (const l of internal) {
    const clean = l.href.split("#")[0];
    targets.set(clean, (targets.get(clean) ?? 0) + 1);
  }
  checks.push(
    mk("Unique internal targets", targets.size >= 3 ? "pass" : targets.size > 0 ? "warn" : "fail", `Links point to ${targets.size} unique page(s) on this site. A healthy page spreads equity across several relevant targets.`),
  );
  const selfLinks = internal.filter((l) => l.href.split("#")[0] === page.finalUrl.split("#")[0]);
  checks.push(
    mk("Self-links", selfLinks.length === 0 ? "pass" : "warn", selfLinks.length === 0 ? "The page does not link to itself (outside nav conventions)." : `${selfLinks.length} link(s) point back to this same URL — usually nav/logo links; body self-links waste anchor opportunities.`),
  );
  const anchors = new Map<string, number>();
  for (const l of internal) anchors.set(l.anchor.toLowerCase(), (anchors.get(l.anchor.toLowerCase()) ?? 0) + 1);
  const generic = [...anchors.entries()].filter(([a]) => ["click here", "here", "read more", "learn more", "more", "link"].includes(a));
  const genericCount = generic.reduce((s, [, n]) => s + n, 0);
  checks.push(
    mk(
      "Anchor diversity",
      genericCount === 0 ? "pass" : "warn",
      `${anchors.size} unique anchor text(s) across internal links.${genericCount ? ` ${genericCount} use generic text ("click here", "read more") — descriptive anchors tell Google what the target page is about.` : " No generic 'click here' anchors."}`,
    ),
  );
  // Spot-check up to 10 unique internal targets.
  const sample = [...targets.keys()].slice(0, 10);
  const results = await Promise.all(
    sample.map(async (u) => {
      const r = await fetchSafeOrNull(u, 32 * 1024);
      return { u, status: r ? r.status : 0 };
    }),
  );
  const broken = results.filter((r) => r.status === 0 || r.status >= 400);
  checks.push(
    mk(
      "Broken internal links (spot check)",
      broken.length === 0 ? "pass" : "fail",
      broken.length === 0
        ? `All ${results.length} spot-checked internal targets respond with a success/redirect status.`
        : `${broken.length} of ${results.length} spot-checked internal targets are broken: ${broken.map((b) => `${b.u} (${b.status || "unreachable"})`).join("; ")}.`,
      2,
    ),
  );
  const items: SeoResultItem[] = [...targets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([href, count]) => {
      const sampleRes = results.find((r) => r.u === href);
      const anchorsFor = internal.filter((l) => l.href.split("#")[0] === href).map((l) => l.anchor);
      return {
        label: href,
        value: `${count} link(s) · anchors: ${[...new Set(anchorsFor)].slice(0, 3).join(" / ")}${sampleRes ? ` · HTTP ${sampleRes.status || "error"}` : ""}`,
        status: sampleRes && (sampleRes.status === 0 || sampleRes.status >= 400) ? "fail" : "pass",
      };
    });
  return finish(
    "internal",
    url,
    page,
    checks,
    `${internal.length} internal links to ${targets.size} unique targets; ${broken.length} broken in the spot check.`,
    { items },
  );
}

/* ---------------- 12. Competitor comparison ---------------- */

interface PageProfile {
  label: string;
  finalUrl: string;
  status: number;
  ms: number;
  title: string | null;
  titleLen: number;
  descLen: number;
  words: number;
  h1: number;
  h2: number;
  schemaTypes: string[];
  internal: number;
  external: number;
  images: number;
  missingAlt: number;
  htmlKb: number;
  score: number;
}

function profileScore(p: Omit<PageProfile, "score" | "label">): number {
  let s = 0;
  if (p.status === 200) s += 20;
  if (p.titleLen >= 30 && p.titleLen <= 60) s += 15;
  else if (p.title) s += 7;
  if (p.descLen >= 120 && p.descLen <= 160) s += 15;
  else if (p.descLen > 0) s += 7;
  if (p.words >= 600) s += 20;
  else if (p.words >= 300) s += 12;
  else if (p.words >= 100) s += 5;
  if (p.h1 === 1) s += 10;
  if (p.schemaTypes.length > 0) s += 10;
  if (p.ms < 1000) s += 10;
  else if (p.ms < 2500) s += 5;
  return s;
}

function buildProfile(label: string, page: FetchResult): PageProfile {
  const html = page.body;
  const title = getTitle(html);
  const desc = getMeta(html, "description");
  const text = visibleText(html);
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const types = new Set<string>();
  for (const block of html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? []) {
    for (const m of block.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(m[1]);
  }
  const links = countLinks(html, page.finalUrl);
  const images = collectImages(html, page.finalUrl);
  const base = {
    finalUrl: page.finalUrl,
    status: page.status,
    ms: page.ms,
    title,
    titleLen: title?.length ?? 0,
    descLen: desc?.length ?? 0,
    words,
    h1: tagContents(html, "h1").length,
    h2: tagContents(html, "h2").length,
    schemaTypes: [...types].sort(),
    internal: links.internal,
    external: links.external,
    images: images.length,
    missingAlt: images.filter((i) => i.alt === null || i.alt.trim() === "").length,
    htmlKb: Math.round(html.length / 1024),
  };
  return { label, ...base, score: profileScore(base) };
}

async function analyzeCompetitor(url: string, page: FetchResult, url2: string): Promise<SeoToolResult> {
  const target2 = normalizeUrl(url2);
  if (!target2) {
    return { tool: "competitor", url, finalUrl: page.finalUrl, fetchedAt: new Date().toISOString(), score: 0, checks: [], summary: "", error: "The competitor URL doesn't look valid. Enter both URLs in full." };
  }
  let page2: FetchResult;
  try {
    page2 = await fetchSafe(target2);
  } catch (e) {
    return { tool: "competitor", url, finalUrl: page.finalUrl, fetchedAt: new Date().toISOString(), score: 0, checks: [], summary: "", error: e instanceof SeoFetchError ? e.message : "Could not fetch the competitor URL." };
  }
  const a = buildProfile("Your page", page);
  const b = buildProfile("Competitor", page2);
  const cmp = (label: string, av: number, bv: number, higherBetter = true, fmt: (n: number) => string = (n) => String(n)): WCheck => {
    const win = higherBetter ? av > bv : av < bv;
    const tie = av === bv;
    return mk(
      label,
      tie ? "pass" : win ? "pass" : Math.abs(av - bv) <= Math.max(1, Math.round(Math.max(av, bv) * 0.25)) ? "warn" : "fail",
      `You: ${fmt(av)} · Competitor: ${fmt(bv)}${tie ? " — tied." : win ? " — you're ahead." : " — competitor is ahead."}`,
    );
  };
  const checks: WCheck[] = [
    mk("Overall score", a.score >= b.score ? "pass" : "warn", `Your page scores ${a.score}/100 vs the competitor's ${b.score}/100 on the same on-page rubric.`, 3),
    cmp("Response time", a.ms, b.ms, false, (n) => `${n.toLocaleString()} ms`),
    cmp("Word count", a.words, b.words, true, (n) => n.toLocaleString()),
    cmp("Title length", a.titleLen, b.titleLen, true),
    mk("Meta description", a.descLen > 0 && b.descLen === 0 ? "pass" : a.descLen === 0 ? "fail" : "pass", `You: ${a.descLen} chars · Competitor: ${b.descLen} chars.`),
    mk("H1 headings", a.h1 === 1 ? "pass" : "warn", `You: ${a.h1} H1 · Competitor: ${b.h1} H1 (exactly one each is ideal).`),
    cmp("H2 sections", a.h2, b.h2),
    cmp("Schema types", a.schemaTypes.length, b.schemaTypes.length),
    cmp("Internal links", a.internal, b.internal),
    cmp("Images", a.images, b.images),
    mk("Images missing alt", a.missingAlt <= b.missingAlt ? "pass" : "warn", `You: ${a.missingAlt} missing alt · Competitor: ${b.missingAlt}.`),
  ];
  const items: SeoResultItem[] = [
    { label: "Title", value: `You: “${a.title ?? "—"}” · Competitor: “${b.title ?? "—"}”` },
    { label: "Schema types", value: `You: ${a.schemaTypes.join(", ") || "none"} · Competitor: ${b.schemaTypes.join(", ") || "none"}` },
    { label: "Final URLs", value: `You: ${a.finalUrl} · Competitor: ${b.finalUrl}` },
  ];
  const result = finish(
    "competitor",
    url,
    page,
    checks,
    a.score >= b.score
      ? `Your page edges this comparison ${a.score} vs ${b.score}. Defend the lead: keep the content deeper and the schema richer than theirs.`
      : `The competitor leads ${b.score} vs ${a.score}. The rows above show exactly where: work down the red rows first.`,
    { items },
  );
  result.score = a.score; // headline score = your page's rubric score, matching the table
  result.compare = {
    aLabel: `Your page (${a.score}/100)`,
    bLabel: `Competitor (${b.score}/100)`,
    scoreA: a.score,
    scoreB: b.score,
    rows: [
      { label: "Response time", a: `${a.ms.toLocaleString()} ms`, b: `${b.ms.toLocaleString()} ms` },
      { label: "Title length", a: `${a.titleLen} chars`, b: `${b.titleLen} chars` },
      { label: "Meta description", a: `${a.descLen} chars`, b: `${b.descLen} chars` },
      { label: "Word count", a: a.words.toLocaleString(), b: b.words.toLocaleString() },
      { label: "H1 / H2 headings", a: `${a.h1} / ${a.h2}`, b: `${b.h1} / ${b.h2}` },
      { label: "Schema types", a: String(a.schemaTypes.length), b: String(b.schemaTypes.length) },
      { label: "Internal / external links", a: `${a.internal} / ${a.external}`, b: `${b.internal} / ${b.external}` },
      { label: "Images (missing alt)", a: `${a.images} (${a.missingAlt})`, b: `${b.images} (${b.missingAlt})` },
      { label: "HTML size", a: `${a.htmlKb} KB`, b: `${b.htmlKb} KB` },
    ],
  };
  return result;
}

/* ---------------- 13. Content brief generator ---------------- */

async function analyzeBrief(keywordRaw: string, page: FetchResult | null, url: string): Promise<SeoToolResult> {
  const keyword = keywordRaw.trim();
  const kw = keyword.toLowerCase();
  const cap = keyword.charAt(0).toUpperCase() + keyword.slice(1);
  const outline = [
    `${cap}: what it is and why it matters`,
    `How ${keyword} works (step by step)`,
    `Benefits of ${keyword} — who it is for`,
    `${cap}: costs, pricing and what affects them`,
    `Common ${keyword} mistakes to avoid`,
    `How to choose the right ${keyword} option`,
    `${cap} checklist before you start`,
    `Frequently asked questions about ${keyword}`,
  ];
  const questions = [
    `What is ${keyword}?`,
    `How much does ${keyword} cost?`,
    `How long does ${keyword} take?`,
    `What are the benefits of ${keyword}?`,
    `What mistakes should I avoid with ${keyword}?`,
    `How do I choose the best ${keyword}?`,
  ];
  const checks: WCheck[] = [];
  let currentWords = 0;
  if (page) {
    const html = page.body;
    const title = (getTitle(html) ?? "").toLowerCase();
    const h1s = tagContents(html, "h1").map((h) => h.toLowerCase());
    const h2s = tagContents(html, "h2").map((h) => h.toLowerCase());
    const text = visibleText(html);
    currentWords = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const occurrences = kw ? (text.toLowerCase().split(kw).length - 1) : 0;
    const density = currentWords ? ((occurrences / currentWords) * 100).toFixed(2) : "0";
    checks.push(mk("Keyword in title", title.includes(kw) ? "pass" : "fail", title.includes(kw) ? `The title contains “${keyword}”.` : `The title does not contain “${keyword}” — rewrite it around the keyword.`, 2));
    checks.push(mk("Keyword in H1", h1s.some((h) => h.includes(kw)) ? "pass" : "fail", h1s.some((h) => h.includes(kw)) ? "The H1 contains the keyword." : `No H1 contains “${keyword}” (H1s found: ${h1s.length}).`, 2));
    checks.push(mk("Keyword in H2s", h2s.some((h) => h.includes(kw)) ? "pass" : "warn", h2s.some((h) => h.includes(kw)) ? "At least one H2 contains the keyword or a close variant." : "No H2 mentions the keyword — weave it into 2–3 section headings naturally."));
    checks.push(
      mk("Keyword density", occurrences > 0 && Number(density) <= 2.5 ? "pass" : occurrences === 0 ? "fail" : "warn", `“${keyword}” appears ${occurrences} time(s) in ${currentWords.toLocaleString()} words (${density}% density). 0.5–2% is a natural range; never stuff.`),
    );
    checks.push(
      mk("Current word count", currentWords >= 1500 ? "pass" : currentWords >= 800 ? "warn" : "fail", `The page currently has ${currentWords.toLocaleString()} words. The brief below targets beating that by a clear margin.`, 2),
    );
  } else {
    checks.push(mk("Mode", "warn", "Template brief — no URL was provided, so this is a from-scratch brief. Add your page URL to get a gap analysis against your current content."));
  }
  const targetWords = page ? Math.max(1500, Math.round(currentWords * 1.3)) : 1800;
  const items: SeoResultItem[] = [
    { label: "Target keyword", value: keyword },
    { label: "Recommended title", value: `${cap}: The Complete Guide (2026)` },
    { label: "Recommended H1", value: cap },
    { label: "Target word count", value: `${targetWords.toLocaleString()}+ words (deeper than the typical competing page)` },
    ...outline.map((h, i) => ({ label: `H2 #${i + 1}`, value: h })),
    ...questions.map((q, i) => ({ label: `Question to answer #${i + 1}`, value: q })),
    { label: "Schema to add", value: "Article + FAQPage (use the questions above) + BreadcrumbList" },
    { label: "Internal links", value: "Link in from 3–5 related pages with descriptive anchors; link out to your service/tool page" },
    { label: "Media", value: "3+ original images or screenshots with keyword-aware alt text; one comparison table" },
  ];
  const base: SeoToolResult = {
    tool: "brief",
    url: url || keyword,
    finalUrl: page ? page.finalUrl : "",
    fetchedAt: new Date().toISOString(),
    score: 0,
    checks: [],
    summary: page
      ? `Brief for “${keyword}” built from your live page (${currentWords.toLocaleString()} words today). Target: ${targetWords.toLocaleString()}+ words with the outline below.`
      : `Template brief for “${keyword}”: ${targetWords.toLocaleString()}+ words, the H2 outline and the questions below.`,
    items,
  };
  const max = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) => s + c.weight * c.earned, 0);
  base.score = max ? Math.round((got / max) * 100) : 70;
  base.checks = checks.map(({ label, status, detail }) => ({ label, status, detail }));
  return base;
}

/* ---------------- dispatcher ---------------- */

export interface SeoCheckInput {
  url?: string;
  url2?: string;
  keyword?: string;
}

function baseResult(tool: SeoToolId, url: string): SeoToolResult {
  return { tool, url, finalUrl: url, fetchedAt: new Date().toISOString(), score: 0, checks: [], summary: "" };
}

export async function runSeoCheck(tool: SeoToolId, input: SeoCheckInput): Promise<SeoToolResult> {
  // Content brief: keyword-driven, URL optional.
  if (tool === "brief") {
    const keyword = (input.keyword ?? "").trim();
    if (!keyword) {
      return { ...baseResult(tool, ""), error: "Enter a keyword to build a brief for." };
    }
    let page: FetchResult | null = null;
    const rawUrl = (input.url ?? "").trim();
    if (rawUrl) {
      const target = normalizeUrl(rawUrl);
      if (!target) return { ...baseResult(tool, rawUrl), error: "That URL doesn't look valid — check it and try again." };
      try {
        page = await fetchSafe(target);
      } catch (e) {
        return { ...baseResult(tool, target), error: e instanceof SeoFetchError ? e.message : "Could not fetch that URL." };
      }
      if (page.status >= 400) {
        return { ...baseResult(tool, target), error: `That URL returned HTTP ${page.status} — a brief needs a live page to analyse.` };
      }
    }
    return analyzeBrief(keyword, page, rawUrl);
  }

  const rawUrl = (input.url ?? "").trim();
  const target = normalizeUrl(rawUrl);
  if (!target) {
    return { ...baseResult(tool, rawUrl), error: "That doesn't look like a valid URL. Try something like https://example.com" };
  }
  let page: FetchResult;
  try {
    page = await fetchSafe(target);
  } catch (e) {
    return { ...baseResult(tool, target), error: e instanceof SeoFetchError ? e.message : "Could not fetch that URL." };
  }
  if (page.status >= 400 && tool !== "technical") {
    return { ...baseResult(tool, target), error: `That URL returned HTTP ${page.status}. This checker needs a live page — fix the URL or the page first.` };
  }
  switch (tool) {
    case "technical":
      return analyzeTechnical(rawUrl, page);
    case "schema":
      return analyzeSchema(rawUrl, page);
    case "sitemap":
      return analyzeSitemap(rawUrl, page);
    case "onpage":
      return analyzeOnPage(rawUrl, page);
    case "metatags":
      return analyzeMetaTags(rawUrl, page);
    case "robots":
      return analyzeRobots(rawUrl, page);
    case "ai-readiness":
      return analyzeAiReadiness(rawUrl, page);
    case "images":
      return analyzeImages(rawUrl, page);
    case "local":
      return analyzeLocal(rawUrl, page);
    case "backlinks":
      return analyzeBacklinks(rawUrl, page);
    case "internal":
      return analyzeInternal(rawUrl, page);
    case "competitor":
      return analyzeCompetitor(rawUrl, page, (input.url2 ?? "").trim());
    default:
      return { ...baseResult(tool, target), error: "Unknown tool." };
  }
}
