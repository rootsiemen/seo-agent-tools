import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Sitemap Checker — Free XML Sitemap Validator",
  description:
    "Free sitemap checker: enter any site URL to fetch its XML sitemap, count URLs, follow sitemap indexes, check lastmod dates and spot-check that listed URLs are actually live.",
  keywords: ["sitemap checker", "xml sitemap validator", "sitemap tester", "check sitemap", "sitemap url count"],
  alternates: { canonical: "https://frinjo.me/sitemap-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Sitemap Checker | WebStore Pro",
    description: "Fetch and audit any site's XML sitemap — URL count, index handling, lastmod dates and live-URL spot checks.",
    url: "https://frinjo.me/sitemap-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "sitemap-checker",
        name: "Sitemap Checker",
        tool: "sitemap",
        tagline: "Is your sitemap helping crawlers — or wasting their budget?",
        intro:
          "Your sitemap is the list of pages you are explicitly asking search engines to crawl. This checker fetches it live (following sitemap indexes into their child files), counts the URLs, looks for lastmod freshness dates, and spot-checks that listed URLs actually return 200.",
        checksTitle: "What does the Sitemap Checker test?",
        checksSub: "Existence, structure, size — and whether the URLs inside are alive.",
        cards: [
          { title: "Existence & format", desc: "Checks /sitemap.xml first, then any Sitemap: line declared in robots.txt. Sitemap indexes are detected and followed one level into child sitemaps." },
          { title: "URL count & freshness", desc: "Counts every listed URL and checks for <lastmod> dates, which help crawlers prioritise freshly updated pages." },
          { title: "Live URL spot check", desc: "Samples the first URLs in the sitemap and fetches each one. Dead URLs in a sitemap waste crawl budget and signal neglect." },
        ],
        faqs: [
          ["Where should my sitemap live?", "At yoursite.com/sitemap.xml, and referenced by a Sitemap: line in robots.txt and submitted in Google Search Console."],
          ["How many URLs can a sitemap hold?", "50,000 URLs or 50 MB per file. Larger sites use a sitemap index pointing to multiple child sitemaps — this checker follows those."],
          ["Should every page be in the sitemap?", "Only canonical, indexable, live pages. Listing redirects, 404s or noindexed pages contradicts your other signals and wastes crawl budget."],
        ],
      }}
    />
  );
}
