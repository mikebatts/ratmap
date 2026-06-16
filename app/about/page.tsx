import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import AboutContent from "../components/AboutContent";

export const metadata: Metadata = {
  title: `About — ${SITE_NAME}`,
  description: `${SITE_NAME} is a free, no-account, no-ads map of every publicly-reported rat sighting, inspection, and 311 complaint in NYC.`,
};

// Standalone /about route (for direct links / SEO). In-app, the About button
// opens the same content as a glass modal over the map.
export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center px-6 py-16">
      <div className="glass-strong rounded-3xl p-8 sm:p-10">
        <Link
          href="/"
          className="text-sm font-medium text-content-muted transition-colors hover:text-content"
        >
          ← Back to the map
        </Link>
        <div className="mt-8">
          <AboutContent />
        </div>
      </div>
    </main>
  );
}
