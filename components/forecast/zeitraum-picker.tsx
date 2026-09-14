import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ZeitraumPicker({
  basePath,
  vonMonth,
  monthCount,
  kitajahrStartIso,
  letztesKalenderjahrIso,
}: {
  basePath: string;
  vonMonth: string;
  monthCount: number;
  kitajahrStartIso: string;
  letztesKalenderjahrIso: string;
}) {
  const isKitajahr = vonMonth === kitajahrStartIso && monthCount === 12;
  const isLetztesJahr = vonMonth === letztesKalenderjahrIso && monthCount === 12;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={isKitajahr ? "default" : "secondary"}
          size="sm"
          nativeButton={false}
          render={<Link href={`${basePath}?von=${kitajahrStartIso}&monate=12`} />}
        >
          Aktuelles Kitajahr
        </Button>
        <Button
          variant={isLetztesJahr ? "default" : "secondary"}
          size="sm"
          nativeButton={false}
          render={
            <Link href={`${basePath}?von=${letztesKalenderjahrIso}&monate=12`} />
          }
        >
          Letztes Kalenderjahr
        </Button>
      </div>
      <form method="get" action={basePath} className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="von" className="text-xs text-muted-foreground">
            Von (Monat)
          </label>
          <Input
            key={vonMonth}
            id="von"
            name="von"
            type="date"
            defaultValue={vonMonth}
            className="h-8 w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="monate" className="text-xs text-muted-foreground">
            Monate
          </label>
          <Input
            key={monthCount}
            id="monate"
            name="monate"
            type="number"
            min={1}
            max={24}
            defaultValue={monthCount}
            className="h-8 w-20"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          Anzeigen
        </Button>
      </form>
    </div>
  );
}
