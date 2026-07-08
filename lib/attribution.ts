/**
 * Marketing attribution capture (organic vs paid).
 *
 * On the visitor's FIRST page load we read the URL's query params (gclid, utm_*)
 * and the referrer, then store them for the whole session. When an order is
 * placed we attach these so admins can see if the order came from Google Ads or
 * organically. First-touch is preserved (we don't overwrite an existing capture)
 * so the original source that brought the visitor is credited.
 */

const STORAGE_KEY = "dc_attribution";

export interface Attribution {
  gclid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingPage?: string;
  referrer?: string;
  capturedAt?: string;
}

/**
 * Call once on app mount. Captures attribution from the current URL if this is
 * the visitor's first landing (or if the URL now carries a gclid/utm — a fresh
 * ad/campaign click always refreshes the attribution to the latest paid source).
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    const params = new URLSearchParams(window.location.search);
    const gclid = params.get("gclid") || undefined;
    const utmSource = params.get("utm_source") || undefined;
    const utmMedium = params.get("utm_medium") || undefined;

    const hasNewSignal = Boolean(gclid || utmSource || utmMedium);
    const existing = getAttribution();

    // Keep first-touch UNLESS a new ad/campaign click arrives (then refresh to it).
    if (existing && !hasNewSignal) return;

    const data: Attribution = {
      gclid,
      utmSource,
      utmMedium,
      utmCampaign: params.get("utm_campaign") || undefined,
      utmTerm: params.get("utm_term") || undefined,
      utmContent: params.get("utm_content") || undefined,
      landingPage: window.location.pathname + window.location.search,
      // Only keep external referrers (ignore our own domain)
      referrer:
        document.referrer && !document.referrer.includes(window.location.host)
          ? document.referrer
          : existing?.referrer,
      capturedAt: new Date().toISOString(),
    };

    // Nothing useful to store and nothing existed → skip
    if (!hasNewSignal && !data.referrer && existing) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* storage blocked — ignore */
  }
}

/** Read the stored attribution (if any). */
export function getAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/** Flat object ready to spread into the order payload. */
export function getAttributionPayload(): Partial<Attribution> {
  const a = getAttribution();
  if (!a) return {};
  return {
    gclid: a.gclid,
    utmSource: a.utmSource,
    utmMedium: a.utmMedium,
    utmCampaign: a.utmCampaign,
    utmTerm: a.utmTerm,
    utmContent: a.utmContent,
    landingPage: a.landingPage,
    referrer: a.referrer,
  };
}
