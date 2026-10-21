import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { HILFE_BASIS } from "@/lib/hilfe/links";

/** Kleiner Link unter einer Seitenüberschrift zum passenden Handbuchkapitel (`kapitel` = Dateiname ohne .md, optional mit #anker). */
export function HilfeLink({ kapitel, text = "Wie funktioniert das?" }: { kapitel: string; text?: string }) {
  return (
    <Link href={`${HILFE_BASIS}/${kapitel}`} className="flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
      <CircleHelp className="size-3.5" aria-hidden />
      {text}
    </Link>
  );
}
