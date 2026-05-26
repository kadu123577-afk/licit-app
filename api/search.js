// api/search.js — Proxy PNCP com headers same-origin para evitar redirect 307
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = { ...req.query };
  // Corrige nome do parâmetro de tamanho
  if (query.tamanhoPagina && !query.tam_pagina) {
    query.tam_pagina = query.tamanhoPagina;
    delete query.tamanhoPagina;
  }
  const qs  = new URLSearchParams(query).toString();
  const url = `https://pncp.gov.br/api/search${qs ? '?' + qs : ''}`;

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        // Simula requisição same-origin do pncp.gov.br — evita o redirect 307
        'Origin': 'https://pncp.gov.br',
        'Referer': 'https://pncp.gov.br/app/editais',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
      },
    });

    const text = await response.text();

    // Se recebeu HTML, o redirect ainda aconteceu — retorna erro claro
    if (text.trimStart().startsWith('<')) {
      return res.status(502).json({
        erro: 'PNCP retornou HTML (redirect não evitado)',
        status: response.status,
        url,
      });
    }

    return res.status(response.status)
      .setHeader('Content-Type', 'application/json')
      .send(text);

  } catch (e) {
    return res.status(500).json({ erro: e.message });
  }
}
