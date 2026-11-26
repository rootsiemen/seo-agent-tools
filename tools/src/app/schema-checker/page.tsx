import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Schema Checker — Free JSON-LD & Structured Data Validator",
  description:
    "Free schema checker: paste any URL to extract every JSON-LD block, validate the JSON, list schema types and test required fields for Article, Product, FAQPage, Organization and more.",
  keywords: ["schema checker", "structured data tester", "json-ld validator", "schema markup checker", "rich results test"],
  alternates: { canonical: "https://frinjo.me/schema-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Schema Checker | WebStore Pro",
    description: "Extract and validate the structured data on any page — JSON-LD blocks, schema types and required-field checks, free.",
    url: "https://frinjo.me/schema-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "schema-checker",
        name: "Schema Checker",
        tool: "schema",
        tagline: "Extract and validate the structured data on any page",
        intro:
          "Structured data is how you tell Google — and AI search engines — exactly what a page is: an article, a product, a local business, an FAQ. This checker pulls every JSON-LD block out of the live page, verifies it parses, lists the schema types and tests the required fields for each type.",
        checksTitle: "What does the Schema Checker validate?",
        checksSub: "Presence, validity, and whether each schema type carries the fields rich results need.",
        cards: [
          { title: "JSON-LD extraction & validity", desc: "Every application/ld+json block on the page is extracted and parsed. One invalid block is silently ignored by Google — this checker catches it." },
          { title: "Types & required fields", desc: "Article needs a headline, FAQPage needs mainEntity, Product needs a name, Event needs a startDate. Each detected type is tested against its requirements." },
          { title: "Microdata scan", desc: "Schema.org microdata (itemscope/itemtype) is checked too, so pages using the older format aren't missed." },
        ],
        faqs: [
          ["What schema does my page need?", "It depends on the page: Article or BlogPosting for posts, Product for product pages, LocalBusiness for local services, FAQPage for Q&A content, BreadcrumbList almost everywhere."],
          ["Why does invalid JSON-LD matter?", "Search engines discard malformed structured data without telling you. The page looks fine to humans while its rich-result eligibility quietly disappears."],
          ["Is JSON-LD better than microdata?", "Google recommends JSON-LD because it is easier to maintain and less likely to break when the page design changes. Either can work if it is valid."],
        ],
      }}
    />
  );
}
