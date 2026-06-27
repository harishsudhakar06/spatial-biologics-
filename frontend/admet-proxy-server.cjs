const http = require("http");
const https = require("https");

const PORT = 3001;
const ADMET_BASE = "admetlab3.scbdd.com";

const ROUTES = {
  "/api/admet":        "/api/admet",
  "/api/single/admet": "/api/single/admet",
  "/api/washmol":      "/api/washmol",
  "/api/molsvg":       "/api/molsvg",
  "/api/admetCSV":     "/api/admetCSV",
};

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const remotePath = ROUTES[req.url];
  if (!remotePath) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unknown route: " + req.url }));
    return;
  }

  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", () => {
    console.log("-> " + req.method + " " + req.url);
    const options = {
      hostname: ADMET_BASE,
      path: remotePath,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://admetlab3.scbdd.com",
        "Referer": "https://admetlab3.scbdd.com/",
      },
    };

    const proxyReq = https.request(options, proxyRes => {
      console.log("<- " + proxyRes.statusCode + " from ADMETlab");
      res.writeHead(proxyRes.statusCode, { "Content-Type": "application/json" });
      proxyRes.pipe(res);
    });

    proxyReq.on("error", err => {
      console.error("Proxy error:", err.message);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log("");
  console.log("✅  ADMETlab proxy running at http://localhost:" + PORT);
  console.log("    Forwarding to https://" + ADMET_BASE);
  console.log("");
});
