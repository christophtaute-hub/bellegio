import { cn } from "cn";

/** Gerätefenster für Produkt-Mockups. Beispieldaten sind sichtbar als solche gekennzeichnet. */
export function BrowserFrame({
  titel,
  children,
  className,
}: {
  titel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-black/10 bg-background text-foreground shadow-[0_30px_80px_-30px_rgba(0,40,50,0.35)]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-black/5 bg-secondary/70 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="mx-auto truncate text-xs text-muted-foreground">{titel}</span>
        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-medium text-foreground/70">
          Beispieldaten
        </span>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
  );
}
