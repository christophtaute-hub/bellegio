import { describe, expect, it } from "vitest";
import { berechneSitzplaetze, findePlatzVonKindId, bestimmeBelegungsStatus } from "@/lib/gruppen/sitzplaetze";

type TestKind = { id: string; name: string };

describe("berechneSitzplaetze", () => {
  it("füllt Plätze der Reihe nach und lässt den Rest leer", () => {
    const kinder: TestKind[] = [
      { id: "a", name: "Anna" },
      { id: "b", name: "Ben" },
    ];
    const zeilen = berechneSitzplaetze(5, kinder);
    expect(zeilen).toEqual([
      { platz: 1, kind: kinder[0] },
      { platz: 2, kind: kinder[1] },
      { platz: 3, kind: null },
      { platz: 4, kind: null },
      { platz: 5, kind: null },
    ]);
  });

  it("volle Gruppe: keine freien Plätze", () => {
    const kinder: TestKind[] = [{ id: "a", name: "Anna" }, { id: "b", name: "Ben" }];
    expect(berechneSitzplaetze(2, kinder).every((z) => z.kind !== null)).toBe(true);
  });

  it("mehr Kinder als Sollplätze: alle bekommen einen Platz, auch über die Sollplätze hinaus", () => {
    const kinder: TestKind[] = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }];
    const zeilen = berechneSitzplaetze(2, kinder);
    expect(zeilen).toHaveLength(3);
    expect(zeilen[2]).toEqual({ platz: 3, kind: kinder[2] });
  });

  it("keine Kinder: alle Plätze frei", () => {
    const zeilen = berechneSitzplaetze(3, [] as TestKind[]);
    expect(zeilen.every((z) => z.kind === null)).toBe(true);
    expect(zeilen).toHaveLength(3);
  });
});

describe("findePlatzVonKindId", () => {
  const zeilen = berechneSitzplaetze<TestKind>(3, [{ id: "a", name: "A" }, { id: "b", name: "B" }]);

  it("findet den Platz eines belegten Kindes", () => {
    expect(findePlatzVonKindId(zeilen, "b")).toBe(2);
  });

  it("gibt null zurück, wenn das Kind keinen Platz (mehr) hat", () => {
    expect(findePlatzVonKindId(zeilen, "unbekannt")).toBeNull();
  });

  it("gibt null zurück ohne kindId", () => {
    expect(findePlatzVonKindId(zeilen, null)).toBeNull();
  });
});

describe("bestimmeBelegungsStatus", () => {
  it("weniger Kinder als Sollplätze: frei", () => {
    expect(bestimmeBelegungsStatus(10, 7)).toBe("frei");
  });

  it("genau so viele Kinder wie Sollplätze: voll", () => {
    expect(bestimmeBelegungsStatus(10, 10)).toBe("voll");
  });

  it("mehr Kinder als Sollplätze: ueberbelegt", () => {
    expect(bestimmeBelegungsStatus(10, 11)).toBe("ueberbelegt");
  });

  it("keine Sollplätze und keine Kinder: voll (0 == 0)", () => {
    expect(bestimmeBelegungsStatus(0, 0)).toBe("voll");
  });
});
