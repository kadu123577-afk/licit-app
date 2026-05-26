// api/search.js — Busca PNCP via API de consulta oficial
// /api/search redireciona chamadas externas para o SPA (não funciona via proxy).
// Solução: usa /api/consulta/v1/ que é a API pública documentada e estável.

function normalizar(t) {
  return (t || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').trim();
}

function score(query, texto) {
  const palavras = normalizar(query).split(/\s+/).filter(p => p.length >= 3);
  if (!palavras.length) return 0;
  const norm = normalizar(texto);
  return palavras.filter(p => norm.includes(p)).length / palavras.length;
}

function converter(c) {
  const cnpj = c.orgaoEntidade?.cnpj || '';
  const ano  = String(c.anoCompra || '');
  const seq  = String(c.sequencialCompra || '');
  return {
    item_url:                  `/compras/${cnpj}/${ano}/${seq}`,
    title:                     c.objetoCompra || '',
    description:               c.objetoCompra || '',
    orgao_nome:                c.orgaoEntidade?.razaoSocial || c.orgaoEntidade?.nome || '',
    uf:                        c.unidadeOrgao?.ufSigla || '',
    municipio_nome:            c.unidadeOrgao?.municipioNome || '',
    data_publicacao_pncp:      c.dataPublicacaoPncp || '',
    numero_controle_pncp:      c.numeroControlePNCP || `${cnpj}-${ano}-${seq}`,
    modalidade_licitacao_id:   c.modalidadeLicitacaoId || 0,
    modalidade_licitacao_nome: c.modalidadeNome || '',
    orgao_cnpj: cnpj, ano, numero_sequencial: seq,
  };
}

async function buscar(dataInicial, dataFinal, pagina, uf, palavraChave) {
  const p = new URLSearchParams({ dataInicial, dataFinal, pagina, tamanhoPagina: 50 });
  if (uf) p.set('ufSigla', uf);
  // Tenta busca server-side por palavra-chave (mais eficiente se o PNCP suportar)
  if (palavraChave) p.set('palavraChaveItem', palavraChave);
  const url = `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${p}`;
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(9000),
      redirect: 'follow',
    });
    if (!r.ok) return [];
    const j = await r.json();
    return j.data || j.items || (Array.isArray(j) ? j : []);
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q = '', pagina = '1', tam_pagina = '50',
          dataPublicacaoInicio, dataPublicacaoFim, uf = '' } = req.query;

  const query = q.trim();
  const pg    = Math.max(1, parseInt(pagina));
  const tam   = Math.min(50, parseInt(tam_pagina));
  if (!query) return res.status(200).json({ items: [], total: 0 });

  const hoje = new Date();
  const fmt  = d => d.toISOString().slice(0,10).replace(/-/g,'');
  const fim  = dataPublicacaoFim   || fmt(hoje);
  const ini  = dataPublicacaoInicio || fmt(new Date(hoje.setFullYear(hoje.getFullYear()-2)));

  // Pega a palavra mais relevante da query para passar ao servidor
  const palavraPrincipal = normalizar(query).split(/\s+/)
    .filter(p => p.length >= 4).sort((a,b) => b.length - a.length)[0] || query;

  // Busca 8 páginas em paralelo com filtro server-side
  const paginas = [1,2,3,4,5,6,7,8];
  const resultados = await Promise.allSettled(
    paginas.map(p => buscar(ini, fim, p, uf, palavraPrincipal))
  );

  const todos = resultados
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Se server-side retornou pouco (palavra-chave não suportada), tenta sem filtro
  let candidatos;
  if (todos.length < 10) {
    const semFiltro = await Promise.allSettled(
      [1,2,3,4].map(p => buscar(ini, fim, p, uf, null))
    );
    const extra = semFiltro.filter(r=>r.status==='fulfilled').flatMap(r=>r.value);
    candidatos = extra
      .map(c => ({ s: score(query, c.objetoCompra||''), c }))
      .filter(({s}) => s >= 0.25)
      .sort((a,b) => b.s - a.s);
  } else {
    candidatos = todos
      .map(c => ({ s: score(query, c.objetoCompra||''), c }))
      .filter(({s}) => s >= 0.2)
      .sort((a,b) => b.s - a.s);
  }

  const inicio = (pg-1)*tam;
  return res.status(200).json({
    items: candidatos.slice(inicio, inicio+tam).map(({c}) => converter(c)),
    total: candidatos.length,
  });
}
