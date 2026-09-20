"use client";

import { FehlerAnzeige } from "@/components/shared/fehler-anzeige";

// Innerhalb des App-Layouts: Sidebar und Header bleiben stehen, nur der Inhalt wird ersetzt.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <FehlerAnzeige error={error} retry={retry} zurueckHref="/dashboard" zurueckLabel="Zum Dashboard" />
  );
}
