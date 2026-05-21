// api/deepseek.js — Integração com a API DeepSeek (IA)

import { toast } from '../utils/ui.js';

const GROQ_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const IA_KEY_STORAGE = 'pncp_groq_api_key';
const IA_MODEL_STORAGE = 'pncp_groq_model';

let _iaRateLimited = false;

export function getApiKeyIA() {
  return localStorage.getItem(IA_KEY_STORAGE) || '';
}

export function getModelIA() {
  return localStorage.getItem(IA_MODEL_STORAGE) || 'deepseek-chat';
}

export function salvarChaveIA(key, model) {
  if (key) localStorage.setItem(IA_KEY_STORAGE, key);
  else localStorage.removeItem(IA_KEY_STORAGE);
  if (model) localStorage.setItem(IA_MODEL_STORAGE, model);
}

export async function chamarIA(body) {
  if (_iaRateLimited) throw new Error('DeepSeek temporariamente desabilitada (rate limit)');
  const key = getApiKeyIA();
  if (!key) return null;
  const resp = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: getModelIA(), ...body })
  });
  if (resp.status === 429) {
    const txt = await resp.text();
    const waitMatch = txt.match(/try again in (\d+)m([\d.]+)?s?/);
    const waitMs = waitMatch
      ? (parseInt(waitMatch[1]) * 60000 + parseFloat(waitMatch[2] || 0) * 1000 + 5000)
      : 65000;
    _iaRateLimited = true;
    toast('⚠ DeepSeek: limite atingido. IA pausada por ~' + Math.round(waitMs/60000) + 'min.', 'warn', 8000);
    setTimeout(() => { _iaRateLimited = false; }, waitMs);
    throw new Error('Rate limit: ' + txt.slice(0, 200));
  }
  if (!resp.ok) throw new Error('DeepSeek HTTP ' + resp.status);
  return await resp.json();
}

export async function avaliarMelhorItemComIA(descricaoTarget, unidadeTarget, itensLicitacao, precoEsperadoRef) {
  const key = getApiKeyIA();
  if (!key || !itensLicitacao || itensLicitacao.length === 0) return null;
  const lista = itensLicitacao.slice(0, 25).map((it, i) => {
    const desc = (it.descricao || it.descricaoItem || it.descricaoObj || '—').slice(0, 200);
    const un = it.unidadeMedida || it.unidade || '—';
    const num = it.numeroItem || it.numero || (i + 1);
    const vlr = parseFloat(it.valorUnitarioEstimado || it.valorEstimadoUnitario || it.valorUnitario || 0);
    const vlrTxt = vlr > 0 ? ' | Valor est.: R$ ' + vlr.toLocaleString('pt-BR', {minimumFractionDigits:2}) : '';
    return '[' + num + '] ' + desc + ' (UN: ' + un + vlrTxt + ')';
  });
  const contextoPreco = precoEsperadoRef > 0
    ? '\nFAIXA DE PREÇO ESPERADA: outros itens similares custam em torno de R$ ' + precoEsperadoRef.toLocaleString('pt-BR', {minimumFractionDigits:2}) + '.'
    : '';
  const prompt = 'Você é especialista em pesquisa de preços públicos.\n\nITEM QUE PRECISO COTAR:\nDescrição: "' + descricaoTarget + '"\nUnidade: "' + unidadeTarget + '"' + contextoPreco + '\n\nITENS ENCONTRADOS:\n' + lista.join('\n') + '\n\nQual item é mais compatível? Se nenhum for compatível, retorne null para numeroItem.\n\nResponda APENAS com JSON: {"numeroItem": <número ou null>, "scoreIA": <0.0 a 1.0>, "justificativa": "<uma linha>"}';
  try {
    const data = await chamarIA({ max_tokens: 200, temperature: 0, messages: [{ role: 'user', content: prompt }] });
    if (!data) return null;
    const texto = data?.choices?.[0]?.message?.content || '';
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const resultado = JSON.parse(match[0]);
    if (!resultado.numeroItem) return null;
    return { numeroItem: resultado.numeroItem, scoreIA: parseFloat(resultado.scoreIA) || 0.5, justificativa: resultado.justificativa || '' };
  } catch (e) {
    console.warn('Erro IA:', e.message);
    return null;
  }
}

export async function gerarTermosBuscaComIA(descricao, unidade) {
  const key = getApiKeyIA();
  if (!key) return null;
  const prompt = 'Gere 3 variações de termos de busca para encontrar licitações públicas sobre: "' + descricao + '" (unidade: ' + unidade + ').\n\nResponda APENAS com JSON: {"termos": ["termo1", "termo2", "termo3"]}';
  try {
    const data = await chamarIA({ max_tokens: 150, temperature: 0.3, messages: [{ role: 'user', content: prompt }] });
    if (!data) return null;
    const texto = data?.choices?.[0]?.message?.content || '';
    const match = texto.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (e) {
    console.warn('Erro ao gerar termos com IA:', e.message);
    return null;
  }
}
