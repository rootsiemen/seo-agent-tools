import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Technical SEO Checker — Free Live Site Scan",
  description:
    "Free technical SEO checker: paste any URL and instantly check status codes, HTTPS, redirects, response time, canonicals, robots meta, sitemap and robots.txt reachability.",
  keywords: ["technical seo checker", "seo site checker", "website seo test", "canonical checker", "free seo audit"],
  alternates: { canonical: "https://frinjo.me/technical-seo-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Technical SEO Checker | WebStore Pro",
    description: "Paste any URL and get an instant technical SEO report — status, HTTPS, speed, canonicals, indexing signals and more.",
    url: "https://frinjo.me/technical-seo-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "technical-seo-checker",
        name: "Technical SEO Checker",
        tool: "technical",
        tagline: "Can search engines crawl, fetch and index this page?",
        intro:
          "Paste any URL and this checker fetches it live — the same way a crawler does — then tests the technical foundations every ranking depends on: server response, HTTPS, redirect chains, indexability tags, and whether robots.txt and the sitemap are actually reachable.",
        checksTitle: "What does the Technical SEO Checker test?",
        checksSub: "Fourteen live checks against the real response — no cached data, no guesses.",
        cards: [
          { title: "Reachability & server", desc: "HTTP status code, HTTPS, redirect chains, response time and HTML weight. A slow or bouncing URL bleeds crawl budget before content even matters." },
          { title: "Indexability signals", desc: "Title and meta description presence, the canonical URL, robots meta (a stray noindex is the silent ranking killer), and exactly-one-H1 structure." },
          { title: "Crawl entry points", desc: "Whether /robots.txt and /sitemap.xml actually return 200 at the site root — the two files every crawler asks for first." },
        ],
        faqs: [
          ["What is technical SEO?", "Technical SEO is everything that lets search engines reach, fetch and index your pages: server responses, HTTPS, redirects, canonicals, robots rules and sitemaps. Content cannot rank if the technical layer blocks it."],
          ["Why does my page return a redirect warning?", "One redirect (http→https, or to www) is normal. Long chains slow crawlers down and dilute link equity, so this checker warns beyond two hops."],
          ["What is a good score here?", "80+ means the technical foundations are sound. Below 50 usually means something is actively blocking crawling or indexing — fix the red items first."],
        ],
      }}
    />
  );
}
