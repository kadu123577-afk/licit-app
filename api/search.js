// api/search.js — Busca PNCP via API REST oficial (/api/consulta/v1/)
// O endpoint /api/search do PNCP foi descontinuado e retorna HTML.
// Esta função usa a API de consulta (documentada, estável) com filtro de texto local.

function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
}

function scoreTexto(query, texto) {
  const palavras = normalizar(query).split(/\s+/).filter(p => p.length >= 3);
  if (!palavras.length) return 0;
  const norm = normalizar(texto);
  const acertos = palavras.filter(p => norm.includes(p)).length;
  return acertos / palavras.length;
}

function converterItem(c) {
  const cnpj = c.orgaoEntidade?.cnpj || '';
  const ano  = String(c.anoCompra || '');
  const seq  = String(c.sequencialCompra || '');
  return {
    item_url:                  `/compras/${cnpj}/${ano}/${seq}`,
    title:                     c.objetoCompra || '',
    description:               c.objetoCompra || '',
    orgao_nome:                c.orgaoEntidade?.razaoSocial || c.orgaoEntidade?.nome || '',
    uf:                        c.unidadeOrgao?.ufSigla || c.orgaoEntidade?.uf || '',
    municipio_nome:            c.unidadeOrgao?.municipioNome || '',
    data_publicacao_pncp:      c.dataPublicacaoPncp || '',
    numero_controle_pncp:      c.numeroControlePNCP || `${cnpj}-${ano}-${seq}`,
    modalidade_licitacao_id:   c.modalidadeLicitacaoId || 0,
    modalidade_licitacao_nome: c.modalidadeNome || '',
    orgao_cnpj:                cnpj,
    ano,
    numero_sequencial:         seq,
  };
}

async function buscarPagina(dataInicial, dataFinal, pagina, uf) {
  const params = new URLSearchParams({ dataInicial, dataFinal, pagina, tamanhoPagina: 50 });
  if (uf) params.set('ufSigla', uf);
  const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${params}`;
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    return json.data || json.items || (Array.isArray(json) ? json : []);
  } catch {
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    q = '',
    pagina = '1',
    tamanhoPagina = '50',
    dataPublicacaoInicio,
    dataPublicacaoFim,
    uf = '',
  } = req.query;

  const query     = q.trim();
  const paginaSaida = Math.max(1, parseInt(pagina));
  const tamSaida  = Math.min(50, Math.max(1, parseInt(tamanhoPagina)));

  if (!query) return res.status(200).json({ items: [], total: 0 });

  // Datas padrão: últimos 24 meses
  const hoje = new Date();
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, '');
  const dataFim = dataPublicacaoFim  || fmt(hoje);
  const dataIni = dataPublicacaoInicio || (() => {
    const d = new Date(hoje); d.setFullYear(d.getFullYear() - 2); return fmt(d);
  })();

  // Busca 6 páginas em paralelo (300 contratos) — fica dentro do limite de 10s do Vercel
  const paginas = [1, 2, 3, 4, 5, 6];
  const resultados = await Promise.allSettled(
    paginas.map(p => buscarPagina(dataIni, dataFim, p, uf))
  );

  const todos = resultados
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Filtra por relevância textual e ordena
  const candidatos = todos
    .map(c => ({ score: scoreTexto(query, c.objetoCompra || ''), item: c }))
    .filter(({ score }) => score >= 0.25)
    .sort((a, b) => b.score - a.score);

  // Pagina os resultados
  const inicio = (paginaSaida - 1) * tamSaida;
  const items  = candidatos
    .slice(inicio, inicio + tamSaida)
    .map(({ item }) => converterItem(item));

  return res.status(200).json({ items, total: candidatos.length });
}
