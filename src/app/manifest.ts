import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "remoteTerrify",
    short_name: "remoteTerrify",
    description: "Audio disparado por el acelerómetro del móvil.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
  };
}
