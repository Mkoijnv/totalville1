// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script"; // 1. IMPORTAMOS O COMPONENTE SCRIPT DO NEXT.JS
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portal Total Ville 1",
  description: "Sistema de gerenciamento para o condomínio Total Ville 1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}

        {/* ========================================================== */}
        {/* 2. AQUI ADICIONAMOS O SCRIPT DO TAWK.TO               */}
        {/* ========================================================== */}
        <Script
            strategy="lazyOnload"
            src="https://embed.tawk.to/685981392f458f191216deb9/1iueq1i2o"
        />
      </body>
    </html>
  );
}