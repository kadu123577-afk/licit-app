// utils/format.js — Funções de formatação de dados

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

export function fmtMoeda(v) {
  if (v === null || v === undefined || isNaN(v)) return 'R$ 0,00';
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtData(d) {
  if (!d) return '—';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleDateString('pt-BR');
  } catch { return d; }
}

export function fmtCNPJ(c) {
  if (!c) return '—';
  const s = String(c).replace(/\D/g, '').padStart(14, '0');
  return s.slice(0,2)+'.'+s.slice(2,5)+'.'+s.slice(5,8)+'/'+s.slice(8,12)+'-'+s.slice(12);
}

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function dataParaApi(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return y + m + day;
}

export function truncar(s, n) {
  if (!s) return '';
  s = String(s);
  return s.length > n ? s.slice(0, n) + '...' : s;
}
