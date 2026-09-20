"use client";

// Greift nur, wenn das Root-Layout selbst fehlschlägt. Muss ein eigenes
// <html>/<body> mitbringen und kann die globalen Styles nicht voraussetzen.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="de">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Bellegio ist gerade nicht erreichbar</h1>
        <p style={{ maxWidth: "28rem", margin: 0, color: "#555" }}>
          Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es in einem Moment noch einmal.
        </p>
        {error.digest ? (
          <p style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#777", margin: 0 }}>
            Fehlernummer: {error.digest}
          </p>
        ) : null}
        <button
          onClick={() => retry()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
            background: "white",
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
