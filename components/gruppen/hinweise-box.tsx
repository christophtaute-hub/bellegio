import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/kita-datum";

export type HinweisEintrag = {
  id: string;
  name: string;
  grund: string;
  datum: string;
};

export function HinweiseBox({ eintraege }: { eintraege: HinweisEintrag[] }) {
  if (eintraege.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 border-destructive/50 bg-destructive/5 p-4">
      <h2 className="flex items-center gap-2 font-heading text-lg text-destructive">
        <AlertTriangle className="size-5" aria-hidden />
        Bald handeln
      </h2>
      <ul className="flex flex-col gap-1.5">
        {eintraege.map((eintrag) => (
          <li key={eintrag.id} className="text-sm">
            <Link
              href={`/kinder/${eintrag.id}`}
              className="font-medium underline-offset-2 hover:underline"
            >
              {eintrag.name}
            </Link>
            {" — "}
            {eintrag.grund} am {formatDate(eintrag.datum)}
          </li>
        ))}
      </ul>
    </section>
  );
}
