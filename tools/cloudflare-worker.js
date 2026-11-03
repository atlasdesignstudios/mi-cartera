// Intermediario propio para las cotizaciones de la versión web de Mi Cartera.
// Despliégalo gratis en Cloudflare Workers (Workers & Pages → Create → Hello World → pega este código)
// y copia en Ajustes → Cotizaciones la dirección: https://TU-WORKER.workers.dev/?url=
// Solo reenvía consultas a Yahoo Finance y solo responde a tu página.

const ALLOWED_HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com'];
// Cambia esto por la dirección donde publicas la app (o déjalo en '*' si te da igual).
const ALLOWED_ORIGIN = 'https://atlasdesignstudios.github.io';

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Max-Age': '86400'
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    const target = new URL(request.url).searchParams.get('url');
    let url;
    try { url = new URL(target); } catch { return new Response('Falta ?url=', { status: 400, headers: cors }); }
    if (url.protocol !== 'https:' || !ALLOWED_HOSTS.includes(url.hostname)) {
      return new Response('Destino no permitido', { status: 403, headers: cors });
    }
    const upstream = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0 (MiCartera)', Accept: 'application/json' },
      cf: { cacheTtl: 60, cacheEverything: true }
    });
    const headers = new Headers(cors);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json');
    headers.set('Cache-Control', 'public, max-age=60');
    return new Response(upstream.body, { status: upstream.status, headers });
  }
};
