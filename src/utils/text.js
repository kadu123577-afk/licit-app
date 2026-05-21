// utils/text.js — Processamento de texto e score

export function normalizar(t) {
  if (!t) return '';
  return String(t).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[,.;:()\[\]\/\\!?"']/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function stem(palavra) {
  let p = palavra;
  const sufixos = ['acoes','icoes','ucoes','cao','oes','oso','osa','mente','ando','endo','indo',
    'amos','emos','imos','avel','ivel','agem','icas','ico','ica','icos','aria','erio','eria',
    'ente','ante','inte','izar','izou','izam','izado','izada','izando','eiro','eira','inho',
    'inha','idade','ar','er','ir','or','es','as','os','a','o','e'];
  for (const s of sufixos) {
    if (p.length > s.length + 3 && p.endsWith(s)) { p = p.slice(0, -s.length); break; }
  }
  return p;
}

export function extrairTermos(query) {
  const stopwords = new Set(['para','com','sem','por','que','dos','das','nos','nas','pra','pelo','pela','tipo','kit','set','and','the']);
  return normalizar(query).split(/\s+/)
    .filter(t => t.length >= 3 && !stopwords.has(t))
    .map(t => ({ palavra: t, stem: stem(t) }));
}

export function calcularScore(query, texto, modo = 'rigoroso') {
  if (!query || !texto) return 0;
  const termos = extrairTermos(query);
  if (termos.length === 0) return 0;
  const t = normalizar(texto);
  let hits = 0;
  for (const termo of termos) {
    if (t.includes(termo.palavra)) { hits++; continue; }
    if (termo.stem.length >= 4 && t.includes(termo.stem)) { hits++; }
  }
  if (modo === 'flexivel') return hits > 0 ? Math.max(hits / termos.length, 0.5) : 0;
  return hits / termos.length;
}

export const PALAVRAS_OPERACIONAIS = new Set([
  'locacao','aquisicao','contratacao','prestacao','fornecimento','servicos','servico',
  'empresa','especializada','futura','eventual','registro','precos','preco','sistema',
  'srp','ata','lote','item','unidade','unid','diaria','diarias','mensal','anual','horas',
  'hora','tipo','modelo','composto','composta','mediante','incluindo','conforme',
  'destinado','destinada','destinados','destinadas','fabricado','fabricada','estruturado',
  'estruturada','realizada','realizado','utilizado','utilizada','medidas','medindo',
  'metros','metro','centimetros','cm','mm','minimo','maximo','aproximadamente',
  'aproximada','aproximado','pelo','pela','cada','todos','todas','demais','outros',
  'outras','mesma','mesmo','mesmas','mesmos','esta','este','esses','essas','ser',
  'devera','deverao','estar','estarao','devem','deve','sendo','inclusive','inclusos',
  'inclusas','incluso','inclusa','durante','antes','apos','apresentar','apresentacao',
  'qualidade','padrao','profissional','profissionais','necessario','necessaria',
  'necessarios','necessarias','caracteristicas','especificacoes','especificacao'
]);

export const TERMOS_COMPOSTOS = [
  ['speed','dome'],['ar','condicionado'],['box','truss'],['line','array'],
  ['camara','fria'],['gas','natural'],['painel','led'],['painel','leds'],
  ['material','permanente'],['material','consumo'],['kit','completo']
];

export function simplificarTermoBusca(descricao) {
  if (!descricao) return '';
  let s = normalizar(descricao).replace(/[0-9]+/g, ' ').replace(/[\.\,\;\/\-]/g, ' ');
  const stopwords = new Set(['para','com','sem','por','que','dos','das','nos','nas','pra','pelo','pela','pelos','pelas','tipo','kit','set','and','the','sob','sobre','entre','ate','apos','antes','mais','menos','muito','pouco','tudo','nada','algo']);
  const palavras = s.split(/\s+/).filter(p => p.length >= 3 && !stopwords.has(p) && !PALAVRAS_OPERACIONAIS.has(p));
  if (palavras.length === 0) {
    const fallback = descricao.split(/[,.;]/)[0].trim();
    const termos = extrairTermos(fallback);
    return termos.slice(0, 2).map(t => t.palavra).join(' ') || descricao.slice(0, 30);
  }
  const usados = new Set();
  const resultado = [];
  for (const [w1, w2] of TERMOS_COMPOSTOS) {
    const i1 = palavras.indexOf(w1), i2 = palavras.indexOf(w2);
    if (i1 >= 0 && i2 >= 0 && Math.abs(i1 - i2) <= 3) {
      resultado.push(w1 + ' ' + w2); usados.add(w1); usados.add(w2);
    }
  }
  for (const p of palavras) {
    if (usados.has(p)) continue;
    if (resultado.length >= 4) break;
    resultado.push(p); usados.add(p);
  }
  return resultado.join(' ');
}

export function calcularMediana(valores) {
  const vals = valores.filter(v => v !== null && v !== undefined && !isNaN(v) && v > 0);
  if (vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calcularMedia(valores) {
  const vals = valores.filter(v => v !== null && v !== undefined && !isNaN(v) && v > 0);
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

export function calcularVariacao(valores) {
  const vals = valores.filter(v => v > 0);
  if (vals.length < 2) return 0;
  const min = Math.min(...vals), max = Math.max(...vals);
  return ((max - min) / min) * 100;
}
