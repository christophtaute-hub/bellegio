import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="bg-primary py-20 text-primary-foreground">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 text-center">
        <h2 className="font-heading text-3xl md:text-4xl">
          Bereit, den Papierkram hinter dir zu lassen?
        </h2>
        <p className="text-primary-foreground/80">
          Melde dich an und verwalte Kinder, Gruppen und Personal an einem
          Ort.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="gap-2 bg-white text-primary hover:bg-white/90"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Jetzt anmelden
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}
