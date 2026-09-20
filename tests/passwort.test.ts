import { describe, expect, it } from "vitest";
import { PASSWORT_MIN_LAENGE, pruefePasswort } from "@/lib/passwort";

describe("pruefePasswort", () => {
  it("lehnt zu kurze Passwörter ab", () => {
    expect(pruefePasswort("a".repeat(PASSWORT_MIN_LAENGE - 1))).toMatch(/mindestens/);
  });

  it("akzeptiert ein Passwort ab der Mindestlänge", () => {
    expect(pruefePasswort("Kita-Sonne-2026")).toBeNull();
  });

  it("lehnt bekannte Allerweltspasswörter ab, auch in Großschreibung", () => {
    expect(pruefePasswort("Passwort123")).toMatch(/leicht zu erraten/);
    expect(pruefePasswort("1234567890")).toMatch(/leicht zu erraten/);
  });

  it("lehnt ein Passwort aus nur einem Zeichen ab", () => {
    expect(pruefePasswort("x".repeat(12))).toMatch(/demselben Zeichen/);
  });
});
