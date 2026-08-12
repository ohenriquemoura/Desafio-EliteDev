import type { Metadata } from "next";
import { Oswald, Work_Sans } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Elite Dev — Eventos",
  description: "Plataforma de eventos e ingressos (Desafio Elite Dev 2026)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${oswald.variable} ${workSans.variable}`}>{children}</body>
    </html>
  );
}
