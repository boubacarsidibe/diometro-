import type { MetadataRoute } from "next";

const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Seules les pages publiques d'information sont indexables ; l'application, les exports et les fiches QR ne le sont jamais.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/mentions-legales", "/cgu", "/confidentialite"], disallow: ["/p/", "/api/", "/export/", "/auth/", "/dashboard", "/instruments", "/prestataires", "/inventaire", "/planning", "/alerts", "/audit", "/users", "/admin", "/parametres", "/etalonnage", "/etiquettes", "/corbeille"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
