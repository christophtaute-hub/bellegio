import { Badge } from "@/components/ui/badge";
import { RECHNUNG_STATUS_LABEL } from "@/lib/admin/abrechnung";
import { cn } from "cn";

const TON: Record<string, string> = {
  entwurf: "bg-secondary text-secondary-foreground",
  versendet: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  bezahlt: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  storniert: "bg-destructive/10 text-destructive dark:bg-destructive/20",
};

export function RechnungStatusBadge({ status }: { status: string }) {
  return <Badge className={cn("border-0", TON[status] ?? "")}>{RECHNUNG_STATUS_LABEL[status] ?? status}</Badge>;
}
