"use client";

import dynamic from "next/dynamic";

// Leaflet needs the browser's window, so the maps load on the client only.
export const NewsMap = dynamic(() => import("./NewsMap").then((m) => m.NewsMap), {
  ssr: false,
  loading: () => <div className="map-page map-loading" />,
});

export const MiniMap = dynamic(() => import("./NewsMap").then((m) => m.MiniMap), {
  ssr: false,
  loading: () => <div className="mini-map" />,
});
