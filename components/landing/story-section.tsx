import { Reveal } from "@/components/landing/reveal";
import { cn } from "cn";

/** Apple-artige Story-Sektion: Text bleibt beim Scrollen kleben, die Mockups
 * ziehen daneben vorbei. */
export function StorySection({
  id,
  eyebrow,
  titel,
  text,
  punkte,
  mockups,
  hintergrund = "hell",
  spiegeln = false,
}: {
  id?: string;
  eyebrow: string;
  titel: string;
  text: string;
  punkte: string[];
  mockups: React.ReactNode[];
  hintergrund?: "hell" | "getoent";
  spiegeln?: boolean;
}) {
  return (
    <section id={id} className={cn("scroll-mt-16 py-20 md:py-32", hintergrund === "getoent" && "bg-secondary/50")}>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        <div className={cn("flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start", spiegeln && "lg:order-2")}>
          <Reveal>
            <p className="text-sm font-medium tracking-wide text-primary uppercase">{eyebrow}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="font-heading text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
              {titel}
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <p className="max-w-md text-lg text-muted-foreground">{text}</p>
          </Reveal>
          <Reveal delay={240}>
            <ul className="flex flex-col gap-2.5 text-sm">
              {punkte.map((punkt) => (
                <li key={punkt} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{punkt}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <div className={cn("flex flex-col gap-8", spiegeln && "lg:order-1")}>
          {mockups.map((mockup, i) => (
            <Reveal key={i} delay={i * 80}>
              {mockup}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
