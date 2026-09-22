import type { MetadataRoute } from "next";

const BASE_URL = "https://bellegio.de";

/** Nur die öffentlichen, ohne Login erreichbaren Seiten — alles hinter der Anmeldung gehört nicht in eine
 * öffentliche Sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const seiten: { pfad: string; prioritaet: number } = { pfad: "/", prioritaet: 1 };
  const rechtstexte = ["/impressum", "/datenschutz", "/agb", "/avv", "/tom", "/unterauftragnehmer"];
  return [
    { url: `${BASE_URL}${seiten.pfad}`, changeFrequency: "weekly", priority: seiten.prioritaet },
    ...rechtstexte.map((pfad) => ({
      url: `${BASE_URL}${pfad}`,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];
}
