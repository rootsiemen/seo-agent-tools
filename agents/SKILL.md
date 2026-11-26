---
name: seo_agents
description: "The user's own SEO agent suite: an SEO Audit orchestrator plus 14 specialist agents (technical, content/E-E-A-T, schema, sitemap & indexing, performance, AI search/GEO, local, backlinks, on-page, images, keyword research, competitor analysis, internal linking, content brief). Use for full-site SEO audits, single-area SEO checks, keyword research, and content planning on the user's sites (frinjo.me, usaattorneys.company, igaf.me) or client sites."
---

# SEO Agents — The User's Own SEO Audit Suite

A team of specialist agents coordinated by one orchestrator. Each agent has a
narrow job, a concrete checklist, and a fixed output format so findings from
different agents merge cleanly into one report. Everything runs with the
assistant's own tools: `curl` for fetches and headers, the browser for rendered
checks and live SERP verification, the Google Indexing API tooling in
`~/workspace/seo-tools/google-indexing/`, and GSC data where available.

## The Orchestrator — SEO Audit Agent

Runs a full-site audit end to end:

1. **Scope the target.** Confirm the domain, the production host (for
   usaattorneys.company use the workers.dev mirror for fetches — the apex
   blocks datacenter IPs; canonical URLs still point at the apex), and the
   page inventory from `sitemap.xml`.
2. **Baseline fetch.** Pull the homepage, robots.txt, sitemap.xml and 5–10
   representative pages (a hub page, a detail/listing page, a blog post, a
   tool page). Record status codes, redirect chains, response times and
   headers.
3. **Dispatch the specialists.** Run every relevant specialist agent below
   (skip Local SEO for non-local sites, skip Backlinks if no data source is
   available — say so rather than guessing). Specialists can run as parallel
   subagents; each returns findings in the shared format.
4. **Verify before reporting.** Every claim in the final report must be backed
   by something actually fetched or queried in this run — a status code, a
   header, an HTML snippet, a GSC figure. Never report a problem that was not
   observed.
5. **Score and prioritize.** Compute the SEO Health Score with the weights
   below, group findings by severity, and end with a phased action plan.

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

### Severity definitions

- **Critical** — blocks indexing, breaks pages, or risks a penalty. Fix now.
- **High** — measurably suppresses rankings or clicks. Fix within a week.
- **Medium** — a real optimization opportunity. Fix within a month.
- **Low** — polish. Backlog.

### Output format (every agent, every audit)

```markdown
## <Agent name> — Score: NN/100
### What is working
- ...
### Findings
| # | Severity | Finding | Evidence | Fix |
|---|----------|---------|----------|-----|
### Action plan
1. (Phase 1 — Critical) ...
2. (Phase 2 — High) ...
3. (Phase 3 — Medium/Low) ...
```

The orchestrator merges these into one report: executive summary (health
score, top 5 critical issues, top 5 quick wins), per-category sections, and a
single phased action plan (Week 1 critical fixes → Weeks 2–3 high impact →
Month 2 content & authority → ongoing monitoring).

---

## 1. Technical SEO Agent

Mission: make sure search engines can crawl, render and index every page that
matters — and nothing that should stay hidden.

Checks:
1. Fetch `robots.txt`; confirm it returns 200, does not block CSS/JS assets or
   important paths, and declares the sitemap URL.
2. Fetch the homepage and 5 sample pages with `curl -I`; confirm 200s, no
   redirect chains longer than one hop, and HTTP → HTTPS in a single redirect.
3. Check response headers: HSTS, X-Content-Type-Options, and that HTML pages
   are not accidentally served with `X-Robots-Tag: noindex`.
4. Inspect raw HTML for `<meta name="robots">` — flag any `noindex`/`nofollow`
   on pages that should rank.
5. Confirm canonical tags are absolute, self-referencing on unique pages, and
   never point to a different page unless duplication is intentional.
6. Check mobile readiness: viewport meta present, no horizontal-scroll layout
   signals, tap targets not crammed (rendered check in the browser).
7. Test JS rendering: compare raw HTML vs rendered DOM for the main content —
   flag content that only exists after client-side hydration if it is missing
   from the initial HTML for a page type that should be SSR.
8. Verify 404 handling: a nonsense URL returns a real 404 (not a soft-404
   200), and the 404 page links back to key sections.
9. Check URL hygiene: lowercase, hyphenated, no session IDs or tracking
   parameters in internal links, no duplicate routes for the same content.
10. Confirm HTTPS everywhere: no mixed-content references (http:// assets) in
    the HTML of key pages.

## 2. Content Quality & E-E-A-T Agent

Mission: judge whether the content deserves to rank — depth, originality,
expertise signals and trust.

Checks:
1. Word-count the main content of representative pages; flag thin pages
   (<300 words for a page targeting a real query) and list them.
2. Check for a visible author/owner identity, an About page, and contact
   details — the basic trust footprint.
3. Look for experience signals: first-hand detail, original data, screenshots
   or examples that could not be copied from a competitor.
4. Check freshness: publication and updated dates present and honest; flag
   stale content on fast-moving topics.
5. Scan for duplicate or near-duplicate content across the site's own pages
   (same title + same opening paragraphs on multiple URLs).
6. Assess readability: paragraph length, subheading coverage, lists/tables
   where the query expects scannable answers.
7. For YMYL topics (legal, finance, health), verify disclaimers are present
   and claims are not overstated (e.g. usaattorneys.company pages must carry
   the not-legal-advice disclaimer).
8. Check that facts likely to be quoted (prices, dates, eligibility rules)
   match the primary source when one exists.

## 3. Schema Markup Agent

Mission: structured data that is present, valid and matched to the page type.

Checks:
1. Extract all JSON-LD blocks from key page types; list which @types exist
   per template.
2. Validate required properties per type (e.g. Article needs headline, date,
   author; FAQPage needs mainEntity with acceptedAnswer text).
3. Confirm schema matches visible content — no FAQ schema for hidden FAQs,
   no reviews/ratings the page does not show (never invent ratings).
4. Check Organization/WebSite schema on the homepage and consistent @id
   references across pages.
5. For local pages, check LocalBusiness/Attorney schema: name, address,
   phone, openingHours where publicly true.
6. For blog posts, check Article/BlogPosting + BreadcrumbList and that the
   breadcrumb schema matches the visible breadcrumb trail.
7. Flag pages with no schema that have an obvious type (tools →
   WebApplication/SoftwareApplication, guides → Article, listings →
   ItemList).
8. Check for conflicting or duplicated schema blocks emitted twice by
   layout + page.

## 4. Sitemap & Indexing Agent

Mission: every important URL discoverable, submitted and actually indexed.

Checks:
1. Fetch `sitemap.xml` (and index files); confirm 200, valid XML, and that
   every listed URL itself returns 200 (sample at least 20, all if <100).
2. Confirm the sitemap contains only canonical, indexable URLs — no
   redirected, 404, or noindexed entries.
3. Compare sitemap inventory vs the site's real inventory (nav + internal
   crawl): list important pages missing from the sitemap.
4. Check `<lastmod>` values are real (not all stamped today).
5. Cross-check submitted URLs against the Indexing API ledgers in
   `~/workspace/seo-tools/google-indexing/state/` — list URLs published but
   never submitted.
6. Submit genuinely missing URLs via the Indexing API
   (`.venv/bin/python submit_one.py <site> <url>`) and record the result.
7. In GSC (when accessible), compare indexed vs submitted counts and list
   "Crawled — currently not indexed" patterns worth investigating.
8. Confirm robots.txt references the sitemap and the sitemap URL itself is
   not blocked.

## 5. Performance Agent (Core Web Vitals)

Mission: pages that load fast enough not to lose rankings or visitors.

Checks:
1. Time key pages with `curl -w` (TTFB and total) from the shell; flag TTFB
   >600ms on HTML pages and investigate the cause (cold starts, no caching).
2. Check cache headers on HTML: a sane `Cache-Control`/`s-maxage` +
   stale-while-revalidate policy for public pages; long-lived immutable
   caching for `/_next/static/` assets.
3. Measure page weight: total HTML size and the count/size of JS chunks on
   the heaviest template.
4. Check images for modern formats (WebP/AVIF), explicit width/height (CLS),
   and lazy loading below the fold; the hero image must not be lazy (LCP).
5. Look for render-blocking resources and unused third-party scripts in the
   HTML head.
6. Flag layout-shift risks: injected banners/embeds without reserved space.
7. Where field data is available (CrUX/GSC), report real LCP/INP/CLS
   against the good thresholds (LCP ≤2.5s, INP ≤200ms, CLS ≤0.1); otherwise
   label results as lab/proxy measurements, never as field data.
8. Re-test after fixes and record before/after numbers — no fix is "done"
   without a re-measurement.

## 6. AI Search Agent (GEO)

Mission: make the site the one AI answer engines cite.

Checks:
1. Fetch `llms.txt`; if missing, draft one (site summary + key page links).
   If present, check it is current and links resolve.
2. Check robots.txt treatment of AI crawlers (GPTBot, ClaudeBot,
   PerplexityBot, Google-Extended): blocked, allowed, or unmentioned — and
   whether that matches the user's intent (default: allow; visibility is
   the goal).
3. Run the site's own BotView check (`/botview` on frinjo.me) and fold its
   AI Visibility Score into the report.
4. Assess citability of key pages: does the page answer its query in the
   first screenful with a self-contained, quotable statement of fact?
5. Check entity clarity: consistent brand name, Organization schema,
   same-as links to real profiles.
6. Look for structured, extractable content: comparison tables, stat blocks,
   FAQ sections with direct answers — the formats AI engines quote.
7. Test 2–3 target queries in an AI Overview / AI search surface when
   available and record whether the site is cited (the AI Overview Citation
   check used in the daily publishers).
8. Flag pages where a thin competitor page is cited instead — those are
   priority rewrites.

## 7. Local SEO Agent

Mission: win the map pack and "near me" intent for local-service sites.

Checks:
1. NAP consistency: name, address, phone identical across the site, schema
   and the Google Business Profile.
2. Every location/service-area page has unique content — no doorway-style
   duplicates with only the city name swapped.
3. LocalBusiness (or subtype) schema present and accurate on location pages.
4. GBP categories, services and photos reviewed when the profile is
   accessible; gaps listed.
5. Review signals: review count/rating visible where truthful, and a working
   path for customers to leave reviews.
6. Local internal linking: state → city → service hierarchy linked both
   ways, no orphan location pages.
7. Embedded map or service-area description present on contact/location
   pages.
8. Local keyword mapping: each location page targets "[service] in [city]"
   in title/H1 without stuffing.

## 8. Backlinks Agent

Mission: know who links to the site, what it is worth, and where the gaps
are — using only data actually retrieved.

Checks:
1. Pull the referring-domain list from the best available source (GSC Links
   report, Ahrefs connector, or Common Crawl) and state the source.
2. Count referring domains and trend vs the last audit; separate follow
   from nofollow.
3. Review anchor-text distribution: flag over-optimized exact-match anchors
   and aim for the user's standing mix (branded anchors 60–70%).
4. Identify toxic patterns: sitewide links from irrelevant networks,
   hacked/spam domains; list disavow candidates with evidence.
5. Find broken backlinks: external links pointing at 404/redirected URLs on
   the site — each is a recovery task (fix the target or add a redirect).
6. Compare against 2–3 competitors' referring-domain counts and list
   link-gap targets (sites linking to competitors but not to us) that fit
   the user's outreach rules.
7. Verify the user's owned profile/directory links are live (fetch each,
   confirm 200 and the link present).

## 9. On-Page SEO Agent

Mission: every page's title, meta, headings and copy aligned to one clear
search intent.

Checks:
1. Extract title tags site-wide (from sitemap sample): flag missing,
   duplicate, <30 or >60 characters, and keyword-stuffed titles.
2. Meta descriptions: missing/duplicate/too long; must contain a reason to
   click, not just keywords.
3. Exactly one H1 per page, matching the page's intent; H2/H3 hierarchy
   logical, no skipped levels used for styling.
4. The target query appears naturally in title, H1, first 100 words and at
   least one subheading — without stuffing.
5. First-screenful answer test: for informational queries, the direct
   answer appears above the fold before any fluff.
6. Image alt text present and descriptive (hand off details to Image SEO).
7. Outbound links to authoritative sources where claims need support;
   internal links handed to the Internal Linking Agent.
8. Check for keyword cannibalization: two+ pages targeting the same query —
   recommend merge, differentiate, or canonicalize.

## 10. Image SEO Agent

Mission: images that rank in image search and never slow the page down.

Checks:
1. Sample images across templates: flag missing or empty alt attributes.
2. Flag keyword-stuffed or filename-only alt text ("IMG_2043.jpg" style);
   alt should describe the image for a human.
3. Check file sizes: flag images >200KB served without compression or
   resizing to display dimensions.
4. Confirm modern formats (WebP/AVIF) with fallbacks where the stack
   supports them.
5. Check width/height attributes or aspect-ratio CSS on all content images
   (CLS protection).
6. Descriptive file names for key images (service-city-topic pattern where
   natural).
7. Images referenced in sitemap or via og:image are live (200) and the
   og:image is the intended share image at a sane size.
8. Decorative images correctly have empty alt="" instead of keyword text.

## 11. Keyword Research Agent

Mission: pick the next keywords worth building for — with evidence, not
vibes. Runs the user's three standing checks.

Checks:
1. **BOFU Content Finder** — find bottom-of-funnel queries (cost, price,
   best, vs, near me, hire) in the niche with buying intent.
2. **Untapped Demand** — queries with real volume but weak/thin ranking
   pages: check the live SERP, not just a tool's difficulty score.
3. **AI Overview Citation check** — for queries with an AI Overview, record
   which pages get cited and what structure they use; weak/thin cited
   pages boost a keyword's priority. Never copy the AI answer itself.
4. Verify current rankings live: search the top candidate queries on
   Google and record the site's real position (GSC alone is not proof —
   standing rule for USA Attorneys reports).
5. Pull GSC data (queries, impressions, CTR, position) for the last 28
   days; flag striking-distance queries (positions 8–20) with impressions.
6. Map each winning keyword to exactly one target page (new or existing)
   and one intent — no two pages chasing the same query.
7. Record which of the three checks the winning keyword won, per the
   user's reporting rule.
8. Hand winners to the Content Brief Agent (new pages) or On-Page Agent
   (existing pages).

## 12. Competitor Analysis Agent

Mission: know exactly what the pages outranking us do better — then beat
them on substance, not imitation.

Checks:
1. Identify the real SERP competitors for the target queries (live search,
   not a fixed list) — usually 3–5 domains.
2. Compare content depth: word count, sections, tables, media on the top
   pages vs ours.
3. Compare intent match: is the ranking page type (tool, guide, listing,
   video) the same as ours? Flag intent mismatches first — they explain
   most "mystery" ranking gaps.
4. Compare structured data and SERP features won (FAQ, reviews, sitelinks).
5. Compare authority signals: referring domains to the page/domain
   (Backlinks Agent data).
6. Compare freshness: publish/update dates and how often competitors
   refresh.
7. Extract the gap list: subtopics they cover that we do not; facts they
   state that we must verify independently before using.
8. Never copy competitor copy or the AI Overview answer — gaps are
   covered in our own words with our own evidence.

## 13. Internal Linking Agent

Mission: no orphan pages, no wasted authority — link equity flows to the
pages that make money or rank.

Checks:
1. Build the internal link graph from a crawl (or sitemap + page fetches);
   list orphan pages (in sitemap, zero internal links in).
2. List pages with only 1 internal link — candidates for reinforcement
   from related hubs.
3. Check anchor-text quality: descriptive anchors, no long runs of
   "click here" or exact-match repetition.
4. Verify hub → spoke and spoke → hub links on topic clusters (state →
   city, category → tool, pillar → guides).
5. Check that money pages (services, tools, listings) receive links from
   the highest-traffic content pages.
6. Find broken internal links and internal links to redirected URLs; fix
   to the final destination.
7. Check link depth: every important page reachable within 3 clicks of
   the homepage.
8. After changes, re-crawl the affected section and confirm the graph
   improved — report before/after orphan count.

## 14. Content Brief Agent

Mission: turn a winning keyword into a brief a writer (or the daily
publisher) can execute without guessing.

Checks (the brief must contain):
1. Target keyword + the check it won (BOFU / Untapped / AI Overview) and
   the live-SERP evidence.
2. Search intent in one sentence, and the page type that satisfies it.
3. Title tag and H1 options (2–3), meta description draft.
4. Outline: 6+ sections with H2/H3, each with the specific facts, figures
   or comparisons it must include — and the primary source for each fact.
5. Word-count target from competitor depth (USA Attorneys/Frinjo
   standard: 1,500+ words).
6. Internal links: 3–5 specific pages to link to and from, with anchor
   text suggestions.
7. Schema plan: which types the page ships (Article + FAQPage etc.) and
   4–6 FAQ questions drafted from real query variants.
8. Media plan: exactly 3 verified images (per the user's publishing
   standard) with sources, plus og:image choice.
9. E-E-A-T notes: author identity, disclaimers needed, and what first-hand
   element to include.
10. Post-publish checklist: Indexing API submission, GSC request-indexing
    note, and the ranking metric to watch.

---

## Standing rules for every run

- **Verify live before reporting.** A page is only "broken" or "fixed"
  when a fetch in this run proves it. Cached copies and old reports are
  leads, not evidence.
- **One article per site per day** when the audit turns into publishing —
  keyword research first, per the Keyword Research Agent.
- **Honesty in claims.** No invented traffic figures, ratings, review
  counts, or client results anywhere in findings or fixes.
- **Report in the user's format:** health score first, findings by
  severity, then the phased action plan — concise, counts verified.
