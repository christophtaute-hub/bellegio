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
    <Card className={cn("border-0 bg-secondary/60 py-6 shadow-none", className)}>
      <CardContent className="flex items-center gap-4 px-6">
        {Icon ? (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Icon className="size-5" />
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
      </CardContent>
    </Card>
  );
}
