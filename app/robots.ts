import { siteUrl } from "./site-url";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/moderation", "/admin/", "/phase-3/", "/library", "/account/", "/profile", "/settings"] }, sitemap: `${siteUrl()}/sitemap.xml` };
}
