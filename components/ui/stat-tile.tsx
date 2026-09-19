import { cn } from "cn";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: "default" | "warn";
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0 border-0 bg-secondary/60 py-3 shadow-none", className)}>
      <CardContent className="flex items-center gap-3 px-4">
        {Icon ? (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Icon className="size-4" />
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-xs leading-tight text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-xl leading-tight font-semibold tabular-nums whitespace-nowrap",
              tone === "warn" ? "text-destructive" : "text-primary"
            )}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
