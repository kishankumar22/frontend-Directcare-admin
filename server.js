// server.js - Production Server for Plesk
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// Initialize Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

console.log('🚀 Starting Next.js Application...');
console.log(`📌 Environment: ${process.env.NODE_ENV}`);
console.log(`📌 Hostname: ${hostname}`);
console.log(`📌 Port: ${port}`);

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Parse URL
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      // Handle Next.js routes
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('❌ Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error('❌ Server startup error:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`✅ Ready on http://${hostname}:${port}`);
      console.log(`✅ Environment: ${process.env.NODE_ENV}`);
      console.log(`✅ API URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    });
});
