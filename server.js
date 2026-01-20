// server.js - Production Server for IIS with iisnode

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

// Detect environment
const dev = process.env.NODE_ENV !== "production";

// For iisnode, PORT is usually a named pipe, not a number
const port = process.env.PORT || 3000;

// Initialize Next.js app
const app = next({ dev });
const handle = app.getRequestHandler();

console.log("Starting Next.js Application...");
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Port/Pipe: ${port}`);

app
  .prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("Error occurred handling request:", req.url, err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    })
      .once("error", (err) => {
        console.error("Server startup error:", err);
        process.exit(1);
      })
      .listen(port, () => {
        console.log(`Ready on port/pipe: ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
      });
  })
  .catch((err) => {
    console.error("Next.js app preparation failed:", err);
    process.exit(1);
  });
