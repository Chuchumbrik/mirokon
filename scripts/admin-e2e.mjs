#!/usr/bin/env node
/**
 * Полный цикл админки через Supabase API.
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
const EMAIL = process.env.ADMIN_EMAIL || process.env.TEST_ADMIN_EMAIL || 'test-admin@mirokon-new.test';
const PASS = process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || 'MirokonTest!2026';

const sb = createClient(URL, ANON);
const stamp = Date.now();
const results = [];

function ok(name, detail) { results.push({ name, ok: true, detail }); console.log('✓', name, detail || ''); }
function fail(name, detail) { results.push({ name, ok: false, detail }); console.error('✗', name, detail); }

async function run() {
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (authErr) { fail('логин', authErr.message); process.exit(1); }
  ok('логин', auth.user?.email);

  const { data: isAdmin, error: adminErr } = await sb.rpc('is_admin');
  if (adminErr || !isAdmin) { fail('is_admin', adminErr?.message || 'false'); process.exit(1); }
  ok('is_admin', 'true');

  const { data: row } = await sb.from('site_settings').select('data').eq('id', 1).single();
  const base = row?.data || {};
  const suffix = String(stamp).slice(-4);
  const newPhone = '7999000' + suffix;
  const newDisplay = '+7 (999) 000-' + suffix;
  const newEmail = 'e2e' + suffix + '@mirokon.test';
  const data = {
    ...base,
    phone: newPhone,
    phone_display: newDisplay,
    email: newEmail,
    hero: { ...(base.hero || {}), eyebrow: '● API-тест ' + suffix },
    footer: { ...(base.footer || {}), copyright: '© API E2E ' + suffix },
    privacy_html: '<h2>Тест политики</h2><p>E2E ' + suffix + '</p>'
  };
  const pricing = { ...(base.pricing || {}), base_per_m: 2600 };
  const { error: setErr } = await sb.from('site_settings').upsert({ id: 1, data: { ...data, pricing }, updated_at: new Date().toISOString() });
  if (setErr) fail('настройки+прайс', setErr.message);
  else ok('настройки+прайс', newDisplay);

  const reviewText = 'UI-тест отзыв ' + stamp;
  const { data: rev, error: revErr } = await sb.from('reviews').insert({
    author_name: 'Тест UI', author_city: 'Москва', rating: 5, text: reviewText, approved: true
  }).select('id').single();
  if (revErr) fail('отзыв: добавить', revErr.message);
  else ok('отзыв: добавить', rev.id);

  const { error: revUpdErr } = await sb.from('reviews').update({ text: reviewText + ' [edit]' }).eq('id', rev.id);
  if (revUpdErr) fail('отзыв: редактировать', revUpdErr.message);
  else ok('отзыв: редактировать', '');

  const newsTitle = 'UI-тест новость ' + stamp;
  const { data: news, error: newsErr } = await sb.from('news').insert({
    title: newsTitle, preview_text: 'Автотест', body: 'Полный текст ' + stamp, published: true
  }).select('id').single();
  if (newsErr) fail('новость: добавить', newsErr.message);
  else ok('новость: add+body', news.id);

  const pub = createClient(URL, ANON);
  const { data: pubSettings } = await pub.from('site_settings').select('data').eq('id', 1).single();
  const d = pubSettings?.data || {};
  if (d.phone === newPhone && d.email === newEmail && d.footer?.copyright?.includes('API E2E') && d.privacy_html?.includes('E2E'))
    ok('публичные настройки', newEmail);
  else fail('публичные настройки', JSON.stringify({ phone: d.phone, email: d.email }));

  const { data: pubRev } = await pub.from('reviews').select('text').eq('id', rev.id).single();
  if (pubRev?.text?.includes('[edit]')) ok('публичный отзыв (edit)', '');
  else fail('публичный отзыв (edit)', pubRev?.text);

  const { data: pubNews } = await pub.from('news').select('body').eq('id', news.id).single();
  if (pubNews?.body?.includes(String(stamp))) ok('публичная новость (body)', '');
  else fail('публичная новость (body)', pubNews?.body);

  if (rev?.id) await sb.from('reviews').delete().eq('id', rev.id);
  if (news?.id) await sb.from('news').delete().eq('id', news.id);
  const restored = {
    ...base,
    phone: base.phone,
    phone_display: base.phone_display,
    email: base.email,
    hero: base.hero,
    footer: base.footer,
    privacy_html: base.privacy_html,
    pricing: base.pricing
  };
  await sb.from('site_settings').upsert({ id: 1, data: restored, updated_at: new Date().toISOString() });
  ok('очистка', 'откат');

  await sb.auth.signOut();
  const passed = results.filter(r => r.ok).length;
  console.log(`\nИтого: ${passed}/${results.length}`);
  process.exit(passed === results.length ? 0 : 1);
}

run().catch(e => { console.error(e); process.exit(1); });
