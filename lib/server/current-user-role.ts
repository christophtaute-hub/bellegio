import { createClient } from "@/lib/supabase/server";

export type UserRole =
  | "traeger_admin"
  | "einrichtungsleitung"
  | "belegung"
  | "personal"
  | "controlling";

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return (profile?.role as UserRole) ?? null;
}

export function canWriteBelegung(role: UserRole | null): boolean {
  return (
    role === "traeger_admin" ||
    role === "einrichtungsleitung" ||
    role === "belegung"
  );
}

export function canWritePersonal(role: UserRole | null): boolean {
  return (
    role === "traeger_admin" ||
    role === "einrichtungsleitung" ||
    role === "personal"
  );
}

export function canUseSzenarioRechner(role: UserRole | null): boolean {
  return role === "traeger_admin" || role === "einrichtungsleitung";
}
