// Runs once when the Next.js server process starts (Next.js instrumentation hook).
//
// Production setup: the frontend and the API are on the same box. The API origin
// (api.direct-care.co.uk — resolved to the local server IP via the machine's hosts
// file) is served behind a Cloudflare Origin certificate that is NOT in the public
// trust store. Node therefore rejects it, so every server-side (SSR) fetch fails and
// product pages / other SSR data fall back to "Page Not Found".
//
// Accept that certificate for THIS server's own outbound requests. This only affects
// server-side fetches; browser traffic is completely unaffected.
//
// NOTE: this relaxes TLS verification and is a workaround. The clean permanent fix is
// to bind a publicly-trusted certificate (e.g. Let's Encrypt) to the API site on the
// origin — after that this file can be deleted.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
}
