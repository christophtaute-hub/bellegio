"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DruckButton({ label = "Verlauf drucken" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="self-start print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="size-3.5" />
      {label}
    </Button>
  );
}
