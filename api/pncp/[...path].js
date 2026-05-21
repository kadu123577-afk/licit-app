// api/pncp/[...path].js — Proxy catch-all para /api/pncp/...
export default async function handler(req, res) {
  const pathParts = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
  const query = { ...req.query };
  delete query.path;
  const queryString = new URLSearchParams(query).toString();
  
  // URL completa: pncp.gov.br/api/pncp/v1/...
  const url = `https://pncp.gov.br/api/pncp/${pathParts}${queryString ? '?' + queryString : ''}`;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.text();
    res.status(response.status)
      .setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
      .send(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao chamar PNCP: ' + e.message, url });
  }
}
