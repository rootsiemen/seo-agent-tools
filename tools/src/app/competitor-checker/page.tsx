import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Competitor Checker — Free Side-by-Side Page Comparison",
  description:
    "Free competitor checker: enter your page and a competitor's page to compare title, description, word count, headings, schema, links, speed and score — side by side.",
  keywords: ["competitor checker", "seo competitor analysis", "compare websites seo", "competitor page comparison", "seo vs tool"],
  alternates: { canonical: "https://frinjo.me/competitor-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Competitor Checker | WebStore Pro",
    description: "Your page vs theirs, on the same rubric: content depth, schema, links, speed and score — compared live.",
    url: "https://frinjo.me/competitor-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "competitor-checker",
        name: "Competitor Checker",
        tool: "competitor",
        mode: "dual",
        tagline: "Your page vs theirs — same rubric, side by side",
        intro:
          "Rankings are relative: you don't need a perfect page, you need a better page than the one above you. Enter your URL and a competing page, and this checker fetches both live and compares them on one rubric — response time, title and description, word count, headings, schema, links, images and an overall score for each.",
        checksTitle: "What does the Competitor Checker compare?",
        checksSub: "Both pages fetched at the same moment, scored on identical rules.",
        cards: [
          { title: "Content depth", desc: "Word count, heading structure and meta lengths — the areas where outranking usually comes down to simply covering the topic better." },
          { title: "Technical & schema edge", desc: "Response time, HTML weight, and who carries more (and richer) structured data — the quiet advantages that compound." },
          { title: "Two scores, one table", desc: "Each page gets a score out of 100 from the same rubric, with a metric-by-metric table showing exactly where you win and where you trail." },
        ],
        faqs: [
          ["Which competitor page should I compare against?", "The page ranking directly above you for the keyword you want — same search intent, same page type. Comparing your service page to their homepage skews everything."],
          ["Does a higher score guarantee I'll outrank them?", "No — backlinks, brand and history also matter. But on-page factors are the ones you can fix today, and this comparison shows precisely where the gap is."],
          ["Can I compare any two URLs?", "Yes — both must be public pages. Your page is fetched first, then the competitor's, and both are scored identically."],
        ],
      }}
    />
  );
}
