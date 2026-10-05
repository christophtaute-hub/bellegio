import { cn } from "cn";

/** Ring im Stil der Apple-Aktivitätsringe: Spur, Füllung, Zahl in der Mitte. `anteil` 0–1 (mehr als 1 = voll). */
export function Ring({
  anteil,
  farbe,
  groesse = 148,
  strich = 14,
  children,
  beschreibung,
}: {
  anteil: number;
  /** Tailwind-Textfarbe für die Füllung, z. B. „text-emerald-500“. */
  farbe: string;
  groesse?: number;
  strich?: number;
  children: React.ReactNode;
  beschreibung: string;
}) {
  const radius = (groesse - strich) / 2;
  const umfang = 2 * Math.PI * radius;
  const gefuellt = Math.min(1, Math.max(0, anteil));
  return (
    <div className="relative shrink-0" style={{ width: groesse, height: groesse }} role="img" aria-label={beschreibung}>
      <svg width={groesse} height={groesse} viewBox={`0 0 ${groesse} ${groesse}`} className="-rotate-90">
        <circle cx={groesse / 2} cy={groesse / 2} r={radius} fill="none" strokeWidth={strich} className="stroke-secondary" />
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={radius}
          fill="none"
          strokeWidth={strich}
          strokeLinecap="round"
          strokeDasharray={`${umfang * gefuellt} ${umfang}`}
          className={cn("stroke-current transition-[stroke-dasharray] duration-500", farbe)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
