import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Robots.txt Checker — Test Crawler & AI Bot Access",
  description:
    "Free robots.txt checker: enter any site to parse its robots.txt, see every user-agent group, check the sitemap declaration and whether GPTBot, ClaudeBot and other AI crawlers are blocked.",
  keywords: ["robots.txt checker", "robots txt tester", "gptbot blocked check", "ai crawler checker", "robots.txt validator"],
  alternates: { canonical: "https://frinjo.me/robots-txt-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Robots.txt Checker | WebStore Pro",
    description: "Parse any site's robots.txt and see exactly which crawlers — search and AI — are allowed or blocked.",
    url: "https://frinjo.me/robots-txt-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "robots-txt-checker",
        name: "Robots.txt Checker",
        tool: "robots",
        tagline: "Who is allowed to crawl this site — and who is locked out?",
        intro:
          "robots.txt is the first file every crawler reads, and a single wrong line can block Google — or every AI search engine — from your whole site. This checker fetches and parses the file, lists every user-agent group with its rules, verifies the sitemap declaration, and tests access for GPTBot, ClaudeBot, Google-Extended and PerplexityBot.",
        checksTitle: "What does the Robots.txt Checker analyse?",
        checksSub: "Groups, rules, sitemap declaration and AI-crawler access — parsed with real longest-match semantics.",
        cards: [
          { title: "Every group, decoded", desc: "Each user-agent group is listed with its Allow and Disallow rules, plus the raw file so you can read exactly what crawlers read." },
          { title: "AI crawler access", desc: "GPTBot, ClaudeBot, Google-Extended and PerplexityBot are tested individually — including blocks inherited from the * group that most site owners never notice." },
          { title: "Danger paths", desc: "A Disallow on / itself, or on content paths like /blog and /services, is flagged before it costs you rankings." },
        ],
        faqs: [
          ["Does blocking AI crawlers hurt my traffic?", "If GPTBot or ClaudeBot cannot crawl you, ChatGPT and Claude cannot cite your pages in answers. Blocking may protect content, but it trades away AI-search visibility."],
          ["Does robots.txt stop pages appearing in Google?", "No — a blocked page can still be indexed from links, just without its content being read. Use a noindex directive to keep a page out properly."],
          ["Should robots.txt list my sitemap?", "Yes. A Sitemap: line helps every crawler find your sitemap even if they guess the wrong filename."],
        ],
      }}
    />
  );
}
