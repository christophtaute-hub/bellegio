import { describe, expect, it } from "vitest";
import { endetBald, istLaufendOderGeplant, istUeberfaellig, parseLinks, summiere, tageBis } from "@/lib/marketing/kampagne";

describe("parseLinks", () => {
  it("nimmt nur http/https, entfernt Leerzeilen und Dubletten, meldet Ungültiges", () => {
    const r = parseLinks("https://example.com/a\n\n  https://example.com/a \nftp://x.de\nkeinlink\nhttp://b.de");
    expect(r.links).toEqual(["https://example.com/a", "http://b.de/"]);
    expect(r.ungueltig).toEqual(["ftp://x.de", "keinlink"]);
  });
});

describe("Kampagnenfristen", () => {
  const heute = "2026-10-19";
  it("tageBis", () => {
    expect(tageBis("2026-10-26", heute)).toBe(7);
    expect(tageBis("2026-10-18", heute)).toBe(-1);
  });
  it("endet bald: nur aktive, innerhalb der Frist (heute zählt)", () => {
    expect(endetBald({ status: "aktiv", ende: "2026-10-26" }, heute, 7)).toBe(true);
    expect(endetBald({ status: "aktiv", ende: "2026-10-27" }, heute, 7)).toBe(false);
    expect(endetBald({ status: "aktiv", ende: "2026-10-19" }, heute, 7)).toBe(true);
    expect(endetBald({ status: "aktiv", ende: "2026-10-18" }, heute, 7)).toBe(false);
    expect(endetBald({ status: "pausiert", ende: "2026-10-20" }, heute, 7)).toBe(false);
  });
  it("überfällig: aktive mit abgelaufenem Ende, geplante mit vergangenem Beginn, fälliger nächster Schritt", () => {
    expect(istUeberfaellig({ status: "aktiv", ende: "2026-10-01", beginn: null, schrittFaellig: null }, heute)).toBe(true);
    expect(istUeberfaellig({ status: "geplant", ende: null, beginn: "2026-10-10", schrittFaellig: null }, heute)).toBe(true);
    expect(istUeberfaellig({ status: "aktiv", ende: "2026-12-01", beginn: null, schrittFaellig: "2026-10-18" }, heute)).toBe(true);
    expect(istUeberfaellig({ status: "beendet", ende: "2026-10-01", beginn: null, schrittFaellig: "2026-10-01" }, heute)).toBe(false);
    expect(istUeberfaellig({ status: "aktiv", ende: "2026-12-01", beginn: null, schrittFaellig: null }, heute)).toBe(false);
  });
  it("laufend oder geplant", () => {
    expect(["geplant", "aktiv", "pausiert"].every((s) => istLaufendOderGeplant({ status: s as never }))).toBe(true);
    expect(istLaufendOderGeplant({ status: "beendet" })).toBe(false);
  });
  it("Summen", () => {
    expect(summiere([{ budget: 500, kosten: 120 }, { budget: null, kosten: 30 }])).toEqual({ budget: 500, kosten: 150 });
  });
});
