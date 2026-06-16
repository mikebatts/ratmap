import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { ThemeProvider } from "./components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${SITE_NAME} — NYC's rat map. No fluff.`,
  description:
    "A free, no-account, no-ads map of every publicly-reported rat sighting, inspection, and 311 complaint in New York City. Data from NYC Open Data, updated daily.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: `${SITE_NAME} — NYC's rat map. No fluff.`,
    description:
      "Every publicly-reported rat sighting, inspection, and 311 complaint in NYC, on a fast map. Free, no account, no ads.",
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0C0F" },
  ],
};

// Runs before paint to (1) set the theme class from storage/OS — kills the flash
// of the wrong theme on reload — and (2) flag Chromium, the only engine that can
// render an SVG displacement filter inside backdrop-filter (the real Liquid Glass
// refraction). Safari/Firefox get the rich static-glass fallback instead.
const headScript = `(function(){try{var t=localStorage.getItem('ratmap-theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme:dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';var uad=navigator.userAgentData;var cr=uad?uad.brands.some(function(b){return /Chromium|Google Chrome/.test(b.brand);}):(!!window.chrome&&!/Edg|OPR|Brave/.test(navigator.userAgent)||/Chrome\\//.test(navigator.userAgent)&&!/Edg|OPR/.test(navigator.userAgent));if(cr)e.classList.add('glass-refract');}catch(e){}})();`;

// The Liquid Glass refraction filter. feTurbulence generates smooth low-frequency
// noise; feDisplacementMap uses it to bend (lens) the blurred backdrop behind the
// glass — the distortion that makes it read as a real pane of glass, not frost.
// Only applied (via .glass-refract in globals.css) where Chromium can render it.
function LiquidGlassFilter() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter
          id="liquid-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.011 0.011"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="3" result="smoothed" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="smoothed"
            scale="42"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: headScript }} />
      </head>
      <body>
        <LiquidGlassFilter />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
