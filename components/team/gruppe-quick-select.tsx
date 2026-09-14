"use client";

import { useState, useTransition } from "react";
import { updateTeamGruppe } from "@/lib/actions/team";
import { cn } from "cn";

const SELECT_CLASS =
  "h-7 rounded-md border border-input bg-transparent px-1.5 text-sm dark:bg-input/30";

export function GruppeQuickSelect({
  teamId,
  gruppeId,
  gruppen,
  canEdit,
}: {
  teamId: string;
  gruppeId: string | null;
  gruppen: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [value, setValue] = useState(gruppeId ?? "");
  const [isPending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <span className="text-muted-foreground">
        {gruppen.find((g) => g.id === gruppeId)?.name ?? "–"}
      </span>
    );
  }

  return (
    <select
      className={cn(SELECT_CLASS, isPending && "opacity-50")}
      value={value}
      disabled={isPending}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        startTransition(async () => {
          await updateTeamGruppe(teamId, next || null);
        });
      }}
    >
      <option value="">Keine (z.B. Leitung)</option>
      {gruppen.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  );
}
