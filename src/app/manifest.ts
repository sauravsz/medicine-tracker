import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrackMed — Medicine Reorder System",
    short_name: "TrackMed",
    description: "Personal multi-channel medicine stock and lead-time reorder tracking system",
    start_url: "/",
    display: "standalone",
    background_color: "#090c14",
    theme_color: "#090c14",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon.svg",
        sizes: "192x192 512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
