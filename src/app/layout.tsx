import type { Metadata } from "next";
import { GeistMono, GeistSans } from "geist/font";
import "./globals.css";
import Providers from "./Providers";

export const metadata: Metadata = {
  title: "LegacyGuard | Secure AI Orchestration",
  description: "Console de chat multi-agente do LegacyGuard para revisão, orquestração e testes seguros.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
