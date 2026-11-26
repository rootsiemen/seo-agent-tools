import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Local SEO Checker — LocalBusiness Schema, NAP & Maps Test",
  description:
    "Free local SEO checker: test any local business page for LocalBusiness schema, phone and address (NAP) signals, Google Maps links, opening hours and review schema.",
  keywords: ["local seo checker", "localbusiness schema checker", "nap consistency checker", "local seo test", "google maps seo"],
  alternates: { canonical: "https://frinjo.me/local-seo-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Local SEO Checker | WebStore Pro",
    description: "Check the local signals on any business page: LocalBusiness schema, phone, address, Maps link, hours and reviews.",
    url: "https://frinjo.me/local-seo-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "local-seo-checker",
        name: "Local SEO Checker",
        tool: "local",
        tagline: "The signals that win the map pack, checked on your homepage",
        intro:
          "Local rankings rest on signals a normal SEO audit ignores: LocalBusiness structured data, a consistent name-address-phone (NAP), a Google Maps link, opening hours and review markup. This checker reads your homepage live and tests each one — the same details Google matches against your Business Profile.",
        checksTitle: "What does the Local SEO Checker test?",
        checksSub: "Schema, NAP, Maps, hours and reviews — the map-pack foundations.",
        cards: [
          { title: "LocalBusiness schema", desc: "Whether the page declares a LocalBusiness subtype (Restaurant, Plumber, Attorney…) in JSON-LD — the strongest on-page local signal there is." },
          { title: "NAP & contact signals", desc: "A real phone number and a full street address with ZIP in the page text, matching your Google Business Profile exactly." },
          { title: "Maps, hours & reviews", desc: "A Google Maps link or embed for one-tap directions, openingHours in schema or text, and AggregateRating markup for star ratings." },
        ],
        faqs: [
          ["What is NAP consistency?", "NAP = Name, Address, Phone. Google cross-checks the details on your site against your Business Profile and directories. Mismatches — an old address, a different phone format — weaken local trust."],
          ["Does LocalBusiness schema guarantee map rankings?", "No single factor does, but schema removes ambiguity: Google doesn't have to guess what your business is or where it is. Combined with a complete Business Profile and reviews, it is a core foundation."],
          ["Should I add review schema if I have no reviews on the page?", "No. AggregateRating markup must reflect genuine reviews visible on the page — fake or imported ratings can earn a manual penalty."],
        ],
      }}
    />
  );
}
