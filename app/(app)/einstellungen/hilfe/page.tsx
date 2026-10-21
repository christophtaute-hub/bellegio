import { HilfeMarkdown } from "@/components/hilfe/markdown";
import { ladeStartseite } from "@/lib/hilfe/kapitel";

/** Reiter „Hilfe“: das Handbuch für Laien. Die Texte liegen in docs/handbuch/ (eine Quelle für GitHub und App). */
export default async function HilfePage() {
  const start = await ladeStartseite();
  return start ? (
    <HilfeMarkdown markdown={start} />
  ) : (
    <p className="text-sm text-muted-foreground">Das Handbuch ist in dieser Installation nicht verfügbar.</p>
  );
}
