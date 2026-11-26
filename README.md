# SEO Agent Tools

**14 AI SEO agents + free clickable SEO checker tools** — the open-source toolkit behind [frinjo.me/seo](https://frinjo.me/seo).

Instead of one generic "SEO score", SEO Agent Tools splits the work the way a
real SEO team does: one orchestrator agent runs the audit and dispatches 14
specialist agents, each with a narrow job, a concrete checklist and a fixed
output format. Every finding must be backed by evidence actually fetched in
that run — no guessed metrics, no invented figures.

**Try the tools live:** [frinjo.me/seo](https://frinjo.me/seo) — paste a URL,
get a report. No sign-up.

## The 14 tools

| # | Tool | What it does | Live tool |
|---|------|--------------|-----------|
| 1 | Technical SEO Checker | Crawlability, status codes, canonicals, HTTPS and indexability checks for any URL | [Open](https://frinjo.me/technical-seo-checker) |
| 2 | Schema Checker | Detects and validates JSON-LD structured data against each type's required properties | [Open](https://frinjo.me/schema-checker) |
| 3 | Sitemap Checker | Validates sitemap XML, URL coverage, status codes and lastmod freshness | [Open](https://frinjo.me/sitemap-checker) |
| 4 | On-Page SEO Checker | Titles, meta descriptions, heading structure and keyword placement, page by page | [Open](https://frinjo.me/on-page-seo-checker) |
| 5 | Meta Tag Checker | Audits title, description, Open Graph, Twitter cards and robots meta tags | [Open](https://frinjo.me/meta-tag-checker) |
| 6 | Robots.txt Checker | Reviews robots.txt rules, the sitemap declaration and AI-crawler access | [Open](https://frinjo.me/robots-txt-checker) |
| 7 | AI Readiness Checker | GEO checks: llms.txt, AI crawler access, entity clarity and how citable your pages are | [Open](https://frinjo.me/ai-readiness-checker) |
| 8 | Image SEO Checker | Alt text, file weight, modern formats and dimension attributes across your pages | [Open](https://frinjo.me/image-seo-checker) |
| 9 | Local SEO Checker | NAP consistency, local business schema and location-page quality | [Open](https://frinjo.me/local-seo-checker) |
| 10 | Backlink Checker | Referring domains, anchor-text mix and toxic-link patterns | [Open](https://frinjo.me/backlink-checker) |
| 11 | Competitor Checker | Compares your pages against the pages actually outranking you | [Open](https://frinjo.me/competitor-checker) |
| 12 | Internal Link Checker | Finds orphan pages, thin link profiles and broken internal links | [Open](https://frinjo.me/internal-link-checker) |
| 13 | Content Brief Generator | Turns a winning keyword into a ready-to-write content brief | [Open](https://frinjo.me/content-brief-generator) |
| 14 | Keyword Traffic Checker | Keyword demand and live ranking-signal checks before you commit to a topic | [Open](https://frinjo.me/keyword-traffic-checker) |

## How the agent suite works

```
                ┌─────────────────────────┐
                │   SEO Audit Agent        │  orchestrator
                │   scope → fetch → score  │
                └────────────┬────────────┘
                             │ dispatches
   ┌──────────┬──────────┬───┴────┬──────────┬──────────┬─────────┐
   ▼          ▼          ▼        ▼          ▼          ▼         ▼
Technical  Content    Schema   Sitemap   Performance  AI Search  Local
Backlinks  On-Page    Images   Keywords  Competitor   Internal   Brief
```

1. **Scope** — confirm the domain and build the page inventory from the sitemap.
2. **Baseline fetch** — homepage, robots.txt, sitemap and representative pages,
   with status codes, redirect chains and response times recorded.
3. **Dispatch** — each specialist agent runs its checklist (see
   [`agents/SKILL.md`](agents/SKILL.md)) and returns findings in a shared
   format: severity, evidence, fix.
4. **Verify** — a problem is only reported if this run's fetches prove it.
5. **Score & prioritize** — findings merge into one SEO Health Score and a
   phased action plan (Week 1 critical → Weeks 2–3 high impact → Month 2
   content & authority → ongoing monitoring).

### Scoring weights

| Category | Weight |
|---|---|
| Technical SEO | 22% |
| Content Quality | 23% |
| On-Page SEO | 20% |
| Schema / Structured Data | 10% |
| Performance (Core Web Vitals) | 10% |
| AI Search Readiness | 10% |
| Images | 5% |

Severity scale: **Critical** (blocks indexing — fix now) · **High** (suppresses
rankings — fix within a week) · **Medium** (fix within a month) · **Low**
(backlog polish).

## Repository contents

- [`agents/SKILL.md`](agents/SKILL.md) — the complete agent suite: the
  orchestrator workflow plus all 14 specialist playbooks with their full
  checklists. Drop it into your own AI assistant setup and run audits with it.
- [`tools/`](tools/) — the source code of the 13 checker tools that run live
  on Frinjo (see **Source code** below).

## Source code

The [`tools/`](tools/) folder holds the **exact source code of the 13 checker
tools running live on [frinjo.me/seo](https://frinjo.me/seo)** — not a rewrite
or a sample. (The 14th tool, Keyword Traffic Checker, predates this suite and
lives in the main Frinjo codebase.) The folder mirrors the Next.js app layout
the code was taken from:

```
tools/
└── src/
    ├── lib/
    │   └── seo-tools.ts            — all 13 analyzers in one module: fetch,
    │                                 parse, run the checks, score the result
    ├── app/
    │   ├── api/
    │   │   └── seo-check/route.ts  — the single API route every tool page
    │   │                             calls (GET ?url=<target>&tool=<id>)
    │   └── <tool-slug>/page.tsx    — one page per tool, 13 in total:
    │       technical-seo-checker/      schema-checker/
    │       sitemap-checker/            on-page-seo-checker/
    │       meta-tag-checker/           robots-txt-checker/
    │       ai-readiness-checker/       image-seo-checker/
    │       local-seo-checker/          backlink-checker/
    │       competitor-checker/         internal-link-checker/
    │       content-brief-generator/
    └── components/
        └── SeoToolRunner.tsx       — the shared client component: URL form,
                                      run state, and the scored results list
```

How a check runs end to end: a tool page renders `SeoToolRunner` with its tool
id; the runner calls `/api/seo-check`, which hands the target URL to the
matching analyzer in `seo-tools.ts`. The analyzer fetches the page itself
(server-side, with SSRF guards and a response-size cap), runs its checklist
against the real HTML/headers, and returns pass/warn/fail findings plus a
0–100 score — the same findings format the agent suite uses.

To reuse it, lift `tools/src/` into any Next.js App Router project: the only
runtime dependencies are Next.js itself and the shared UI primitives the
pages import.

## Built by

[Muhamad Raza Haider](https://github.com/rootsiemen) — WebStore Pro
([frinjo.me](https://frinjo.me)). Full-stack web development: Next.js, React,
PostgreSQL.

## License

[MIT](LICENSE) — free to use, modify and share with attribution.
