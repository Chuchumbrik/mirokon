#!/usr/bin/env node
/**
 * Создаёт тестового админа в Supabase Auth + app_admins.
 *
 * .env.local:
 *   SUPABASE_URL=https://ermeokjqkzpkefqtmvif.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...   (service_role из Dashboard → API)
 *
 * Опционально:
 *   TEST_ADMIN_EMAIL=test-admin@mirokon-new.test
 *   TEST_ADMIN_PASSWORD=MirokonTest!2026
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const DEFAULT_EMAIL = 'test-admin@mirokon-new.test';
const DEFAULT_PASSWORD = 'MirokonTest!2026';

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

function upsertEnvLocal(pairs) {
  const path = resolve(root, '.env.local');
  const lines = existsSync(path) ? readFileSync(path, 'utf8').split('\n') : [];
  const map = new Map();
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) {
      map.set(Symbol(), line);
      continue;
    }
    const k = t.slice(0, t.indexOf('=')).trim();
    map.set(k, line);
  }
  for (const [k, v] of Object.entries(pairs)) {
    map.set(k, `${k}=${v}`);
  }
  const out = [...map.values()].filter((l, i, a) => l !== '' || i < a.length - 1);
  if (!out.some(l => typeof l === 'string' && l.startsWith('#'))) {
    out.unshift('# Локальные секреты (не коммитить)');
  }
  writeFileSync(path, out.join('\n').replace(/\n+$/, '\n'), 'utf8');
}

loadEnvLocal();

const URL = process.env.SUPABASE_URL || 'https://ermeokjqkzpkefqtmvif.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const EMAIL = (process.env.TEST_ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || DEFAULT_PASSWORD;

if (!SERVICE_KEY) {
  console.error('Нужен SUPABASE_SERVICE_KEY в .env.local');
  console.error('Supabase → Project Settings → API → service_role (secret)');
  process.exit(1);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const hit = data.users.find(u => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < perPage) break;
    page++;
  }
  return null;
}

async function run() {
  console.log('Тестовый админ:', EMAIL);

  let user = await findUserByEmail(EMAIL);
  if (user) {
    console.log('Пользователь уже есть:', user.id);
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true
    });
    if (error) throw error;
    console.log('Пароль обновлён');
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true
    });
    if (error) throw error;
    user = data.user;
    console.log('Создан пользователь:', user.id);
  }

  const { error: insErr } = await admin.from('app_admins').upsert(
    { user_id: user.id },
    { onConflict: 'user_id' }
  );
  if (insErr) throw insErr;
  console.log('Запись в app_admins — ok');

  const { data: isAdmin, error: rpcErr } = await createClient(URL, process.env.SUPABASE_ANON_KEY || 'sb_publishable_LhXYeGG0w8wzi7JOlPx5Qg_GXd2Zc0K')
    .auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
    .then(async ({ data, error }) => {
      if (error) throw error;
      const sb = createClient(URL, process.env.SUPABASE_ANON_KEY || 'sb_publishable_LhXYeGG0w8wzi7JOlPx5Qg_GXd2Zc0K', {
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
      });
      return sb.rpc('is_admin');
    });
  if (rpcErr || !isAdmin) {
    console.error('Проверка is_admin не прошла:', rpcErr?.message || isAdmin);
    process.exit(1);
  }
  console.log('is_admin() = true');

  upsertEnvLocal({
    SUPABASE_URL: URL,
    ADMIN_EMAIL: EMAIL,
    ADMIN_PASSWORD: PASSWORD
  });
  console.log('\nГотово. Учётка записана в .env.local (ADMIN_EMAIL / ADMIN_PASSWORD)');
  console.log('Вход: https://mirokon-new.vercel.app/landing.html');
  console.log(`E-mail: ${EMAIL}`);
  console.log(`Пароль: ${PASSWORD}`);
}

run().catch(e => { console.error(e); process.exit(1); });
