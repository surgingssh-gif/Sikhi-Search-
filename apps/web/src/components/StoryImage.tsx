"use client";

import { useState } from "react";

/** A publisher's photo, loaded lazily and dropped quietly if it fails. */
export function StoryImage({ src, alt = "" }: { src: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- publisher photos on many hosts; no optimiser in between.
    <img className="story-img" src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}
