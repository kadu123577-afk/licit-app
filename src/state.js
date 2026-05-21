// state.js — Estado global e persistência

export const STORAGE_KEY = 'pncp_pesquisa_precos_v1';
export const PNCP_BASE = '';

export const MODALIDADES = {
  1: 'Leilão (eletrônico)',
  2: 'Diálogo Competitivo',
  3: 'Concurso',
  4: 'Concorrência (eletrônica)',
  5: 'Concorrência (presencial)',
  6: 'Pregão (eletrônico)',
  7: 'Pregão (presencial)',
  8: 'Dispensa de Licitação',
  9: 'Inexigibilidade',
  10: 'Manifestação de Interesse',
  11: 'Pré-qualificação',
  12: 'Credenciamento',
  13: 'Leilão (presencial)'
};

export const state = {
  cotacoes: [],
  cotacaoAtual: null,
  itemAtual: null,
  resultadosBusca: [],
  busca: { abortar: false },
  baseLocal: {
    ultimoSync: null,
    totalContratacoes: 0,
    sincronizando: false,
    cancelarSync: false
  }
};

export function carregarEstado() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      state.cotacoes = data.cotacoes || [];
    }
  } catch (e) {
    console.error('Erro ao carregar estado:', e);
  }
}

export function salvarEstado() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cotacoes: state.cotacoes,
      versao: 1,
      atualizadoEm: new Date().toISOString()
    }));
  } catch (e) {
    console.warn('Erro ao salvar');
  }
}
