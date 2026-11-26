import SeoToolPage from "@/components/SeoToolPage";

export const metadata = {
  title: "Image SEO Checker — Alt Text, Formats & Dimensions Audit",
  description:
    "Free image SEO checker: audit every image on a page — alt text coverage, WebP/AVIF formats, lazy loading and width/height attributes that prevent layout shift.",
  keywords: ["image seo checker", "alt text checker", "image alt checker", "webp checker", "image optimization test"],
  alternates: { canonical: "https://frinjo.me/image-seo-checker" },
  openGraph: {
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: "WebStore Pro — Frinjo" }],
    title: "Image SEO Checker | WebStore Pro",
    description: "Audit every image on any page: alt text, modern formats, lazy loading and dimensions — listed image by image.",
    url: "https://frinjo.me/image-seo-checker",
    type: "website",
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ url?: string }> }) {
  const { url } = await searchParams;
  return (
    <SeoToolPage
      initialUrl={url ?? ""}
      cfg={{
        slug: "image-seo-checker",
        name: "Image SEO Checker",
        tool: "images",
        tagline: "Every image on the page, audited one by one",
        intro:
          "Images are often the heaviest — and least optimised — part of a page. This checker lists every image on the URL you enter and audits the signals that matter: alt text for accessibility and image search, modern WebP/AVIF formats for weight, lazy loading, and the width/height attributes that stop layout shift.",
        checksTitle: "What does the Image SEO Checker audit?",
        checksSub: "Alt text, formats, loading behaviour and dimensions — per image, not just in aggregate.",
        cards: [
          { title: "Alt text coverage", desc: "Images missing the alt attribute are flagged individually. Alt text is how search engines 'see' an image — and how screen readers describe it." },
          { title: "Formats & weight signals", desc: "WebP and AVIF typically cut 25–50% versus JPEG/PNG at the same quality. The checker counts how many images still use legacy formats." },
          { title: "Loading & layout stability", desc: "Lazy loading for below-the-fold images, and width/height attributes so the page doesn't jump around while images load (CLS)." },
        ],
        faqs: [
          ["Should every image have alt text?", "Every informative image, yes — describe what it shows. Purely decorative images should have an empty alt attribute (alt=\"\") so screen readers skip them."],
          ["Does the hero image need lazy loading?", "No — the opposite. Lazy-loading the hero (LCP) image delays the largest paint. Lazy-load below-the-fold images only."],
          ["Why do width and height attributes matter?", "They let the browser reserve the right space before the image loads, preventing Cumulative Layout Shift — a Core Web Vitals ranking factor."],
        ],
      }}
    />
  );
}
