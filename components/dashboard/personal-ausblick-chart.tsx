"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type AusblickPunkt = {
  label: string;
  ist: number;
  bedarf: number;
  /** Fehlende Wochenstunden — als rote Fläche über dem vorhandenen Personal. */
  luecke: number;
};

const stunden = (wert: unknown) => `${Math.round(Number(wert)).toLocaleString("de-DE")} Std.`;

/** Vorhandenes Personal (Fläche) gegen den Bedarf (gestrichelte Linie); wo der Bedarf höher liegt, färbt sich
 * die Lücke rot. Die Achse beginnt nicht bei 0, sonst wäre eine Lücke von wenigen Stunden nicht zu sehen. */
export function PersonalAusblickChart({ daten }: { daten: AusblickPunkt[] }) {
  if (daten.length === 0) return null;
  // Bei gestapelten Flächen liegt der kleinste Datenwert immer bei 0 — die Achse wird deshalb aus den echten
  // Werten (Personal und Bedarf) berechnet, damit auch kleine Lücken sichtbar sind.
  const werte = daten.flatMap((d) => [d.ist, d.bedarf]);
  const untergrenze = Math.max(0, Math.floor((Math.min(...werte) * 0.85) / 10) * 10);
  const obergrenze = Math.ceil((Math.max(...werte) * 1.05) / 10) * 10;
  return (
    <div className="h-56 w-full" role="img" aria-label="Verlauf von vorhandenem Personal und Personalbedarf in Wochenstunden">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={daten} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            domain={[untergrenze, obergrenze]}
            allowDataOverflow
            tickFormatter={(v) => String(Math.round(Number(v)))}
          />
          <Tooltip
            formatter={(value, name) => [stunden(value), name]}
            contentStyle={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--popover)",
              color: "var(--popover-foreground)",
              fontSize: 13,
            }}
          />
          <Area type="stepAfter" dataKey="ist" name="Vorhandenes Personal" stackId="p" stroke="var(--primary)" strokeWidth={2} fill="var(--primary)" fillOpacity={0.12} isAnimationActive={false} />
          <Area type="stepAfter" dataKey="luecke" name="Es fehlen" stackId="p" stroke="none" fill="var(--destructive)" fillOpacity={0.35} isAnimationActive={false} />
          <Line type="stepAfter" dataKey="bedarf" name="Bedarf" stroke="var(--foreground)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
