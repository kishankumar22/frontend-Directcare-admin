// lib/region.ts

/**
 * Detects if the user is in the UK using IP-based geolocation.
 * Falls back to timezone/language checks if the API call fails.
 */
export async function detectUKRegion(): Promise<boolean> {
  // SSR / non-browser safety
  if (typeof window === "undefined") return false;

  try {
    // 1️⃣ IP-based geolocation (primary signal — works with VPN)
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.country_code === "GB") {
        return true;
      }
      // API responded but user is NOT in UK
      return false;
    }
  } catch {
    // API failed — fall through to local fallbacks
  }

  // 2️⃣ Timezone fallback (if API is unreachable)
  try {
    const tz =
      Intl?.DateTimeFormat?.()
        ?.resolvedOptions?.()
        ?.timeZone ?? "";

    if (typeof tz === "string" && tz.startsWith("Europe/London")) {
      return true;
    }

    // 3️⃣ Language fallback
    const languages: string[] =
      Array.isArray(navigator.languages)
        ? navigator.languages
        : navigator.language
        ? [navigator.language]
        : [];

    return languages.some((l) => l.toLowerCase().startsWith("en-gb"));
  } catch {
    return false;
  }
}
