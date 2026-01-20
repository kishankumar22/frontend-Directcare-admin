// lib/region.ts
export function detectUKRegion(): boolean {
  // SSR / non-browser safety
  if (typeof window === "undefined") return false;

  try {
    // 1️⃣ Timezone (primary signal)
    const tz =
      Intl?.DateTimeFormat?.()
        ?.resolvedOptions?.()
        ?.timeZone ?? "";

    if (typeof tz === "string" && tz.startsWith("Europe/London")) {
      return true;
    }

    // 2️⃣ Language fallback (secondary signal)
    const languages: string[] =
      Array.isArray(navigator.languages)
        ? navigator.languages
        : navigator.language
        ? [navigator.language]
        : [];

    return languages.some((l) => l.toLowerCase().startsWith("en-gb"));
  } catch {
    // absolute fallback → NEVER crash UI
    return false;
  }
}
