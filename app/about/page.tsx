import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `About — ${SITE_NAME}`,
  description: `${SITE_NAME} is a free, no-account, no-ads map of every publicly-reported rat sighting, inspection, and 311 complaint in NYC.`,
};

const REPO_URL = "https://github.com/mikebatts/ratmap";

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="text-sm font-medium text-gray-500 hover:text-ink"
      >
        ← Back to the map
      </Link>

      <h1 className="mt-8 font-display text-3xl font-bold text-ink">
        About {SITE_NAME}
      </h1>

      <div className="mt-6 space-y-5 text-lg leading-relaxed text-ink">
        <p>
          {SITE_NAME} is a free, no-account, no-ads map of every
          publicly-reported rat sighting, inspection, and 311 complaint in New
          York City.
        </p>
        <p>
          Built by{" "}
          <a
            href="https://x.com/mikebatts_"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-ink underline decoration-hotdog decoration-2 underline-offset-2"
          >
            @mikebatts_
          </a>{" "}
          on X.
        </p>
        <p className="text-base text-gray-600">
          Data from NYC Open Data (311 Service Requests) and DOHMH (Rodent
          Inspection). Updated daily.
        </p>
        <p className="text-base text-gray-600">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Source code
          </a>{" "}
          is open source.
        </p>
      </div>
    </main>
  );
}
