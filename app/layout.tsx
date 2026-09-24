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
    default: "Bellegio — Kita-Controlling für Bayern, Baden-Württemberg und NRW",
    template: "%s — Bellegio",
  },
  description:
    "Belegung, Personalschlüssel und Meldewesen für Kindertagesstätten — mit dem passenden Rechenweg für Bayern, Baden-Württemberg und Nordrhein-Westfalen. Jedes Kind im Blick, jede Fachkraft am richtigen Platz.",
  keywords: [
    "Kita-Software",
    "Kita-Controlling",
    "Personalschlüssel Kita",
    "Anstellungsschlüssel BayKiBiG",
    "KiTaVO Baden-Württemberg",
    "KiBiz NRW",
    "Belegungsmanagement Kindertagesstätte",
    "Kinder- und Jugendhilfestatistik",
  ],
  authors: [{ name: "Bellegio" }],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Bellegio — Jedes Kind im Blick. Jede Fachkraft am richtigen Platz.",
    description:
      "Belegung, Personalschlüssel und Meldewesen für Kindertagesstätten in Bayern, Baden-Württemberg und Nordrhein-Westfalen.",
    url: "/",
    siteName: "Bellegio",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Bellegio — Jedes Kind im Blick. Jede Fachkraft am richtigen Platz.",
    description:
      "Belegung, Personalschlüssel und Meldewesen für Kindertagesstätten in Bayern, Baden-Württemberg und Nordrhein-Westfalen.",
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
