import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Öffnet eine Einrichtung per Link (für den Direkteinstieg bei nur einer sichtbaren Einrichtung). Server Actions können
 * von einer Seite aus kein Cookie setzen, ein Route Handler kann es. Der Zugriff wird wie bei setActiveEinrichtung per
 * RLS geprüft — das Cookie ist nur ein Merker, nie die Sicherheitsgrenze. */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const zurAuswahl = () => NextResponse.redirect(new URL("/einrichtung-auswahl", request.url));
  if (!UUID.test(id)) return zurAuswahl();

  const supabase = await createClient();
  const { data } = await supabase.from("einrichtungen").select("id").eq("id", id).maybeSingle();
  if (!data) return zurAuswahl();

  const antwort = NextResponse.redirect(new URL("/dashboard", request.url));
  antwort.cookies.set(ACTIVE_EINRICHTUNG_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return antwort;
}
