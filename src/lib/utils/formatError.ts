/**
 * Renser rå Convex server- og klientfeilmeldinger slik at brukeren kun ser en ren, forståelig feiltekst.
 */
export function formatConvexError(err: any, fallback = "Noe gikk galt. Vennligst prøv igjen."): string {
  if (!err) return fallback;

  const raw = typeof err === "string" ? err : (err.message || err.toString() || fallback);

  // 1. Let etter 'Uncaught Error: <beskjed>'
  const uncaughtMatch = raw.match(/Uncaught Error:\s*([^\n\r]+)/i);
  if (uncaughtMatch && uncaughtMatch[1]) {
    return uncaughtMatch[1]
      .replace(/\s*at handler\s*\([^\)]*\)/gi, "")
      .replace(/\s*at async handler\s*\([^\)]*\)/gi, "")
      .replace(/\s*Called by client/gi, "")
      .trim();
  }

  // 2. Let etter 'Server Error: <beskjed>'
  const serverErrorMatch = raw.match(/Server Error\s*:\s*([^\n\r]+)/i);
  if (serverErrorMatch && serverErrorMatch[1]) {
    return serverErrorMatch[1]
      .replace(/\s*at handler\s*\([^\)]*\)/gi, "")
      .replace(/\s*at async handler\s*\([^\)]*\)/gi, "")
      .replace(/\s*Called by client/gi, "")
      .trim();
  }

  // 3. Fallback: Fjern metadata-tagger som [CONVEX ...] og [Request ID: ...]
  const cleaned = raw
    .replace(/\[CONVEX [^\]]*\]/g, "")
    .replace(/\[Request ID:[^\]]*\]/g, "")
    .replace(/Server Error/gi, "")
    .replace(/Uncaught Error/gi, "")
    .replace(/\s*at handler\s*\([^\)]*\)/gi, "")
    .replace(/\s*at async handler\s*\([^\)]*\)/gi, "")
    .replace(/\s*Called by client/gi, "")
    .replace(/^[:\s\-]+/, "")
    .trim();

  return cleaned || fallback;
}
