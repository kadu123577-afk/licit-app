// export/backup.js — Exportação e importação de backup

import { state, salvarEstado } from '../state.js';
import { toast } from '../utils/ui.js';

export function exportarBackup() {
  const dados = {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    cotacoes: state.cotacoes
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup-pesquisa-precos-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup exportado com sucesso', 'success');
}

export function exportarCotacaoJSON(id) {
  const cot = state.cotacoes.find(c => c.id === id);
  if (!cot) { toast('Cotação não encontrada', 'error'); return; }
  const blob = new Blob([JSON.stringify(cot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cotacao-' + (cot.titulo || id) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function importarBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const dados = JSON.parse(e.target.result);
      if (!dados.cotacoes || !Array.isArray(dados.cotacoes)) {
        toast('Arquivo inválido', 'error'); return;
      }
      const novas = dados.cotacoes.filter(n => !state.cotacoes.find(e => e.id === n.id));
      state.cotacoes = [...state.cotacoes, ...novas];
      salvarEstado();
      toast(novas.length + ' cotação(ões) importada(s)', 'success');
      window.navigate && navigate('home');
    } catch(err) {
      toast('Erro ao importar: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}
