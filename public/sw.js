// Service worker de la PWA "Sistema Otiniano".
// - Archivos estáticos con hash de Next (/_next/static) e íconos: caché primero (no cambian nunca).
// - Páginas: siempre a la red (los datos de dinero y stock tienen que estar al día). Si no hay conexión,
//   se muestra un aviso en lugar del error del navegador.
// - Nada de datos del negocio en caché: ni páginas, ni API, ni Supabase.
const CACHE = "metales-estaticos-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

const SIN_CONEXION = `<!doctype html><html lang="es-PE"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Otiniano</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f5f5f4;color:#1c1917;padding:16px}
@media (prefers-color-scheme:dark){body{background:#1c1917;color:#f5f5f4}p{color:#a8a29e!important}}
div{text-align:center;max-width:360px}img{width:64px;height:64px}h1{font-size:20px;margin:16px 0 6px}p{color:#57534e;margin:0 0 20px;line-height:1.5}
button{background:#a85219;color:#fff;border:0;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:600;cursor:pointer}</style></head>
<body><div><img src="/iconos/icono-192.png" alt=""><h1>Sin conexión a internet</h1>
<p>El sistema necesita internet para mostrar la caja y el stock al día. Revise su conexión e intente de nuevo.</p>
<button onclick="location.reload()">Reintentar</button></div></body></html>`;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => new Response(SIN_CONEXION, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/iconos/")) {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const guardado = await cache.match(req);
        if (guardado) return guardado;
        const resp = await fetch(req);
        if (resp.ok) cache.put(req, resp.clone());
        return resp;
      }),
    );
  }
});
