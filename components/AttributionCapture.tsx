"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { captureAttribution } from "@/lib/attribution";

/**
 * Invisible component: captures marketing attribution (gclid / utm_* / referrer)
 * on the visitor's first landing (and refreshes it whenever a new ad click
 * carries a gclid/utm). Mounted once in the root layout.
 */
export default function AttributionCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttribution();
    // Re-run when the URL/query changes (client-side navigation into an ad link).
  }, [pathname, searchParams]);

  return null;
}
