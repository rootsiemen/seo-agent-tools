import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Content Brief Generator — Free SEO Brief Builder",
  description:
    "Free content brief generator: enter a keyword (and optionally your existing page URL) to get a target word count, H2 outline, questions to answer, schema and internal-link plan — plus a keyword gap analysis of your current page.",
  keywords: ["content brief generator", "seo brief builder", "content brief template", "keyword brief", "seo content outline"],
  alternates: { canonical: "https://frinjo.me/content-brief-generator" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Content Brief Generator | WebStore Pro",
    description: "Turn a keyword into a writer-ready SEO brief: word-count target, heading outline, questions, schema and link plan.",
    url: "https://frinjo.me/content-brief-generator",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "content-brief-generator",
        name: "Content Brief Generator",
        tool: "brief",
        mode: "brief",
        tagline: "Turn a keyword into a writer-ready brief in seconds",
        intro:
          "Enter a target keyword and get a complete brief: recommended title and H1, a target word count, an eight-section H2 outline, the questions the article must answer, and the schema, media and internal-link plan. Add your existing page URL and the generator first runs a gap analysis — keyword in title, H1 and H2s, density and current depth — then sizes the brief to beat it.",
        checksTitle: "What does the Content Brief Generator produce?",
        checksSub: "A brief a writer can start from immediately — with or without an existing page.",
        cards: [
          { title: "Gap analysis (with URL)", desc: "Your live page is checked for the keyword in its title, H1 and H2s, its keyword density and its current word count — so the brief fixes real weaknesses, not imagined ones." },
          { title: "Outline & questions", desc: "A full H2 outline built around the keyword's intent, plus the six questions searchers actually ask — which double as your FAQ schema content." },
          { title: "Production plan", desc: "Target word count, schema types to add, media requirements and the internal-linking plan, so the finished article ships complete, not as a draft." },
        ],
        faqs: [
          ["What is a content brief?", "A one-page instruction sheet for an article: the keyword, the audience intent, the outline, the questions to answer and the technical requirements (schema, links, media). Good briefs are why some articles rank on day one."],
          ["How is the target word count chosen?", "Without a URL, a solid 1,800-word default for competitive topics. With a URL, the target is set about 30% deeper than your current page — depth is how you out-cover the pages already ranking."],
          ["Should the keyword be in every heading?", "No — the title, H1 and two or three H2s, used naturally. The gap analysis flags absence, not a stuffing quota; density beyond ~2% reads as manipulation."],
        ],
      }}
    />
  );
}
