import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BRAND_CONFIG } from "../lib/brandConfig";
import { UiProviders } from "../components/ui";

// Nota: la tipografía real del sitio (Outfit / Playfair Display) se carga
// vía @import en globals.css y se aplica con --font-sans/--font-serif.
// Antes acá también se cargaban las fuentes Geist de next/font/google,
// pero nunca se usaban en ningún estilo — quedaban del boilerplate de
// create-next-app y solo agregaban una descarga de red innecesaria.

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
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <UiProviders>{children}</UiProviders>
      </body>
    </html>
  );
}
