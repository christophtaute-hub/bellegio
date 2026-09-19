"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { markiereDemoAnfrage } from "@/lib/actions/demo-anfrage";

export function AnfrageStatusButton({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const ziel = status === "neu" ? "bearbeitet" : "neu";
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await markiereDemoAnfrage(id, ziel);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {status === "neu" ? "Als bearbeitet markieren" : "Wieder auf neu"}
    </Button>
  );
}
