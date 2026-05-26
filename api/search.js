// api/search.js — Proxy PNCP
// Remove parâmetros inválidos que causam redirect 307 no PNCP
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parâmetros aceitos pelo /api/search do PNCP (confirmados pelo site deles)
  const { q, pagina, tam_pagina, tamanhoPagina, tipos_documento, uf, ordenacao } = req.query;

  const params = new URLSearchParams();
  if (q)              params.set('q', q);
  if (pagina)         params.set('pagina', pagina);
  // Corrige nome do parâmetro
  const tamanho = tam_pagina || tamanhoPagina;
  if (tamanho)        params.set('tam_pagina', tamanho);
  if (tipos_documento) params.set('tipos_documento', tipos_documento);
  if (uf)             params.set('uf', uf);
  if (ordenacao)      params.set('ordenacao', ordenacao);
  // NÃO inclui dataPublicacaoInicio/Fim — parâmetros inválidos que causam redirect

  const url = `https://pncp.gov.br/api/search?${params}`;

  try {
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
    });
    const text = await r.text();
    res.status(r.status).setHeader('Content-Type', 'application/json').send(text);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
}
