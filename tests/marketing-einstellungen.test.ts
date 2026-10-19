import { describe, expect, it } from "vitest";
import { mischeEinstellungen, STANDARD_EINSTELLUNGEN } from "@/lib/marketing/einstellungen";

describe("mischeEinstellungen", () => {
  it("ohne Zeile gelten die Standardwerte", () => {
    expect(mischeEinstellungen(null)).toEqual(STANDARD_EINSTELLUNGEN);
  });
  it("übernimmt gültige Werte, ungültige fallen auf den Standard zurück", () => {
    const e = mischeEinstellungen({
      kampagne_endet_in_tagen: 14,
      bewertung_veraltet_nach_tagen: 21,
      grenzen: { personalbedarf: [5, 10, 20], belegung: [9, 3, 1] },
      kriterien: { belegung: ["a", "b", "c", "d"], personalbedarf: ["nur", "zwei"] },
    });
    expect(e.fristen).toEqual({ kampagneEndetInTagen: 14, bewertungVeraltetNachTagen: 21 });
    expect(e.grenzen.personalbedarf).toEqual([5, 10, 20]);
    expect(e.grenzen.belegung).toEqual(STANDARD_EINSTELLUNGEN.grenzen.belegung);
    expect(e.kriterien.belegung).toEqual(["a", "b", "c", "d"]);
    expect(e.kriterien.personalbedarf).toEqual(STANDARD_EINSTELLUNGEN.kriterien.personalbedarf);
  });
});
