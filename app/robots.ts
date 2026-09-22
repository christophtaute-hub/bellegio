import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Alles hinter dem Login (App, Betreiber-Zentrale) und interne Auth-Flows sind ohnehin nicht ohne
        // Anmeldung erreichbar — hier trotzdem explizit ausgeschlossen, damit Suchmaschinen sie gar nicht
        // erst versuchen zu crawlen.
        disallow: [
          "/dashboard",
          "/kinder",
          "/team",
          "/gruppen",
          "/controlling",
          "/szenario",
          "/einstellungen",
          "/einrichtung-auswahl",
          "/admin",
          "/abrechnung",
          "/login",
          "/passwort-vergessen",
          "/passwort-setzen",
          "/mfa",
          "/zustimmung",
        ],
      },
    ],
    sitemap: "https://bellegio.de/sitemap.xml",
  };
}
