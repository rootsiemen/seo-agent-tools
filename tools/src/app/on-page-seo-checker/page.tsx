import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "On-Page SEO Checker — Free Title, Heading & Content Audit",
  description:
    "Free on-page SEO checker: analyse any page's title and description length, H1/H2 structure, word count, internal and external links, image alt text and text-to-HTML ratio.",
  keywords: ["on page seo checker", "seo content checker", "title tag checker", "heading structure checker", "word count seo"],
  alternates: { canonical: "https://frinjo.me/on-page-seo-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "On-Page SEO Checker | WebStore Pro",
    description: "Audit the on-page signals of any URL: titles, headings, word count, links and alt text — scored live.",
    url: "https://frinjo.me/on-page-seo-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "on-page-seo-checker",
        name: "On-Page SEO Checker",
        tool: "onpage",
        tagline: "Titles, headings, content depth and links — scored live",
        intro:
          "On-page SEO is what the page itself says and how it is structured. This checker reads the live HTML and scores the signals you control directly: title and description lengths, heading hierarchy, word count, internal and external linking, image alt text and how much of the page is real text.",
        checksTitle: "What does the On-Page SEO Checker measure?",
        checksSub: "The ranking signals that live inside the page itself.",
        cards: [
          { title: "Title & description", desc: "Lengths are tested against the ranges search results actually display: 30–60 characters for titles, 120–160 for descriptions." },
          { title: "Headings & content depth", desc: "Exactly one H1, a real H2/H3 structure, sane heading order, and enough words to satisfy the search intent — thin pages are flagged." },
          { title: "Links & images", desc: "Internal links distribute authority; external links cite sources. Image alt coverage and text-to-HTML ratio round out the picture." },
        ],
        faqs: [
          ["How long should a title tag be?", "Aim for 30–60 characters. Longer titles get truncated in results; shorter ones usually waste keyword and click-through potential."],
          ["How many words should a page have?", "Enough to fully answer the query — for most service and guide pages that means 600+ words, and competitive topics often need 1,500+. This checker flags under 300 as thin."],
          ["Does heading order really matter?", "Yes — one H1 as the page title, then H2 sections and H3 sub-points. Skipped levels and multiple H1s make the page harder for engines (and screen readers) to parse."],
        ],
      }}
    />
  );
}
