// Formatting for NYC GeoSearch results, which come back SHOUTING and without
// ordinal suffixes — e.g. "20 WEST 34 STREET" → "20 West 34th Street".

// Tokens that should stay uppercase rather than being title-cased.
const ACRONYMS = new Set([
  "FDR",
  "JFK",
  "RFK",
  "MLK",
  "NY",
  "NYC",
  "US",
  "PS",
  "IS",
  "MS",
  "JHS",
  "II",
  "III",
  "IV",
  "N",
  "S",
  "E",
  "W",
  "NE",
  "NW",
  "SE",
  "SW",
]);

// Small words kept lowercase unless they lead the name ("Avenue of the Americas").
const MINOR = new Set(["of", "the", "and", "at", "on", "for", "to", "by"]);

/** English ordinal suffix: 1→1st, 2→2nd, 3→3rd, 11→11th, 22→22nd … */
export function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function capitalize(word: string): string {
  // Capitalize each hyphen-separated part (e.g. "bedford-stuyvesant").
  return word
    .split("-")
    .map((part) =>
      part.length ? part.charAt(0).toUpperCase() + part.slice(1) : part,
    )
    .join("-");
}

function formatWord(word: string, isFirst: boolean): string {
  if (!word) return word;
  const upper = word.toUpperCase();
  if (ACRONYMS.has(upper)) return upper;
  // A bare integer in a street name is an ordinal: "34" → "34th", "3" → "3rd".
  if (/^\d+$/.test(word)) return ordinal(parseInt(word, 10));
  const lower = word.toLowerCase();
  if (!isFirst && MINOR.has(lower)) return lower;
  return capitalize(lower);
}

/** Title-case a street name and add ordinal suffixes to numbered streets. */
export function formatStreet(street: string): string {
  return street
    .trim()
    .split(/\s+/)
    .map((w, i) => formatWord(w, i === 0))
    .join(" ");
}

/**
 * Build a clean, human address line. Prefers GeoSearch's structured fields
 * (house number kept verbatim — handles Queens "145-03"; street formatted),
 * falling back to parsing the full `name` when structured fields are absent.
 */
export function formatAddress(opts: {
  housenumber?: string | null;
  street?: string | null;
  name?: string | null;
}): string {
  const house = opts.housenumber?.trim();
  const street = opts.street?.trim();

  if (street) {
    const s = formatStreet(street);
    return house ? `${house} ${s}` : s;
  }

  const name = opts.name?.trim();
  if (!name) return "";

  // No structured street: treat a leading house-number-like token (contains a
  // digit, with 2+ tokens total) as the house number and format the rest.
  const tokens = name.split(/\s+/);
  if (tokens.length >= 2 && /\d/.test(tokens[0])) {
    return `${tokens[0]} ${formatStreet(tokens.slice(1).join(" "))}`;
  }
  return formatStreet(name);
}
