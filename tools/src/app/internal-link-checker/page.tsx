import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Internal Link Checker — Anchors, Targets & Broken Link Spot Check",
  description:
    "Free internal link checker: list every internal link on a page with its anchor text, count unique targets, detect self-links and generic anchors, and spot-check targets for broken links.",
  keywords: ["internal link checker", "internal linking audit", "broken link checker", "anchor text checker", "internal links tool"],
  alternates: { canonical: "https://frinjo.me/internal-link-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Internal Link Checker | WebStore Pro",
    description: "Audit a page's internal links: anchors, unique targets, self-links and a broken-link spot check — free.",
    url: "https://frinjo.me/internal-link-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "internal-link-checker",
        name: "Internal Link Checker",
        tool: "internal",
        tagline: "Where does this page's authority flow — and where does it leak?",
        intro:
          "Internal links are how you tell Google which of your pages matter and what they are about. This checker lists every internal link on the page with its anchor text, counts unique targets, flags self-links and generic 'click here' anchors, and spot-checks up to ten targets to catch broken links.",
        checksTitle: "What does the Internal Link Checker audit?",
        checksSub: "Targets, anchors, self-links — and whether the targets still exist.",
        cards: [
          { title: "Targets & distribution", desc: "Every internal link grouped by target, with counts — see whether equity spreads across your important pages or pools on the homepage and nav." },
          { title: "Anchor text quality", desc: "Descriptive anchors teach Google what the target page covers. Generic anchors ('read more', 'click here') and repeated identical anchors are flagged." },
          { title: "Broken-link spot check", desc: "Up to ten unique internal targets are fetched live. A 404 in your internal linking wastes crawl budget and strands visitors." },
        ],
        faqs: [
          ["How many internal links should a page have?", "No magic number — enough to genuinely help readers reach related pages. Most strong pages link to 3–10 relevant internal targets from the body content, beyond nav links."],
          ["Do anchor texts really matter?", "Yes. Google uses anchor text as a relevance signal for the target page. 'Our emergency plumbing guide' beats 'click here' every time."],
          ["Why do broken internal links hurt?", "They waste crawl budget, break the path for visitors, and signal an unmaintained site. One broken link is a small leak; a pattern of them is a quality problem."],
        ],
      }}
    />
  );
}
