import { cookies } from "next/headers";
import { ACTIVE_EINRICHTUNG_COOKIE } from "@/lib/active-einrichtung";

export async function getActiveEinrichtungId() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_EINRICHTUNG_COOKIE)?.value ?? null;
}
