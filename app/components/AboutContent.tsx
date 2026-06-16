import { SITE_WORDMARK } from "@/lib/site";

const REPO_URL = "https://github.com/mikebatts/ratmap";

/**
 * The About copy, shared by the in-app modal (over the map) and the /about
 * route. Pure markup — no hooks — so it works in either a client or server
 * parent. Includes the basemap attribution that used to sit on the map.
 */
export default function AboutContent() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold text-content">
        <span aria-hidden="true">🐭</span> {SITE_WORDMARK}
      </h1>

      <div className="mt-6 space-y-5 text-lg leading-relaxed text-content">
        <p>
          A free, no-account, no-ads map of every publicly-reported rat
          sighting, inspection, and 311 complaint in New York City. A love
          letter to the city — by a New Yorker, for New Yorkers.
        </p>
        <p>
          Built by{" "}
          <a
            href="https://x.com/mikebatts_"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-content underline decoration-accent decoration-2 underline-offset-2"
          >
            @mikebatts_
          </a>{" "}
          on X.
        </p>
      </div>

      <div className="mt-6 space-y-1.5 border-t border-hairline pt-5 text-sm text-content-muted">
        <p>
          Rat data from{" "}
          <a
            href="https://opendata.cityofnewyork.us/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-accent/60 underline-offset-2 hover:text-content"
          >
            NYC Open Data
          </a>{" "}
          (311 Service Requests) and DOHMH (Rodent Inspection). Updated daily.
        </p>
        <p>
          Basemap ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-accent/60 underline-offset-2 hover:text-content"
          >
            OpenStreetMap
          </a>{" "}
          contributors, tiles by{" "}
          <a
            href="https://openfreemap.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-accent/60 underline-offset-2 hover:text-content"
          >
            OpenFreeMap
          </a>
          .
        </p>
        <p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-accent/60 underline-offset-2 hover:text-content"
          >
            Open source
          </a>{" "}
          · MIT.
        </p>
      </div>
    </>
  );
}
