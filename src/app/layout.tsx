import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BRAND_CONFIG } from "../lib/brandConfig";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Sin esto, algunos navegadores de celular renderizan la pagina con un
// ancho "de escritorio" y despues la recortan o la muestran diminuta.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: `${BRAND_CONFIG.fullName} — Pedidos desde tu mesa y delivery`,
  description: `Mirá la carta de ${BRAND_CONFIG.name}, pedí desde tu mesa escaneando el QR o hacé tu pedido a domicilio. ${BRAND_CONFIG.subtitle}.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
