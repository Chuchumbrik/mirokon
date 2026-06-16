#!/usr/bin/env node
/**
 * Проверка тестового админа: логин + is_admin().
 * Печатает готовый SQL, если пользователь не в app_admins.
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvLocal() {
  const path = resolve(root, '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const URL = process.env.SUPABASE_URL || 'https://ermeokjqkzpkefqtmvif.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_LhXYeGG0w8wzi7JOlPx5Qg_GXd2Zc0K';
const EMAIL = process.env.TEST_ADMIN_EMAIL || 'test-admin@mirokon-new.test';
const PASS = process.env.TEST_ADMIN_PASSWORD || 'MirokonTest!2026';

const sb = createClient(URL, ANON);
const { data, error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
if (error) {
  console.error('Логин не удался:', error.message);
  process.exit(1);
}

const { data: isAdmin, error: rpcErr } = await sb.rpc('is_admin');
const userId = data.user.id;

console.log('E-mail:', EMAIL);
console.log('UUID:  ', userId);
console.log('is_admin():', isAdmin);

if (rpcErr) {
  console.error('RPC ошибка:', rpcErr.message);
  process.exit(1);
}

if (!isAdmin) {
  console.log('\n⚠ Пользователь есть в Auth, но НЕ в app_admins.');
  console.log('Выполните в Supabase → SQL Editor:\n');
  console.log(`insert into public.app_admins (user_id) values ('${userId}') on conflict (user_id) do nothing;`);
  process.exit(2);
}

console.log('\n✓ Тестовый админ настроен правильно.');
process.exit(0);
