// Builds the HTML for a MapLibre popup shown when a pin is clicked.
// (MapLibre popups take an HTML string / DOM node, so this is a builder rather
// than a rendered React component.)
import { CATEGORY_META, type ObservationFeature } from "@/lib/types";

const SOURCE_URL: Record<string, { label: string; href: string }> = {
  "311": {
    label: "311 Service Requests",
    href: "https://data.cityofnewyork.us/d/erm2-nwe9",
  },
  rodent_inspection: {
    label: "DOHMH Rodent Inspection",
    href: "https://data.cityofnewyork.us/d/p937-wjvj",
  },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function buildPopupHTML(f: ObservationFeature): string {
  const p = f.properties;
  const meta = CATEGORY_META[p.category];
  const src = SOURCE_URL[p.source];
  const addr = p.address ? esc(p.address) : "Address not recorded";
  const boro = p.borough ? ` · ${esc(p.borough)}` : "";

  // Colors come from CSS vars (defined in globals.css) so the popup themes
  // automatically with light/dark. Category swatch keeps its semantic hex.
  return `
    <div style="padding:16px 18px;max-width:284px;font-size:13px;line-height:1.45;color:rgb(var(--content));overflow-wrap:anywhere;">
      <div style="display:inline-flex;align-items:center;gap:7px;padding:4px 10px 4px 8px;margin-bottom:10px;border-radius:999px;background:${meta.color}1f;border:1px solid ${meta.color}55;">
        <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${meta.color};box-shadow:0 0 8px ${meta.color}cc;"></span>
        <strong style="font-size:12.5px;letter-spacing:0.01em;">${esc(meta.label)}</strong>
      </div>
      <div style="color:rgb(var(--content-muted));margin-bottom:12px;">${esc(meta.description)}</div>
      <div style="font-weight:600;font-size:14px;">${addr}</div>
      <div style="color:rgb(var(--content-muted));font-size:12px;margin-bottom:2px;">${boro ? esc(p.borough ?? "") + " · " : ""}${formatDate(p.observed_at)}</div>
      ${
        p.detail
          ? `<div style="color:rgb(var(--content-muted));font-style:italic;margin-top:8px;">"${esc(
              p.detail,
            )}"</div>`
          : ""
      }
      ${
        src
          ? `<a href="${src.href}" target="_blank" rel="noopener noreferrer"
               style="display:inline-block;margin-top:12px;color:rgb(var(--content));text-decoration:none;font-size:12px;font-weight:600;border-bottom:2px solid rgb(var(--accent));padding-bottom:1px;">
               View source: ${esc(src.label)} ↗
             </a>`
          : ""
      }
    </div>
  `;
}
