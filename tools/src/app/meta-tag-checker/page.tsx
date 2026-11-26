import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Meta Tag Checker — See Every Tag a Page Actually Serves",
  description:
    "Free meta tag checker: enter any URL to see its real title, description, canonical, Open Graph, Twitter card, robots, viewport, charset and favicon values — exactly as served.",
  keywords: ["meta tag checker", "open graph checker", "og tag tester", "meta tags analyzer", "twitter card checker"],
  alternates: { canonical: "https://frinjo.me/meta-tag-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Meta Tag Checker | WebStore Pro",
    description: "See the exact meta tag values any page serves — title, description, canonical, OG, Twitter card and more.",
    url: "https://frinjo.me/meta-tag-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "meta-tag-checker",
        name: "Meta Tag Checker",
        tool: "metatags",
        tagline: "Every meta tag on the page — with its actual value",
        intro:
          "Meta tags decide how your page appears in search results, social shares and browser tabs. This checker fetches the page and prints the exact values it serves: title, description, canonical, the full Open Graph set, Twitter card, robots directives, viewport, charset, favicon and language.",
        checksTitle: "Which tags does the Meta Tag Checker read?",
        checksSub: "The tags that control search appearance, sharing and rendering.",
        cards: [
          { title: "Search tags", desc: "Title, meta description and canonical — the trio that decides what Google shows and which URL gets the credit." },
          { title: "Social tags", desc: "Open Graph title, description, image and type, plus the Twitter card type — what your link looks like when anyone shares it." },
          { title: "Rendering & directives", desc: "Robots meta (a noindex here overrides everything), viewport, charset, favicon and the html lang attribute." },
        ],
        faqs: [
          ["Why do my shared links show the wrong image?", "Social platforms read og:image. If it is missing or points to a small image, they guess — usually badly. This checker shows the exact value being served."],
          ["What is a canonical tag?", "A canonical tells search engines which URL is the master version when similar pages exist. Without one, engines choose for you — and may choose wrong."],
          ["Which meta tags still matter in 2026?", "Title, description, canonical, robots and viewport are essential. Open Graph and Twitter cards control sharing appearance. Keywords meta has been ignored by Google for years."],
        ],
      }}
    />
  );
}
