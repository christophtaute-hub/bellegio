"use client";

import type { ReactNode } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <Card className={cn("border-0 bg-secondary/60 py-6 shadow-none", className)}>
      <CardContent className="flex items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          {icon ? (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground [&_svg]:size-5">
              {icon}
            </div>
          ) : null}
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p
              className={cn(
                "text-3xl font-semibold tabular-nums",
                tone === "warn" ? "text-destructive" : "text-primary"
              )}
            >
              {value}
            </p>
          </div>
        </div>
        {chartData.length > 1 ? (
          <div className="h-12 w-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill={`url(#spark-${label})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
