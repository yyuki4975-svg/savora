// Public origin for sitemap/robots. Set SAVORA_SITE_URL at build time; defaults to the registered domain.
export function siteUrl() {
  const configured = process.env.SAVORA_SITE_URL?.trim();
  const url = new URL(configured || "https://cookwsavora.com");
  return url.origin;
}
