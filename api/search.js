// api/search.js — Busca via endpoint de ITENS do PNCP
// /api/search está bloqueado por IP. O endpoint de itens tem parâmetro
// descricaoItem que permite busca textual server-side.

function normalizar(t) {
  return (t||'').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').trim();
}
function score(q, txt) {
  const pp = normalizar(q).split(/\s+/).filter(p=>p.length>=3);
  if (!pp.length) return 0;
  const n = normalizar(txt);
  return pp.filter(p=>n.includes(p)).length / pp.length;
}

async function buscarItens(descricao, dataIni, dataFim, uf, pagina) {
  const p = new URLSearchParams({
    dataInicial: dataIni, dataFinal: dataFim,
    pagina, tamanhoPagina: 50,
  });
  if (descricao) p.set('descricaoItem', descricao);
  if (uf) p.set('ufSigla', uf);
  const url = `https://pncp.gov.br/api/consulta/v1/itens/contratacao/publicacao?${p}`;
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return j.data || j.items || (Array.isArray(j) ? j : []);
  } catch { return [] ; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Accept,Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q='', pagina='1', tam_pagina='50', tamanhoPagina,
          dataPublicacaoInicio, dataPublicacaoFim, uf='' } = req.query;
  const query = q.trim();
  const pg  = Math.max(1, parseInt(pagina));
  const tam = Math.min(50, parseInt(tam_pagina||tamanhoPagina||'50'));
  if (!query) return res.status(200).json({ items:[], total:0 });

  const hoje = new Date();
  const fmt  = d => d.toISOString().slice(0,10).replace(/-/g,'');
  const fim  = dataPublicacaoFim   || fmt(hoje);
  const ini  = dataPublicacaoInicio|| fmt(new Date(new Date().setFullYear(hoje.getFullYear()-2)));

  // Palavra principal para busca server-side
  const palavras = normalizar(query).split(/\s+/).filter(p=>p.length>=4)
    .sort((a,b)=>b.length-a.length);
  const palavraPrincipal = palavras[0] || query;

  // Busca 6 páginas em paralelo com filtro por descricaoItem
  const pages = [1,2,3,4,5,6];
  const results = await Promise.allSettled(
    pages.map(p => buscarItens(palavraPrincipal, ini, fim, uf, p))
  );
  const itens = results.filter(r=>r.status==='fulfilled').flatMap(r=>r.value);

  // Converte item → formato esperado pelo HTML
  const candidatos = itens
    .map(it => {
      const desc = it.descricao || it.descricaoItem || '';
      const cnpj = it.orgaoEntidade?.cnpj || it.cnpjOrgao || '';
      const ano  = String(it.anoCompra||it.ano||'');
      const seq  = String(it.sequencialCompra||it.sequencial||'');
      return {
        score: score(query, desc),
        item: {
          item_url: `/compras/${cnpj}/${ano}/${seq}`,
          title: it.objetoCompra || desc,
          description: desc || it.objetoCompra || '',
          orgao_nome: it.orgaoEntidade?.razaoSocial||it.nomeOrgao||'',
          uf: it.unidadeOrgao?.ufSigla||it.uf||'',
          municipio_nome: it.unidadeOrgao?.municipioNome||'',
          data_publicacao_pncp: it.dataPublicacaoPncp||it.dataPublicacao||'',
          numero_controle_pncp: it.numeroControlePNCP||`${cnpj}-${ano}-${seq}`,
          modalidade_licitacao_id: it.modalidadeLicitacaoId||0,
          modalidade_licitacao_nome: it.modalidadeNome||'',
          orgao_cnpj: cnpj, ano, numero_sequencial: seq,
        }
      };
    })
    .filter(({score:s}) => s >= 0.2)
    .sort((a,b) => b.score - a.score);

  const inicio = (pg-1)*tam;
  return res.status(200).json({
    items: candidatos.slice(inicio, inicio+tam).map(({item})=>item),
    total: candidatos.length,
  });
}
