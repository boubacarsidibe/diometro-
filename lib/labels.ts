// Couleur de bandeau par bâtiment, partagée par l'impression des étiquettes et l'export Word.
export const LABEL_COLORS = ["#1d4ed8", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#be185d", "#4d7c0f"];
export const NO_BUILDING = "Sans bâtiment";
export const NO_BUILDING_COLOR = "#64748b";

export function buildingColors(buildings: string[]): (b: string) => string {
  const list = [...new Set(buildings.map((b) => b || NO_BUILDING))].sort((a, b) => a.localeCompare(b, "fr"));
  return (b: string) => (!b || b === NO_BUILDING ? NO_BUILDING_COLOR : LABEL_COLORS[list.indexOf(b) % LABEL_COLORS.length]);
}
