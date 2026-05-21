// src/auth.js — Autenticação com Supabase

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cputbtpimcwgxpsmfamn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_2u7rKW4GjWSryV9MDdRGAg_xS6nxKtI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Retorna sessão atual
export async function getSessao() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Login com email e senha
export async function login(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
  return data;
}

// Logout
export async function logout() {
  await supabase.auth.signOut();
}

// Busca dados do usuário no banco
export async function getDadosUsuario(email) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*, organizacoes(*)')
    .eq('email', email)
    .single();
  if (error) return null;
  return data;
}

// Verifica se o acesso está válido
export function verificarAcesso(usuario) {
  if (!usuario) return { ok: false, motivo: 'Usuário não encontrado' };
  if (!usuario.ativo) return { ok: false, motivo: 'Usuário inativo' };
  const org = usuario.organizacoes;
  if (!org) return { ok: false, motivo: 'Organização não encontrada' };
  if (!org.ativo) return { ok: false, motivo: 'Acesso bloqueado. Entre em contato.' };
  if (org.plano === 'bloqueado') return { ok: false, motivo: 'Acesso suspenso por inadimplência.' };
  if (org.validade && new Date(org.validade) < new Date()) {
    return { ok: false, motivo: 'Período de acesso encerrado.' };
  }
  return { ok: true };
}
