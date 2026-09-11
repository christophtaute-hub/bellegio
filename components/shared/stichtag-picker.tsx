import Link from "next/link";
import { addMonthsUtc, toIsoDateString } from "@/lib/kita-datum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

const PRESETS = [
  { label: "Heute", months: 0 },
  { label: "+3 Monate", months: 3 },
  { label: "+6 Monate", months: 6 },
  { label: "+12 Monate", months: 12 },
  { label: "+18 Monate", months: 18 },
] as const;

export function StichtagPicker({
  basePath,
  stichtag,
}: {
  basePath: string;
  stichtag: string;
}) {
  const today = new Date();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const presetDate = toIsoDateString(addMonthsUtc(today, preset.months));
          const isActive = presetDate === stichtag;
          return (
            <Button
              key={preset.label}
              variant={isActive ? "default" : "secondary"}
              size="sm"
              nativeButton={false}
              render={<Link href={`${basePath}?stichtag=${presetDate}`} />}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
      <form
        method="get"
        action={basePath}
        className={cn("flex items-end gap-2")}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="stichtag" className="text-xs text-muted-foreground">
            Stichtag
          </label>
          <Input
            key={stichtag}
            id="stichtag"
            name="stichtag"
            type="date"
            defaultValue={stichtag}
            className="h-8 w-40"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Anzeigen
        </Button>
      </form>
    </div>
  );
}
