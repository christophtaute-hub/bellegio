"use client";

import Link from "next/link";
import { LogOut, Building2, Settings, User, Shield } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function UserMenu({
  fullName,
  einrichtungName,
  istBetreiber = false,
}: {
  fullName: string | null;
  einrichtungName: string | null;
  istBetreiber?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-9 gap-2 rounded-full px-3" />
        }
      >
        <span className="max-w-40 truncate text-sm font-medium">{fullName ?? "Unbekannt"}</span>
        <Settings className="size-4 text-muted-foreground" aria-label="Einstellungen" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {einrichtungName ? (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal text-muted-foreground">
              {einrichtungName}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
        ) : null}
        <DropdownMenuItem render={<Link href="/einstellungen" />}>
          <Settings />
          Einstellungen
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/einrichtung-auswahl" />}>
          <Building2 />
          Einrichtung wechseln
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/einstellungen/profil" />}>
          <User />
          Mein Profil
        </DropdownMenuItem>
        {istBetreiber ? (
          <DropdownMenuItem render={<Link href="/admin" />}>
            <Shield />
            Betreiber-Zentrale
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOut />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
