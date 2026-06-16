// Canonical site identity. Swap the domain in ONE place: set
// NEXT_PUBLIC_SITE_URL in the environment (Vercel project settings or
// .env.local). Falls back to the production domain, then localhost in dev.

const DEFAULT_PROD_URL = "https://ratmap.nyc";

/** Absolute base URL for the site (no trailing slash). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production"
    ? DEFAULT_PROD_URL
    : "http://localhost:3000")
).replace(/\/$/, "");

/** Bare hostname, used for metadata/canonical URLs (e.g. "ratmap.nyc"). */
export const SITE_NAME = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "ratmap.nyc";
  }
})();

/**
 * The brand wordmark shown in the UI. This is the product's name and never the
 * deploy host, so local/preview builds still read "RATMAP.NYC" (not
 * "localhost:3000"). The 🐭 mark precedes it in the header.
 */
export const SITE_WORDMARK = "RATMAP.NYC";
