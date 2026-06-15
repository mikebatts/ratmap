import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// Branded Open Graph / social card. 1200x630, dark backdrop, hot-dog-yellow
// wordmark. Rendered on demand by next/og.
export const runtime = "edge";
export const alt = `${SITE_NAME} — NYC's rat map`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HOTDOG = "#F5C518";
const INK = "#1A1A1A";

// Pull Space Grotesk Bold for the wordmark. Returns null on any failure so the
// image still renders with the default font rather than 500-ing.
async function loadSpaceGrotesk(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700",
      // A UA without woff2 support makes Google serve a plain TTF, which
      // ImageResponse can consume.
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; OG)" } },
    ).then((r) => (r.ok ? r.text() : ""));
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const font = await loadSpaceGrotesk();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: INK,
          padding: "72px 80px",
          fontFamily: font ? "Space Grotesk" : "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 9999,
              backgroundColor: HOTDOG,
            }}
          />
          <div style={{ fontSize: 88, fontWeight: 700, color: HOTDOG, lineHeight: 1 }}>
            {SITE_NAME}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 40,
            lineHeight: 1.25,
            color: "#FFFFFF",
            maxWidth: 940,
          }}
        >
          Every publicly-reported rat sighting, inspection, and 311 complaint in
          NYC. On a fast map.
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#9CA3AF" }}>
          Data from NYC Open Data · Free · No account · No ads
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font
        ? [{ name: "Space Grotesk", data: font, weight: 700, style: "normal" }]
        : undefined,
    },
  );
}
