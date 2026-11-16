"use client";

import Image from "next/image";
import { useState } from "react";
import { responsiveFillSourceSet } from "../../../lib/images/responsive-fill.mjs";
import styles from "./recipe-detail.module.css";

export function SelectableRecipeImage({ src, alt }: { src: string; alt: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <button
      type="button"
      className={`${styles.heroImage} ${expanded ? styles.heroImageExpanded : ""}`}
      aria-pressed={expanded}
      aria-label={`${expanded ? "Restore" : "Enlarge"} ${alt} image`}
      onClick={() => setExpanded((current) => !current)}
    >
      <Image src={src} alt={alt} fill loading="eager" fetchPriority="high" sizes="(max-width: 600px) 92vw, 50vw" {...responsiveFillSourceSet(src)} />
    </button>
  );
}
