import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-black/5 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="font-heading text-xl font-semibold text-primary">
          Bellegio
        </span>
        <Button nativeButton={false} render={<Link href="/login" />}>
          Anmelden
        </Button>
      </div>
    </header>
  );
}
