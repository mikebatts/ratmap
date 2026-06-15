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

/** Bare hostname, used as the wordmark in the UI (e.g. "ratmap.nyc"). */
export const SITE_NAME = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "ratmap.nyc";
  }
})();
