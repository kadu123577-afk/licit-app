// api/search.js — Proxy para /api/search (busca PNCP)
export default async function handler(req, res) {
  const query = { ...req.query };
  const queryString = new URLSearchParams(query).toString();
  const url = `https://pncp.gov.br/api/search${queryString ? '?' + queryString : ''}`;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const data = await response.text();
    res.status(response.status).setHeader('Content-Type', 'application/json').send(data);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao chamar PNCP search: ' + e.message });
  }
}
