import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "remoteTerrify",
  description: "Reproduce un audio cuando el acelerómetro del móvil cumple unas condiciones.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "remoteTerrify", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#0a0a0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body className="antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
