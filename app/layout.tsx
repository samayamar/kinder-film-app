import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kinder-Film-Analyzer",
  description: "Filmanalyse für empfindliche Kinder — Altersgerecht & Praktisch",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
