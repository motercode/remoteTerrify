import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/** IPs IPv4 de la red local del PC, para poder abrir la app desde el móvil. */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => i!.address);
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // En desarrollo Next bloquea recursos pedidos desde otro host (el móvil).
  allowedDevOrigins: lanAddresses(),
};

export default nextConfig;
