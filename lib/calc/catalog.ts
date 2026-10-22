import raw from "@/data/etalon-catalog.json";

export type CatalogEntry = {
  id: string; icone: string; nom: string; calculateur: "pipette" | "pt100" | "direct" | null;
  norme: string; compatibilite: string; conditions: string[]; demarche: string[];
};

export const CATALOG = raw as CatalogEntry[];
export const catalogById = (id: string): CatalogEntry | undefined => CATALOG.find((c) => c.id === id);
