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

    try {
      // @ts-ignore
      const dns = require('dns');
      
      const originalLookup = dns.lookup;
      
      // Override dns.lookup to hardcode Cloudflare IP resolution for api.direct-care.co.uk
      // ONLY when the local system DNS fails to resolve it (e.g. during local development).
      // @ts-ignore
      dns.lookup = function (hostname: string, options: any, callback: any) {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }

        return originalLookup(hostname, options, (err: any, address: any, family: any) => {
          if (err && hostname === 'api.direct-care.co.uk') {
            const ipv4Addresses = [
              { address: '104.21.46.222', family: 4 },
              { address: '172.67.142.227', family: 4 },
            ];
            const ipv6Addresses = [
              { address: '2606:4700:3031::ac43:8ee3', family: 6 },
              { address: '2606:4700:3037::6815:2ede', family: 6 },
            ];

            if (options.all) {
              let results = [];
              if (options.family === 4) {
                results = ipv4Addresses;
              } else if (options.family === 6) {
                results = ipv6Addresses;
              } else {
                results = [...ipv4Addresses, ...ipv6Addresses];
              }
              return callback(null, results);
            } else {
              if (options.family === 6) {
                return callback(null, ipv6Addresses[0].address, 6);
              }
              return callback(null, ipv4Addresses[0].address, 4);
            }
          }

          return callback(err, address, family);
        });
      };
    } catch (e) {
      console.error('Failed to patch DNS lookup:', e);
    }
  }
}
