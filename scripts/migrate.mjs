#!/usr/bin/env node
/**
 * Прогон SQL-миграций из docs/ через DATABASE_URL в .env.local
 * Использование: npm run migrate
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

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

const MIGRATIONS = [
  'docs/supabase-site-settings.sql',
  'docs/supabase-site-settings-stage2.sql',
];

loadEnvLocal();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Нет DATABASE_URL. Создайте .env.local по образцу .env.local.example');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Подключено к БД.\n');
  for (const rel of MIGRATIONS) {
    const path = resolve(root, rel);
    if (!existsSync(path)) {
      console.warn('Пропуск (файл не найден):', rel);
      continue;
    }
    const sql = readFileSync(path, 'utf8');
    console.log('→', rel);
    try {
      await client.query(sql);
      console.log('  OK\n');
    } catch (e) {
      console.error('  ОШИБКА:', e.message);
      if (!e.message.includes('already exists')) process.exit(1);
      console.log('  (продолжаем)\n');
    }
  }
  const r = await client.query(`
    select id,
      (data ? 'pricing') as has_pricing,
      data->'pricing'->>'base_per_m' as base_per_m,
      data->'hero'->>'eyebrow' as hero_eyebrow
    from public.site_settings where id = 1
  `);
  console.log('site_settings:', r.rows[0] || 'нет строки id=1');
  await client.end();
  console.log('\nГотово.');
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
