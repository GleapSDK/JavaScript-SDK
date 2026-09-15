// Repro / verification page for cross-origin-isolated host pages (Gleap #147158).
//
// COEP cannot be set from a <meta> tag, so this tiny server sends the real
// response headers. Run `node demo/coep-server.mjs` and open
//   http://localhost:4571/?coep=require-corp     (strict mode: every no-cors load needs CORP)
//   http://localhost:4571/?coep=credentialless   (lenient mode)
//   http://localhost:4571/?coep=none             (control)
// Add `&sdk=local` to serve a same-origin copy of the bundle, which mirrors an
// npm-bundled integration (the sdk.gleap.io script load is then not in play).
// The widget must open, and the console must show no
// `ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep` errors.
import http from 'node:http';

const PORT = Number(process.env.PORT) || 4571;
const API_KEY = process.env.GLEAP_API_KEY || 'GnhEkS8fdwxNVjyn3BnYwKzpCkiHgKWL';
const SDK_URL = process.env.GLEAP_SDK_URL || 'https://sdk.gleap.io/latest/index.js';

let sdkCache = null;
const sdkSource = async () => {
  if (!sdkCache) sdkCache = await (await fetch(SDK_URL)).text();
  return sdkCache;
};

const page = (mode, sdk) => `<!doctype html>
<html><head><meta charset="utf-8"><title>Gleap under COEP: ${mode}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px">
<h1>Gleap under COEP: ${mode} (sdk=${sdk})</h1>
<p>window.crossOriginIsolated = <b id="iso"></b></p>
<script>document.getElementById('iso').textContent = String(window.crossOriginIsolated);</script>
<script src="${sdk === 'local' ? '/sdk.js' : SDK_URL}"></script>
<script>Gleap.initialize(${JSON.stringify(API_KEY)});</script>
</body></html>`;

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/sdk.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      return res.end(await sdkSource());
    }
    const mode = url.searchParams.get('coep') || 'none';
    const sdk = url.searchParams.get('sdk') || 'cdn';
    const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };
    if (mode !== 'none') {
      headers['Cross-Origin-Embedder-Policy'] = mode;
      headers['Cross-Origin-Opener-Policy'] = 'same-origin';
    }
    res.writeHead(200, headers);
    res.end(page(mode, sdk));
  })
  .listen(PORT, () => {
    console.log(`Gleap COEP demo: http://localhost:${PORT}/?coep=require-corp`);
  });
