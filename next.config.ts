import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Import Excel du parc : fichiers jusqu'à 5 Mo (limite par défaut des actions serveur : 1 Mo).
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  reactStrictMode: true,
  // Dev uniquement : permet d'ouvrir l'application par l'IP du réseau local (ex. 192.168.56.1)
  // en plus de localhost, sinon la page ne s'anime pas (hydratation bloquée).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  async headers() {
    return [
      {
        // Partout sauf l'aperçu des pièces jointes, qui doit pouvoir s'afficher dans la fenêtre « Aperçu » du site.
        source: "/:path((?!api/attachments/[^/]+/view$).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        source: "/api/attachments/:id/view",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default config;
