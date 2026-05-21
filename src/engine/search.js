// engine/search.js — Geração de queries e busca de candidatos

import { normalizar, PALAVRAS_OPERACIONAIS, simplificarTermoBusca, extrairTermos } from '../utils/text.js';
import { buscarContratacoes } from '../api/pncp.js';

export const CATMAT_CATSER = [
  { termos: ['diaria.*hotel','hospedagem','hotel','pernoite'], codigo: '17884' },
  { termos: ['sonorizacao','locacao.*som','sistema.*som'],    codigo: '20459' },
  { termos: ['locacao.*veiculo','automovel','caminhonete'],   codigo: '17010' },
  { termos: ['combustivel','gasolina','diesel','etanol'],    codigo: '11197' },
  { termos: ['coffee break','lanche','refeicao'],            codigo: '17943' },
];

export function obterCodigoCAT(descricao) {
  const n = normalizar(descricao || '').toLowerCase();
  for (const { termos, codigo } of CATMAT_CATSER)
    if (termos.some(t => new RegExp(t).test(n))) return codigo;
  return null;
}

export function gerarVariacoesQuery(descricao) {
  if (!descricao) return [descricao || ''];
  const queries = [];
  const vistas = new Set();
  const add = q => {
    q = (q || '').trim().replace(/\s+/g, ' ');
    if (q.length >= 5 && !vistas.has(q)) { vistas.add(q); queries.push(q); }
  };
  const norm = normalizar(descricao);
  const matchServico = norm.match(/presta[cc][aa]o\s+de\s+servi[cc]o\s+de\s+([\w\s]{3,50})(?:\s*,|\s+com\s)/);
  const matchLocacao = norm.match(/loca[cc][aa]o\s+de\s+([\w\s]{3,60})(?:\s*[,;:]|\s+com\s|\s+\d)/);
  if (matchServico) {
    const cargo = matchServico[1].trim();
    add(cargo);
    add('prestacao servico ' + cargo);
  } else if (matchLocacao) {
    const objeto = matchLocacao[1].trim();
    const seg1 = descricao.split(/[,;:]/)[0].trim();
    add(seg1.length <= 80 ? seg1 : objeto);
    add('locacao ' + objeto);
  } else {
    add(descricao.split(/[,;:]/)[0].trim());
  }
  const nums = (norm.match(/\b\d{2,}\b/g) || []).slice(0, 2);
  const tecnicos = norm.split(/\s+/).filter(p => p.length >= 4 && !PALAVRAS_OPERACIONAIS.has(p) && !/^\d+$/.test(p)).slice(0, 5);
  add([...nums, ...tecnicos].join(' '));
  add(simplificarTermoBusca(descricao));
  if (queries.length === 0) add(descricao.slice(0, 60));
  return queries.slice(0, 3);
}

export async function buscarCandidatos(descricao, uf, meses = 24) {
  const queries = gerarVariacoesQuery(descricao);
  const codigoCAT = obterCodigoCAT(descricao);
  const vistos = new Set();
  const candidatos = [];
  for (const query of queries) {
    const extras = codigoCAT ? { codigoItem: codigoCAT } : {};
    const resultado = await buscarContratacoes(query, uf, 1, 'edital', meses, extras);
    for (const item of (resultado.items || [])) {
      const id = (item.numeroControlePNCP || item.id || JSON.stringify(item));
      if (!vistos.has(id)) { vistos.add(id); candidatos.push(item); }
    }
  }
  return candidatos;
}
