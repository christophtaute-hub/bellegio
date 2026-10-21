import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HilfeMarkdown } from "@/components/hilfe/markdown";
import { ladeKapitel } from "@/lib/hilfe/kapitel";
import { HILFE_BASIS } from "@/lib/hilfe/links";

export default async function HilfeKapitelPage({ params }: { params: Promise<{ kapitel: string }> }) {
  const { kapitel: slug } = await params;
  const kapitel = await ladeKapitel();
  const aktuell = kapitel.find((k) => k.slug === slug);
  if (!aktuell) notFound();
  const index = kapitel.indexOf(aktuell);
  const weiter = kapitel[index + 1];

  return (
    <div className="flex flex-col gap-6">
      <Link href={HILFE_BASIS} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-3.5" aria-hidden /> Alle Kapitel
      </Link>
      <HilfeMarkdown markdown={aktuell.markdown} />
      {weiter ? (
        <Link href={`${HILFE_BASIS}/${weiter.slug}`} className="max-w-3xl rounded-xl border p-4 text-sm transition-colors hover:bg-secondary/50">
          <span className="text-xs text-muted-foreground">Weiter</span>
          <span className="block font-heading text-base text-primary">{weiter.titel}</span>
        </Link>
      ) : null}
    </div>
  );
}
