import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Bellegio — Kita-Controlling für Bayern, Baden-Württemberg und NRW",
  description:
    "Belegung, Personalschlüssel und Meldewesen für Kindertagesstätten — mit dem passenden Rechenweg für Bayern, Baden-Württemberg und Nordrhein-Westfalen.",
  openGraph: {
    title: "Bellegio — Jedes Kind im Blick. Jede Fachkraft am richtigen Platz.",
    description:
      "Belegung, Personalschlüssel und Meldewesen für Kindertagesstätten in Bayern, Baden-Württemberg und Nordrhein-Westfalen.",
    locale: "de_DE",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
