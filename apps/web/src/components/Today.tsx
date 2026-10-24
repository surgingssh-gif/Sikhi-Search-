"use client";

import { useEffect, useState } from "react";

/** Today's date in the reader's own time zone (rendered client-side so a static page never shows a stale date). */
export function Today() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
  }, []);
  return <span>{label}</span>;
}
