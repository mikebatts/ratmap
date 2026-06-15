import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

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
  title: "Rats.nyc — NYC's rat map. No fluff.",
  description:
    "A free, no-account, no-ads map of every publicly-reported rat sighting, inspection, and 311 complaint in New York City. Data from NYC Open Data, updated daily.",
  metadataBase: new URL("https://rats.nyc"),
  openGraph: {
    title: "Rats.nyc — NYC's rat map. No fluff.",
    description:
      "Every publicly-reported rat sighting, inspection, and 311 complaint in NYC, on a fast map. Free, no account, no ads.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F5C518",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
