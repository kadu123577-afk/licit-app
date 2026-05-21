// engine/scoring.js — Cálculo de score e vetos de relevância

import { normalizar, extrairTermos, PALAVRAS_OPERACIONAIS } from '../utils/text.js';

const _scoreCache = new Map();

export function calcularScorePonderado(query, texto) {
  if (!query || !texto) return 0;
  const cacheKey = query + '||' + texto.slice(0, 120);
  if (_scoreCache.has(cacheKey)) return _scoreCache.get(cacheKey);
  const t = normalizar(texto);
  const qNorm = normalizar(query);
  let pesoTotal = 0, hits = 0;
  const nums = (qNorm.match(/\b\d+\b/g) || []);
  for (const n of nums) {
    pesoTotal += 1.5;
    const val = parseInt(n, 10);
    if (new RegExp('(?:^|[^0-9])0*' + val + '(?:[^0-9]|$)').test(t)) hits += 1.5;
  }
  const termos = extrairTermos(query);
  for (const termo of termos) {
    if (/^\d+$/.test(termo.palavra)) continue;
    const isTecnico = !PALAVRAS_OPERACIONAIS.has(termo.palavra) && termo.palavra.length >= 4;
    const peso = isTecnico ? 2 : 1;
    pesoTotal += peso;
    if (t.includes(termo.palavra) || (termo.stem.length >= 4 && t.includes(termo.stem)))
      hits += peso;
  }
  const resultado = pesoTotal > 0 ? hits / pesoTotal : 0;
  _scoreCache.set(cacheKey, resultado);
  return resultado;
}

export function unidadeCompativel(unidadeItem, unidadeCotacao) {
  if (!unidadeItem || !unidadeCotacao) return true;
  const norm = u => normalizar(String(u)).replace(/[.\s\/\-_]/g, '').toLowerCase();
  const ui = norm(unidadeItem), uc = norm(unidadeCotacao);
  if (!ui || ui === '\u2014' || !uc || uc === '\u2014') return true;
  if (ui === uc) return true;
  const GRUPOS = {
    unitario: ['un','und','unid','unidade','uni','unidades','peca','pecas','item','itens','cada'],
    diaria:   ['diaria','diarias','dia','dias','diariaun','diariaunid','daily','d'],
    mensal:   ['mes','mensal','meses','mensalidade','m'],
    hora:     ['hora','horas','hr','hrs','h'],
    anual:    ['ano','anual','anos'],
    evento:   ['evento','eventos','servico','servicos','sv','global','gb','contrato','vez','vezes'],
    kit:      ['kit','kits','conjunto','conjuntos','jogo','jogos'],
    par:      ['par','pares'],
  };
  const getGrupo = u => {
    for (const [g, v] of Object.entries(GRUPOS))
      if (v.some(x => u === x || u.startsWith(x) || x.startsWith(u))) return g;
    return null;
  };
  const gi = getGrupo(ui), gc = getGrupo(uc);
  if (!gi || !gc) return true;
  if (gi === gc) return true;
  const INTERCAMBIAVEIS = [
    ['unitario','diaria'], ['unitario','evento'], ['diaria','evento'],
    ['unitario','kit'], ['unitario','par'],
  ];
  return INTERCAMBIAVEIS.some(([a,b]) => (gi===a&&gc===b)||(gi===b&&gc===a));
}

const CATEGORIAS_VETO = [
  { id: 'som_iluminacao', termos: ['sonorizacao','caixa de som','amplificador','microfone','mesa de som','line array','iluminacao','refletor','led','beam'], incompativel: ['veiculo','alimentacao','material_escritorio','medicamento','construcao'] },
  { id: 'veiculo', termos: ['veiculo','automovel','carro','caminhao','onibus','furgao','van','moto','camionete'], incompativel: ['som_iluminacao','alimentacao','material_escritorio','medicamento'] },
  { id: 'alimentacao', termos: ['alimentacao','refeicao','marmita','lanche','coffee break','buffet','catering','alimento'], incompativel: ['som_iluminacao','veiculo','material_escritorio','medicamento','construcao'] },
  { id: 'material_escritorio', termos: ['adesivo','papel','caneta','caderno','pasta','envelope','material de escritorio'], incompativel: ['som_iluminacao','veiculo','alimentacao','medicamento','construcao'] },
  { id: 'medicamento', termos: ['medicamento','remedio','comprimido','capsula','vacina','insumo hospitalar'], incompativel: ['som_iluminacao','veiculo','alimentacao','material_escritorio','construcao'] },
  { id: 'construcao', termos: ['cimento','areia','brita','tijolo','tinta','obra','construcao civil','reforma'], incompativel: ['som_iluminacao','veiculo','alimentacao','material_escritorio','medicamento'] },
];

export function vetoCategoria(queryDescricao, descricaoItemEncontrado) {
  if (!queryDescricao || !descricaoItemEncontrado) return false;
  const q = normalizar(queryDescricao);
  const d = normalizar(descricaoItemEncontrado);
  const detectar = texto => {
    const cats = new Set();
    for (const cat of CATEGORIAS_VETO)
      if (cat.termos.some(t => texto.includes(normalizar(t)))) cats.add(cat.id);
    return cats;
  };
  const catsQuery = detectar(q);
  const catsResultado = detectar(d);
  if (catsQuery.size === 0 || catsResultado.size === 0) return false;
  for (const catQ of catsQuery) {
    const defCat = CATEGORIAS_VETO.find(c => c.id === catQ);
    if (!defCat) continue;
    for (const catR of catsResultado)
      if (defCat.incompativel.includes(catR)) return true;
  }
  return false;
}

export function vetoDensidade(queryDescricao, descricaoItemEncontrado) {
  if (!queryDescricao) return false;
  const contar = texto => {
    if (!texto) return 0;
    const t = normalizar(texto);
    let count = 0;
    for (const tok of t.split(/\s+/)) {
      if (!tok) continue;
      if (/^\d{2,}$/.test(tok)) { count++; continue; }
      if (tok.length >= 4 && !PALAVRAS_OPERACIONAIS.has(tok)) count++;
    }
    return count;
  };
  const compResultado = contar(descricaoItemEncontrado || '');
  const compQuery = contar(queryDescricao);
  if (compQuery < 3 || compResultado < 3) return false;
  return (compResultado / compQuery) > 3.5;
}

export function vetoNumerico(queryDescricao, descricaoItemEncontrado) {
  if (!descricaoItemEncontrado) return false;
  const q = normalizar(queryDescricao);
  const d = normalizar(descricaoItemEncontrado);
  const padroes = [/(\d+)\s*kva/g, /tipo\s+0*(\d+)/g];
  const numsQuery = new Set();
  for (const p of padroes) {
    let m; p.lastIndex = 0;
    while ((m = p.exec(q)) !== null) numsQuery.add(m[1].replace(/^0+/, '') || '0');
  }
  if (numsQuery.size === 0) return false;
  for (const n of numsQuery) {
    const semZero = n.replace(/^0+/, '') || '0';
    if (!new RegExp('(?:^|\\D)0*' + semZero + '(?:\\D|$)').test(d)) return true;
  }
  return false;
}

export function vetoTeto(queryDescricao, valor) {
  return false; // desativado — calibrar com dados reais antes de reativar
}
