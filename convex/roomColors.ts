/**
 * Automatisk fargetildeling for rom. Hvert rom får en fast, distinkt farge
 * utledet av romnummeret sitt – ingen manuell fargevelger. Paletten er den
 * samme som rank-grafen bruker, så fargene er konsistente på tvers av appen.
 */
export const ROOM_PALETTE = [
  "#9FE88D", // grønn
  "#70E1F8", // cyan
  "#F4C152", // gul
  "#FB6F84", // rosa-rød
  "#A78BFA", // fiolett
  "#60A5EB", // blå
  "#F471B5", // pink
  "#34D399", // smaragd
  "#FBBF24", // amber
  "#F97316", // oransje
  "#22D3EE", // himmelblå
  "#C4B5FD", // lavendel
  "#4ADE80", // lime
  "#FCA5A5", // laks
  "#93C5FD", // lyseblå
  "#6EE7B7", // mynte
];

/** Fast farge for et rom basert på romnummer (1-indeksert). */
export function roomAccentColor(roomNumber: number): string {
  const idx = Math.max(0, Math.floor(roomNumber) - 1);
  return ROOM_PALETTE[idx % ROOM_PALETTE.length];
}
