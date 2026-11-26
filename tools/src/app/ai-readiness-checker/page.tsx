import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "AI Readiness Checker — Is Your Site Ready for AI Search?",
  description:
    "Free AI readiness checker (BotView-lite): test any URL for llms.txt, AI crawler access in robots.txt, structured data, readable server-rendered text and quotable heading structure.",
  keywords: ["ai readiness checker", "ai seo checker", "llms.txt checker", "geo checker", "ai visibility test"],
  alternates: { canonical: "https://frinjo.me/ai-readiness-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "AI Readiness Checker | WebStore Pro",
    description: "Can ChatGPT, Claude and Perplexity read and cite your site? llms.txt, AI crawler access, schema and readable text — checked live.",
    url: "https://frinjo.me/ai-readiness-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "ai-readiness-checker",
        name: "AI Readiness Checker",
        tool: "ai-readiness",
        tagline: "Can AI search engines read — and cite — this site?",
        intro:
          "A growing share of searches ends inside an AI answer. Those answers cite sites that AI crawlers could actually read. This BotView-lite checker tests the essentials: an llms.txt map, whether GPTBot, ClaudeBot and PerplexityBot are allowed in, structured data, and how much readable text exists in the raw HTML without JavaScript.",
        checksTitle: "What does the AI Readiness Checker test?",
        checksSub: "The signals that decide whether AI answers can find and quote you.",
        cards: [
          { title: "llms.txt & crawler access", desc: "Whether /llms.txt exists and links to key pages, and whether the major AI crawlers are blocked in robots.txt — the two gates everything else depends on." },
          { title: "Machine-readable facts", desc: "JSON-LD structured data gives AI engines facts to cite directly instead of guessing from prose." },
          { title: "Readable, quotable content", desc: "Readable words in the raw HTML, semantic landmarks, and a clear H1/H2 structure — most AI crawlers never run JavaScript, so server-rendered text is all they get." },
        ],
        faqs: [
          ["What is llms.txt?", "A plain-text map at your site root (yoursite.com/llms.txt) that tells AI crawlers what your key pages and facts are. Think of it as a sitemap written for language models."],
          ["How is this different from BotView?", "This is the quick version — the essential AI-readiness checks. BotView runs the full 25+ check audit across SEO, AEO and GEO with three separate scores."],
          ["Do AI crawlers run JavaScript?", "Mostly no. GPTBot, ClaudeBot and similar crawlers read raw HTML. Content that only appears after client-side rendering is effectively invisible to them."],
        ],
      }}
    />
  );
}
