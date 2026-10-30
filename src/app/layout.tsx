import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Remote Terrify Dashboard",
    template: "%s | Remote Terrify Dashboard",
  },
  description: "Dashboard local para disparar audio con umbrales y delays de acelerómetro.",
  metadataBase: new URL(
    process.env.URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "/",
    siteName: "Remote Terrify Dashboard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
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
