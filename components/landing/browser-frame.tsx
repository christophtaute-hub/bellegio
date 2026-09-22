import { cn } from "cn";

/** Rahmen für ein echtes App-Bildschirmfoto: rundet und rahmt das Bild, "Beispieldaten" bleibt als Hinweis
 * sichtbar — die Screenshots zeigen bereits die eigene Navigation der App, ein zusätzliches nachgebautes
 * Fensterchrome (Ampel-Punkte, Titelzeile) würde das nur verdoppeln. */
export function BrowserFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-black/10 bg-background text-foreground shadow-[0_30px_80px_-30px_rgba(0,40,50,0.35)]",
        className
      )}
    >
      {children}
      <span className="absolute top-3 right-3 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-foreground/70 shadow-sm backdrop-blur">
        Beispieldaten
      </span>
    </div>
  );
}
