// src/main.js — Ponto de entrada do aplicativo Licit.ai
// Importa todos os módulos e expõe as funções globalmente
// para compatibilidade com os onclick handlers do index.html

import { uid, fmtMoeda, fmtData, fmtCNPJ, escapeHtml, dataParaApi, truncar } from './utils/format.js';
import { normalizar, stem, extrairTermos, calcularScore, calcularMediana, calcularMedia, calcularVariacao, simplificarTermoBusca, PALAVRAS_OPERACIONAIS, TERMOS_COMPOSTOS } from './utils/text.js';
import { toast, abrirModal, fecharModal, confirmar } from './utils/ui.js';
import { state, carregarEstado, salvarEstado, STORAGE_KEY, MODALIDADES, PNCP_BASE } from './state.js';
import { fetchComRetry, buscarContratacoes, buscarItensContratacao, buscarResultadosItem, isProtocoloFile } from './api/pncp.js';
import { getApiKeyIA, getModelIA, chamarIA, avaliarMelhorItemComIA, gerarTermosBuscaComIA } from './api/deepseek.js';
import { calcularScorePonderado, unidadeCompativel, vetoCategoria, vetoDensidade, vetoNumerico, vetoTeto } from './engine/scoring.js';
import { gerarVariacoesQuery, obterCodigoCAT, buscarCandidatos } from './engine/search.js';
import { exportarBackup, exportarCotacaoJSON, importarBackup } from './export/backup.js';

// Expõe tudo globalmente para os onclick handlers do HTML
Object.assign(window, {
  // utils
  uid, fmtMoeda, fmtData, fmtCNPJ, escapeHtml, dataParaApi, truncar,
  normalizar, stem, extrairTermos, calcularScore, calcularMediana, calcularMedia,
  calcularVariacao, simplificarTermoBusca,
  toast, abrirModal, fecharModal, confirmar,
  // state
  state, carregarEstado, salvarEstado,
  // api
  fetchComRetry, buscarContratacoes, buscarItensContratacao, buscarResultadosItem, isProtocoloFile,
  getApiKeyIA, getModelIA, chamarIA, avaliarMelhorItemComIA, gerarTermosBuscaComIA,
  // engine
  calcularScorePonderado, unidadeCompativel, vetoCategoria, vetoDensidade, vetoNumerico, vetoTeto,
  gerarVariacoesQuery, obterCodigoCAT, buscarCandidatos,
  // export
  exportarBackup, exportarCotacaoJSON, importarBackup,
  // constantes
  PALAVRAS_OPERACIONAIS, TERMOS_COMPOSTOS, MODALIDADES, PNCP_BASE,
});

console.log('[Licit.ai] Módulos carregados com sucesso.');
