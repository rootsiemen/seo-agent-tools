import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Backlink Checker — Free Outgoing Link Profile Audit",
  description:
    "Free backlink checker (v1): audit any page's outgoing link profile — every external link with its anchor text, follow/nofollow status and target domains. Honest scope: referring domains need a paid index.",
  keywords: ["backlink checker", "outgoing link checker", "external link audit", "nofollow checker", "link profile checker"],
  alternates: { canonical: "https://frinjo.me/backlink-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Backlink Checker | WebStore Pro",
    description: "Audit the external links any page gives out — anchors, follow/nofollow and domains. No fake backlink counts.",
    url: "https://frinjo.me/backlink-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "backlink-checker",
        name: "Backlink Checker",
        tool: "backlinks",
        tagline: "Audit the links a page gives out — anchors, follow status, domains",
        intro:
          "An honest scope note first: this v1 checker audits a page's OUTGOING link profile — every external link it gives, with anchor text, follow/nofollow status and target domains. Counting the links pointing TO your site (referring domains) requires a paid link index like Ahrefs or Moz; any free tool showing you that number is making it up, so we don't.",
        checksTitle: "What does the Backlink Checker audit?",
        checksSub: "Your outgoing profile — the half of link building fully in your control.",
        cards: [
          { title: "Every external link, listed", desc: "Each outbound link with its anchor text and destination, so you can see exactly what your page endorses and recommends." },
          { title: "Follow vs nofollow balance", desc: "rel attributes are decoded per link. Paid or untrusted links should be nofollow/sponsored; genuine editorial citations should usually be followed." },
          { title: "Anchor & security quality", desc: "Links with no anchor text, and links still pointing at plain http:// pages, are flagged — both quietly leak value." },
        ],
        faqs: [
          ["Why can't this tool count my backlinks?", "Backlinks pointing to your site are only visible to whoever crawls the whole web and indexes the links — Ahrefs, Moz, Semrush. That data costs them billions to maintain, so real referring-domain counts are never free. This checker audits what is verifiable from the page itself."],
          ["Should I nofollow all external links?", "No. Following authoritative sources is a natural, healthy signal. Reserve nofollow/sponsored for paid placements, affiliate links and anything you don't editorially vouch for."],
          ["Do outgoing links affect my rankings?", "Indirectly, yes: they shape what the page is about, how trustworthy it looks, and whether your internal authority flows to the right places."],
        ],
      }}
    />
  );
}
