import type { Metadata } from "next";
import "./globals.css";
import FeedbackButton from "@/components/FeedbackButton";

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
      <body>
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}
