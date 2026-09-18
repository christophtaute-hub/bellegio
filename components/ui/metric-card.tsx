"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { ComposedChart, Area, Line, YAxis, ResponsiveContainer } from "recharts";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

function computeSparklineDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spanne = max - min || Math.max(Math.abs(min), 1);
  return [min - spanne * 0.15, max + spanne * 0.15];
}

export function MetricCard({
  label,
  value,
  icon,
  tone = "default",
  trend,
  className,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "warn";
  trend?: number[];
  className?: string;
}) {
  const chartData = (trend ?? []).map((v, i) => ({ i, v }));
  const strokeColor = tone === "warn" ? "var(--destructive)" : "var(--primary)";
  const domain = chartData.length > 1 ? computeSparklineDomain(trend!) : undefined;
  const istFlach = trend && trend.length > 1 && Math.min(...trend) === Math.max(...trend);

  const erster = trend?.[0];
  const letzter = trend?.[trend.length - 1];
  const hatDelta =
    trend && trend.length > 1 && erster !== undefined && letzter !== undefined;
  const delta = hatDelta ? letzter! - erster! : 0;

  return (
    <Card className={cn("min-w-0 gap-2.5 border-0 bg-secondary/60 py-4 shadow-none", className)}>
      <CardContent className="flex flex-col gap-2.5 px-4">
        <div className="flex items-center gap-2">
          {icon ? (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground [&_svg]:size-4">
              {icon}
            </div>
          ) : null}
          <p className="text-xs leading-tight text-muted-foreground">{label}</p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <p
            className={cn(
              "text-xl leading-tight font-semibold tabular-nums whitespace-nowrap",
              tone === "warn" ? "text-destructive" : "text-primary"
            )}
          >
            {value}
          </p>
          {chartData.length > 1 ? (
            <div className="h-9 w-14 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <defs>
                    <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={domain} hide />
                  {istFlach ? (
                    <Line
                      type="monotone"
                      dataKey="v"
                      stroke={strokeColor}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={strokeColor}
                      strokeWidth={2}
                      fill={`url(#spark-${label})`}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>

        {hatDelta ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {delta > 0 ? (
              <ArrowUpRight className="size-3.5" />
            ) : delta < 0 ? (
              <ArrowDownRight className="size-3.5" />
            ) : (
              <Minus className="size-3.5" />
            )}
            <span>
              {delta > 0 ? "+" : ""}
              {delta.toLocaleString("de-DE", { maximumFractionDigits: 1 })} seit
              Zeitraumbeginn
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
