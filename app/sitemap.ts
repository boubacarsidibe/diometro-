import type { MetadataRoute } from "next";

const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/register", "/login", "/mentions-legales", "/cgu", "/confidentialite"].map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly", priority: path === "/" ? 1 : 0.5 }));
}
