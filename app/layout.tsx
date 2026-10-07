import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bellegio.de"),
  title: {
    default: "Bellegio — Kita-Controlling nach dem Landesrecht deiner Einrichtung",
    template: "%s — Bellegio",
  },
  description:
    "Belegung, Personalschlüssel, Finanzen und Meldewesen für Kindertagesstätten — gerechnet nach dem Landesrecht deiner Einrichtung. Jedes Kind im Blick, jede Fachkraft am richtigen Platz.",
  keywords: [
    "Kita-Software",
    "Kita-Controlling",
    "Personalschlüssel Kita",
    "Landesrecht Kita",
    "Kita-Personalplanung",
    "Belegungsmanagement Kindertagesstätte",
    "Kinder- und Jugendhilfestatistik",
  ],
  authors: [{ name: "Bellegio" }],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Bellegio — Jedes Kind im Blick. Jede Fachkraft am richtigen Platz.",
    description:
      "Belegung, Personalschlüssel, Finanzen und Meldewesen für Kindertagesstätten — nach dem Landesrecht deiner Einrichtung.",
    url: "/",
    siteName: "Bellegio",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Bellegio — Jedes Kind im Blick. Jede Fachkraft am richtigen Platz.",
    description:
      "Belegung, Personalschlüssel, Finanzen und Meldewesen für Kindertagesstätten — nach dem Landesrecht deiner Einrichtung.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#10201d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
