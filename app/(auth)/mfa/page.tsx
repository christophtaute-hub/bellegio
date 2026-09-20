import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaCodeForm } from "@/components/auth/mfa-code-form";
import { getMfaStatus } from "@/lib/server/mfa";

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ weiter?: string }> }) {
  const { weiter } = await searchParams;
  // Nur interne Ziele zulassen (kein Weiterleiten auf fremde Adressen).
  const ziel = weiter && weiter.startsWith("/") && !weiter.startsWith("//") ? weiter : "/";
  if ((await getMfaStatus()) !== "code_erforderlich") redirect(ziel);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-heading text-2xl text-primary">Zweiter Faktor</CardTitle>
          <CardDescription>Gib den aktuellen Code aus deiner Authenticator-App ein.</CardDescription>
        </CardHeader>
        <CardContent>
          <MfaCodeForm weiter={ziel} />
        </CardContent>
      </Card>
    </div>
  );
}
