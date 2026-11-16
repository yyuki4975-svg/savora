import type { Metadata } from "next";
import { HomeExperience } from "./home-experience";
import { siteUrl } from "./site-url";

export const metadata: Metadata = {
  title: { absolute: "Savora — recipes from kitchens around the world" },
  description: "Savora is a multilingual recipe and food-culture site: reviewed recipes from kitchens around the world, each with its place and its source, plus food exhibitions, a world food map and kitchen skills.",
  alternates: { canonical: "/" },
};

// Site name and search box for search results. https://developers.google.com/search/docs/appearance/site-names
function structuredData() {
  const origin = siteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${origin}/#website`, name: "Savora", alternateName: ["Cook with Savora", "cookwsavora"], url: `${origin}/`,
        inLanguage: ["en", "zh", "ja", "fr", "it", "es"],
        potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${origin}/explore?q={search_term_string}` }, "query-input": "required name=search_term_string" } },
      { "@type": "Organization", "@id": `${origin}/#organization`, name: "Savora", url: `${origin}/`, logo: `${origin}/icon.svg` },
    ],
  };
}

export default function HomePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()).replace(/</g, "\\u003c") }} />
    <HomeExperience />
  </>;
}
