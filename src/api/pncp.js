// api/pncp.js — Comunicação com a API do PNCP

import { dataParaApi } from '../utils/format.js';

const PNCP_BASE = '';
let ultimoErroFetch = null;

export function isProtocoloFile() {
  return window.location.protocol === 'file:';
}

export async function fetchComRetry(url, tentativas = 2) {
  let ultimoErro = null;
  for (let i = 0; i < tentativas; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const resp = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timer);
      if (resp.status === 204) return null;
      if (resp.status === 404) return null;
      if (resp.status === 429) {
        ultimoErro = new Error('Rate limit (429)');
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      if (resp.status === 500 || resp.status === 502 || resp.status === 503) {
        ultimoErro = new Error('HTTP ' + resp.status);
        await new Promise(r => setTimeout(r, 1500 * (i + 1)));
        continue;
      }
      if (!resp.ok) throw new Error('HTTP ' + resp.status + ' ' + resp.statusText);
      return await resp.json();
    } catch (e) {
      ultimoErro = e;
      ultimoErroFetch = { url, message: e.message, name: e.name };
      if (i === tentativas - 1) throw e;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw ultimoErro;
}

export async function buscarContratacoes(query, uf, pagina = 1, tipoDoc = 'edital', meses = 24, extras = {}) {
  const dataFim = new Date();
  const dataIni = new Date();
  dataIni.setMonth(dataIni.getMonth() - meses);
  const params = new URLSearchParams({
    q: query, pagina, tamanhoPagina: 50, tipos_documento: tipoDoc,
    dataPublicacaoInicio: dataParaApi(dataIni),
    dataPublicacaoFim: dataParaApi(dataFim),
  });
  if (uf) params.set('uf', uf);
  if (extras.codigoItem) params.set('codigoItem', extras.codigoItem);
  const url = PNCP_BASE + '/api/search?' + params;
  const resp = await fetchComRetry(url);
  if (!resp) return { items: [], total: 0 };
  return {
    items: resp.items || resp.data || (Array.isArray(resp) ? resp : []),
    total: resp.total || 0
  };
}

export async function buscarItensContratacao(cnpj, ano, sequencial) {
  const urlNova = PNCP_BASE + '/api/pncp/v1/contratacoes/' + cnpj + '/' + ano + '/' + sequencial + '/itens?pagina=1&tamanhoPagina=500';
  const urlAntiga = PNCP_BASE + '/api/pncp/v1/orgaos/' + cnpj + '/compras/' + ano + '/' + sequencial + '/itens?pagina=1&tamanhoPagina=500';
  let resp = null;
  try { resp = await fetchComRetry(urlNova, 1); } catch(e) {
    if (e.name === 'TypeError' || (e.message && e.message.includes('ERR_CONNECTION_REFUSED'))) throw e;
  }
  if (!resp) {
    try { resp = await fetchComRetry(urlAntiga, 1); } catch(e) {
      if (e.name === 'TypeError' || (e.message && e.message.includes('ERR_CONNECTION_REFUSED'))) throw e;
    }
  }
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (resp.data && Array.isArray(resp.data)) return resp.data;
  if (resp.items && Array.isArray(resp.items)) return resp.items;
  const arrKey = Object.keys(resp).find(k => Array.isArray(resp[k]));
  if (arrKey) return resp[arrKey];
  return [];
}

export async function buscarResultadosItem(cnpj, ano, sequencial, numeroItem) {
  const urlNova = PNCP_BASE + '/api/pncp/v1/contratacoes/' + cnpj + '/' + ano + '/' + sequencial + '/itens/' + numeroItem + '/resultados';
  const urlAntiga = PNCP_BASE + '/api/pncp/v1/orgaos/' + cnpj + '/compras/' + ano + '/' + sequencial + '/itens/' + numeroItem + '/resultados';
  try {
    let resp = null;
    try { resp = await fetchComRetry(urlNova, 1); } catch(e) {
      if (e.name === 'TypeError' || (e.message && e.message.includes('ERR_CONNECTION_REFUSED'))) throw e;
    }
    if (!resp) {
      try { resp = await fetchComRetry(urlAntiga, 1); } catch(e) {
        if (e.name === 'TypeError' || (e.message && e.message.includes('ERR_CONNECTION_REFUSED'))) throw e;
      }
    }
    if (!resp) return [];
    if (Array.isArray(resp)) return resp;
    if (resp.data && Array.isArray(resp.data)) return resp.data;
    if (resp.items && Array.isArray(resp.items)) return resp.items;
    const arrKey = Object.keys(resp).find(k => Array.isArray(resp[k]));
    if (arrKey) return resp[arrKey];
    return [];
  } catch (e) { return []; }
}
