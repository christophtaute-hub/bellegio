"use client";

import { FehlerAnzeige } from "@/components/shared/fehler-anzeige";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <FehlerAnzeige error={error} retry={retry} zurueckHref="/" zurueckLabel="Zur Startseite" />;
}
