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

  return `
    <div style="padding:14px 16px;max-width:280px;font-size:13px;line-height:1.45;color:#1a1a1a;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${meta.color};"></span>
        <strong style="font-size:14px;">${esc(meta.label)}</strong>
      </div>
      <div style="color:#444;margin-bottom:8px;">${esc(meta.description)}</div>
      <div style="font-weight:600;">${addr}${boro}</div>
      <div style="color:#666;margin-bottom:8px;">${formatDate(p.observed_at)}</div>
      ${
        p.detail
          ? `<div style="color:#666;font-style:italic;margin-bottom:8px;">"${esc(
              p.detail,
            )}"</div>`
          : ""
      }
      ${
        src
          ? `<a href="${src.href}" target="_blank" rel="noopener noreferrer"
               style="color:#1971C2;text-decoration:underline;font-size:12px;">
               View source: ${esc(src.label)} ↗
             </a>`
          : ""
      }
    </div>
  `;
}
