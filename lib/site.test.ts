import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("site config", () => {
  it("uses NEXT_PUBLIC_SITE_URL when set and strips a trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ratmap.nyc/");
    vi.resetModules();
    const { SITE_URL, SITE_NAME } = await import("./site");
    expect(SITE_URL).toBe("https://ratmap.nyc");
    expect(SITE_NAME).toBe("ratmap.nyc");
  });

  it("falls back to the production domain in production", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { SITE_URL, SITE_NAME } = await import("./site");
    expect(SITE_URL).toBe("https://ratmap.nyc");
    expect(SITE_NAME).toBe("ratmap.nyc");
  });

  it("falls back to localhost in development", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { SITE_URL } = await import("./site");
    expect(SITE_URL).toBe("http://localhost:3000");
  });
});
