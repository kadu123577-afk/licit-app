// utils/ui.js — Toasts, modais, navegação

export function toast(msg, tipo = 'info', duracao = 3500) {
  const cont = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.textContent = msg;
  cont.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, duracao);
}

export function abrirModal(id) {
  document.getElementById(id).classList.add('show');
}

export function fecharModal(id) {
  document.getElementById(id).classList.remove('show');
}

export function confirmar(titulo, msg, callback) {
  document.getElementById('confirm-title').textContent = titulo;
  document.getElementById('confirm-msg').textContent = msg;
  const btn = document.getElementById('confirm-ok');
  btn.onclick = () => { fecharModal('modal-confirm'); callback(); };
  abrirModal('modal-confirm');
}
