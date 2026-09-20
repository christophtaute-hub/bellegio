import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-heading text-6xl text-primary">404</p>
      <h1 className="font-heading text-2xl text-primary">Diese Seite gibt es nicht</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Der Link ist vielleicht veraltet, oder du hast für diese Seite keine Berechtigung.
      </p>
      <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
        Zur Startseite
      </Link>
    </div>
  );
}
