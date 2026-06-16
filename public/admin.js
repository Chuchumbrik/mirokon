const SUPABASE_URL = 'https://ermeokjqkzpkefqtmvif.supabase.co';
const SUPABASE_ANON = 'sb_publishable_LhXYeGG0w8wzi7JOlPx5Qg_GXd2Zc0K';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
const $ = id => document.getElementById(id);
const safeUrl = u => (u && /^(https?:\/\/|\/)/i.test(u)) ? u : '';

function toast(msg, isErr, isWarn) {
  const t = $('toast'); t.textContent = msg;
  t.className = 'toast show' + (isErr ? ' err' : isWarn ? ' warn' : '');
  setTimeout(() => { t.className = 'toast'; }, isWarn ? 4000 : 2600);
}

let formDirty = false;
let activeTab = 'leads';

function markDirty() { formDirty = true; }
function clearDirty() { formDirty = false; }

function showListLoading(boxId, msg) {
  const box = $(boxId);
  if (!box) return;
  box.replaceChildren();
  box.appendChild(el('div', { class: 'list-loading', text: msg || 'Загрузка…' }));
}

function inlinePrompt(title, defaultValue) {
  return new Promise(resolve => {
    const back = $('inline-prompt');
    const input = $('inline-prompt-input');
    if (!back || !input) { resolve(null); return; }
    $('inline-prompt-title').textContent = title;
    input.value = defaultValue || '';
    back.style.display = 'flex';
    input.focus();
    input.select();
    const finish = val => {
      back.style.display = 'none';
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      input.onkeydown = null;
      resolve(val);
    };
    const okBtn = $('inline-prompt-ok');
    const cancelBtn = $('inline-prompt-cancel');
    okBtn.onclick = () => finish(input.value.trim() || null);
    cancelBtn.onclick = () => finish(null);
    input.onkeydown = e => {
      if (e.key === 'Enter') { e.preventDefault(); finish(input.value.trim() || null); }
      else if (e.key === 'Escape') finish(null);
    };
  });
}

function initDirtyGuard() {
  document.addEventListener('input', e => {
    if (e.target.matches('input:not([type=hidden]), textarea, select') && e.target.closest('.wrap')) markDirty();
  }, true);
  document.addEventListener('change', e => {
    if (e.target.matches('input[type=file], input[type=checkbox]') && e.target.closest('.wrap')) markDirty();
  }, true);
  window.addEventListener('beforeunload', e => {
    if (formDirty) { e.preventDefault(); e.returnValue = ''; }
  });
}
// безопасный конструктор элементов (текст через textContent)
function el(tag, opts, ...kids) {
  const e = document.createElement(tag); opts = opts || {};
  if (opts.class) e.className = opts.class;
  if (opts.text != null) e.textContent = opts.text;
  if (opts.html === 'svg-win') e.innerHTML = '🪟';
  Object.entries(opts).forEach(([k, v]) => { if (['class','text','html'].includes(k)) return; if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); });
  kids.forEach(k => k && e.appendChild(k));
  return e;
}

// ---- Auth guard ----
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return location.replace('/landing.html');
  const { data: admin, error } = await sb.rpc('is_admin');
  if (error || !admin) { await sb.auth.signOut(); alert('Нет прав администратора'); return location.replace('/landing.html'); }
  $('admin-email').textContent = session.user.email;
  AdminValidate.initAdminUX();
  initDirtyGuard();
  switchTab(sessionStorage.getItem('adminTab') || 'leads', true);
  loadLeads(); loadWorks(); loadCategories(); loadReviews(); loadNews(); loadSiteSettingsForm();
})();

async function logout() { await sb.auth.signOut(); location.replace('/landing.html'); }

function switchTab(name, force) {
  if (!force && formDirty && name !== activeTab) {
    if (!confirm('Есть несохранённые изменения. Перейти без сохранения?')) return;
    clearDirty();
  }
  activeTab = name;
  try { sessionStorage.setItem('adminTab', name); } catch (_) {}
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
}

// ================= LEADS (заявки) =================
let leadFilter = 'new';
function setLeadFilter(f) {
  leadFilter = f;
  document.querySelectorAll('.filters .f[data-lf]').forEach(x => x.classList.toggle('active', x.dataset.lf === f));
  loadLeads();
}
async function loadLeads() {
  showListLoading('leads-list');
  const box = $('leads-list');
  let q = sb.from('leads').select('*').order('created_at', { ascending: false });
  if (leadFilter === 'new') q = q.eq('processed', false);
  else if (leadFilter === 'processed') q = q.eq('processed', true);
  const { data, error } = await q;
  if (error) return toast('Ошибка загрузки заявок', true);
  if (!data.length) { box.appendChild(el('div', { class: 'empty', text: 'Нет заявок в этой категории' })); return; }
  data.forEach(l => {
    const badge = el('span', { class: 'badge ' + (l.processed ? 'on' : 'off'), text: l.processed ? 'обработана' : 'новая' });
    const head = el('div', { class: 'lead-card-head' },
      el('div', { class: 'lead-card-name', text: l.name || '—' }),
      el('div', { class: 'lead-card-acts' },
        badge,
        el('button', { class: l.processed ? 'btn btn-ghost' : 'btn btn-ok', text: l.processed ? 'Вернуть' : 'Обработана',
          onclick: () => moderateLead(l.id, l.processed ? 'unprocess' : 'process') }),
        el('button', { class: 'btn btn-danger', text: 'Удалить', onclick: () => moderateLead(l.id, 'delete') })
      )
    );
    const body = el('div', { class: 'lead-card-body' },
      el('a', { class: 'lead-card-phone', href: 'tel:' + (l.phone || '').replace(/[^\d+]/g, ''), text: l.phone || '—' })
    );
    if (l.message) body.appendChild(el('div', { class: 'lead-card-msg', text: l.message }));
    if (l.cart_items && l.cart_items.length) {
      const cartDiv = el('div', { class: 'lead-cart' });
      let total = 0;
      l.cart_items.forEach((item, i) => {
        total += item.price || 0;
        const row = el('div', { class: 'lead-cart-row' });
        row.appendChild(el('div', { class: 'lcr-main' },
          el('span', { class: 'lcr-idx', text: (i + 1) + '.' }),
          el('span', { class: 'lcr-name', text: item.type }),
          el('span', { class: 'lcr-price', text: '~' + (item.price || 0).toLocaleString('ru-RU') + ' ₽' })
        ));
        const specs = [item.profile, item.glass, item.hardware].filter(Boolean).join(' · ');
        row.appendChild(el('div', { class: 'lcr-size', text: item.width + '×' + item.height + ' мм' + (specs ? '  ·  ' + specs : '') }));
        cartDiv.appendChild(row);
      });
      const n = l.cart_items.length, word = n === 1 ? 'позицию' : n <= 4 ? 'позиции' : 'позиций';
      cartDiv.appendChild(el('div', { class: 'lead-cart-total' },
        el('span', { class: 'lct-lbl', text: 'Итого за ' + n + ' ' + word }),
        el('span', { class: 'lct-sum', text: '~' + total.toLocaleString('ru-RU') + ' ₽' })
      ));
      body.appendChild(cartDiv);
    }
    body.appendChild(el('div', { class: 'lead-card-when', text: new Date(l.created_at).toLocaleString('ru-RU') }));
    box.appendChild(el('div', { class: 'lead-card' }, head, body));
  });
}
async function moderateLead(id, action) {
  if (action === 'delete' && !confirm('Удалить заявку безвозвратно?')) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return location.replace('/landing.html');
    const res = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({ type: 'lead', id, action })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || ('код ' + res.status));
    toast(action === 'delete' ? 'Удалено' : action === 'process' ? 'Обработана' : 'Возвращено в работу');
    loadLeads();
  } catch (e) {
    toast('Ошибка: ' + (e.message || e), true);
  }
}

// ================= WORKS =================
let WORKS_LIST = [];
async function loadWorks() {
  showListLoading('works-list');
  const box = $('works-list');
  const { data, error } = await sb.from('works').select('*, work_photos(id)').order('sort').order('created_at', { ascending: false });
  if (error) return toast('Ошибка загрузки работ', true);
  if (!data.length) { WORKS_LIST = []; box.appendChild(el('div', { class: 'empty', text: 'Пока нет работ' })); return; }
  WORKS_LIST = data;
  data.forEach(w => {
    const img = safeUrl(w.image_url);
    const thumb = img ? el('img', { class: 'thumb', src: img, alt: '' }) : el('div', { class: 'thumb', text: '🪟' });
    const badge = el('span', { class: 'badge ' + (w.published ? 'on' : 'off'), text: w.published ? 'на сайте' : 'черновик' });
    const photoCount = w.work_photos?.length || 0;
    const meta = [w.category, w.description].filter(Boolean).join(' · ');
    const actions = el('div', { class: 'li-actions' },
      badge,
      el('button', { class: 'btn btn-ghost', text: w.published ? 'Снять' : 'Опубликовать', onclick: () => togglePublish('works', w.id, !w.published) }),
      el('button', { class: 'btn btn-ghost', text: 'Изменить', onclick: () => editWork(w) }),
      el('button', { class: 'btn btn-ghost', text: 'Дублировать', onclick: () => duplicateWork(w) }),
      el('button', { class: 'btn btn-danger', text: 'Удалить', onclick: () => del('works', w.id) })
    );
    const handle = el('span', { class: 'drag-handle', text: '⋮⋮', title: 'Перетащите для сортировки' });
    const row = el('div', { class: 'list-item', 'data-id': w.id }, handle, thumb,
      el('div', { class: 'li-body' },
        el('div', { class: 't', text: w.title }),
        el('div', { class: 'm', text: [meta, photoCount ? photoCount + ' фото' : ''].filter(Boolean).join(' · ') })),
      actions);
    box.appendChild(row);
  });
  initWorksDrag();
}

function initWorksDrag() {
  const box = $('works-list'); if (!box) return;
  let dragId = null;
  box.querySelectorAll('.list-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragId = item.dataset.id;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    item.addEventListener('drop', e => {
      e.preventDefault();
      const targetId = item.dataset.id;
      if (dragId && targetId && dragId !== targetId) reorderWorks(dragId, targetId);
    });
    const handle = item.querySelector('.drag-handle');
    if (handle) handle.addEventListener('mousedown', () => { item.draggable = true; });
    item.addEventListener('dragend', () => { item.draggable = false; });
  });
}

async function reorderWorks(fromId, toId) {
  const from = WORKS_LIST.findIndex(w => w.id === fromId);
  const to = WORKS_LIST.findIndex(w => w.id === toId);
  if (from < 0 || to < 0) return;
  const moved = WORKS_LIST.splice(from, 1)[0];
  WORKS_LIST.splice(to, 0, moved);
  const res = await Promise.all(WORKS_LIST.map((w, i) => sb.from('works').update({ sort: i }).eq('id', w.id)));
  if (res.some(r => r.error)) return toast('Ошибка сортировки', true);
  toast('Порядок работ сохранён');
  loadWorks();
}
function editWork(w) {
  $('w-id').value = w.id; $('w-title').value = w.title || ''; $('w-category').value = w.category || '';
  $('w-desc').value = w.description || ''; $('w-published').checked = !!w.published;
  $('w-system').value = w.system || ''; $('w-pricefrom').value = w.price_from || ''; $('w-duration').value = w.duration_days || '';
  $('w-area').value = w.area || ''; $('w-warranty').value = w.warranty || ''; $('w-tpltype').value = w.tpl_window_type || '';
  const scopeSet = new Set(w.scope || []);
  $('w-scope').querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = scopeSet.has(cb.value));
  $('works-form-title').textContent = 'Изменить работу';
  $('w-newphoto-wrap').style.display = 'none';
  $('w-photos-section').style.display = 'block';
  wCoverUrl = w.image_url || null;
  loadWorkPhotos(w.id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// создать новую работу на основе существующей (поля копируются, фото — нет)
function duplicateWork(w) {
  resetWorkForm();
  $('w-title').value = (w.title || '') + ' (копия)';
  $('w-category').value = w.category || '';
  $('w-desc').value = w.description || '';
  $('w-system').value = w.system || ''; $('w-pricefrom').value = w.price_from || ''; $('w-duration').value = w.duration_days || '';
  $('w-area').value = w.area || ''; $('w-warranty').value = w.warranty || ''; $('w-tpltype').value = w.tpl_window_type || '';
  const scopeSet = new Set(w.scope || []);
  $('w-scope').querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = scopeSet.has(cb.value));
  $('w-published').checked = false;
  $('works-form-title').textContent = 'Новая работа на основе «' + (w.title || '') + '»';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Заполнено по образцу — добавьте фото и сохраните');
}
function resetWorkForm() {
  ['w-id','w-title','w-category','w-desc','w-photo','w-system','w-pricefrom','w-duration','w-area','w-warranty'].forEach(i => $(i).value = '');
  $('w-tpltype').value = '';
  $('w-scope').querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false);
  $('w-published').checked = false; $('works-form-title').textContent = 'Добавить работу';
  $('w-newphoto-wrap').style.display = 'block';
  $('w-photos-section').style.display = 'none';
  wpCache = []; wCoverUrl = null; $('w-photo-grid').replaceChildren();
  const z = $('w-add-zone'); if (z) { z.textContent = '⬆ Перетащите фото сюда или нажмите, чтобы выбрать'; z.style.pointerEvents = ''; }
}
async function saveWork() {
  if (!validateWorkForm()) return;
  const title = $('w-title').value.trim();
  const btn = $('w-save'); btn.disabled = true; btn.textContent = 'Сохранение…';
  try {
    const id = $('w-id').value;
    let image_url = null, coverPath = null;
    if (!id) {
      const file = $('w-photo').files[0];
      if (file) {
        if (file.size > 15 * 1024 * 1024) throw new Error('Файл больше 15 МБ');
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        coverPath = `${crypto.randomUUID()}.${ext}`;
        const up = await sb.storage.from('works').upload(coverPath, file, { cacheControl: '3600', upsert: false });
        if (up.error) throw up.error;
        image_url = sb.storage.from('works').getPublicUrl(coverPath).data.publicUrl;
      }
    }
    const scope = [...$('w-scope').querySelectorAll('input[type=checkbox]:checked')].map(cb => cb.value);
    const row = { title, category: $('w-category').value.trim() || null, description: $('w-desc').value.trim() || null,
      published: $('w-published').checked,
      system: $('w-system').value.trim() || null,
      price_from: parseInt($('w-pricefrom').value, 10) || null,
      duration_days: parseInt($('w-duration').value, 10) || null,
      area: $('w-area').value.trim() || null,
      warranty: $('w-warranty').value.trim() || null,
      tpl_window_type: $('w-tpltype').value || null,
      scope: scope.length ? scope : null };
    if (!id) row.sort = WORKS_LIST.length;
    if (image_url) row.image_url = image_url;
    if (id) {
      const res = await sb.from('works').update(row).eq('id', id);
      if (res.error) throw res.error;
      toast('Сохранено'); clearDirty(); loadWorks();
    } else {
      const res = await sb.from('works').insert(row).select('id').single();
      if (res.error) throw res.error;
      const newId = res.data.id;
      if (image_url) {
        const ins = await sb.from('work_photos').insert({ work_id: newId, url: image_url, storage_path: coverPath, sort: 0 });
        if (ins.error) toast('Фото сохранено, но не добавлено в галерею: ' + ins.error.message, true);
      }
      $('w-id').value = newId;
      $('works-form-title').textContent = 'Изменить работу';
      $('w-newphoto-wrap').style.display = 'none';
      $('w-photos-section').style.display = 'block';
      $('w-photo').value = '';
      await loadWorkPhotos(newId);
      toast('Сохранено — теперь можно добавить больше фото'); clearDirty(); loadWorks();
    }
  } catch (e) { toast('Ошибка: ' + (e.message || e), true); }
  finally { btn.disabled = false; btn.textContent = 'Сохранить'; }
}

// ================= PHOTO GALLERY =================
let wpCache = [], lbPhotos = [], lbIdx = 0, wpMoving = false, wCoverUrl = null;

async function loadWorkPhotos(workId) {
  const { data, error } = await sb.from('work_photos').select('*').eq('work_id', workId).order('sort').order('created_at');
  if (error) { toast('Ошибка загрузки фото', true); return; }
  wpCache = data || [];
  renderWpGrid();
}

function renderWpGrid() {
  const grid = $('w-photo-grid'); grid.replaceChildren();
  if (!wCoverUrl && wpCache.length) wCoverUrl = wpCache[0].url; // дефолт — первое фото
  wpCache.forEach((ph, i) => {
    const isCover = ph.url === wCoverUrl;
    const card = document.createElement('div'); card.className = 'ph-card';
    const img = el('img', { src: safeUrl(ph.url), alt: '' });
    img.addEventListener('click', () => openLb(i));
    const ov = el('div', { class: 'ph-ov' });
    const topRow = el('div', { class: 'ph-row' });
    if (i > 0) topRow.appendChild(el('button', { class: 'ph-b', text: '↑', title: 'Выше', onclick: (e) => { e.stopPropagation(); moveWp(ph.id, -1); } }));
    if (i < wpCache.length - 1) topRow.appendChild(el('button', { class: 'ph-b', text: '↓', title: 'Ниже', onclick: (e) => { e.stopPropagation(); moveWp(ph.id, 1); } }));
    const botRow = el('div', { class: 'ph-row' });
    if (!isCover) botRow.appendChild(el('button', { class: 'ph-b cover', text: '★ Обложкой', title: 'Сделать обложкой', onclick: (e) => { e.stopPropagation(); setCover(ph.url); } }));
    botRow.appendChild(el('button', { class: 'ph-b rm', text: '✕', title: 'Удалить', onclick: (e) => { e.stopPropagation(); delWp(ph.id, ph.storage_path); } }));
    ov.appendChild(topRow); ov.appendChild(botRow);
    card.appendChild(img); card.appendChild(ov);
    if (isCover) card.appendChild(el('div', { class: 'ph-cover-badge', text: '★ Обложка' }));
    grid.appendChild(card);
  });
}
async function setCover(url) {
  const workId = $('w-id').value; if (!workId) return;
  const { error } = await sb.from('works').update({ image_url: url }).eq('id', workId);
  if (error) return toast('Ошибка: ' + error.message, true);
  wCoverUrl = url; renderWpGrid(); loadWorks(); toast('Обложка обновлена');
}

async function addWorkPhotos(files) {
  if (!files.length) return;
  const workId = $('w-id').value;
  if (!workId) { toast('Сначала сохраните работу', true); return; }
  const MAX = 15 * 1024 * 1024;
  for (const f of files) {
    if (f.size > MAX) return toast(`"${f.name}" больше 15 МБ`, true);
  }
  const zone = $('w-add-zone');
  const wasEmpty = wpCache.length === 0;
  let nextSort = wpCache.length ? Math.max(...wpCache.map(p => p.sort)) + 1 : 0;
  let done = 0;
  zone.textContent = `Загрузка 0 / ${files.length}…`;
  zone.style.pointerEvents = 'none';
  for (let i = 0; i < files.length; i++) {
    try {
      const ext = (files[i].name.split('.').pop() || 'jpg').toLowerCase();
      const storagePath = `${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from('works').upload(storagePath, files[i], { cacheControl: '3600', upsert: false });
      if (up.error) throw up.error;
      const url = sb.storage.from('works').getPublicUrl(storagePath).data.publicUrl;
      const ins = await sb.from('work_photos').insert({ work_id: workId, url, storage_path: storagePath, sort: nextSort++ });
      if (ins.error) { await sb.storage.from('works').remove([storagePath]); throw ins.error; }
      done++;
      zone.textContent = `Загрузка ${done} / ${files.length}…`;
    } catch (e) { toast('Ошибка: ' + (e.message || e), true); }
  }
  zone.textContent = '⬆ Перетащите фото сюда или нажмите, чтобы выбрать';
  zone.style.pointerEvents = '';
  $('w-multi-input').value = '';
  await loadWorkPhotos(workId);
  if (wasEmpty && wpCache.length > 0) { wCoverUrl = wpCache[0].url; await sb.from('works').update({ image_url: wCoverUrl }).eq('id', workId); }
  if (done > 0) toast(done > 1 ? `Добавлено ${done} фото` : 'Фото добавлено');
  loadWorks();
}

async function delWp(photoId, storagePath) {
  if (!confirm('Удалить фото?')) return;
  const { error } = await sb.from('work_photos').delete().eq('id', photoId);
  if (error) return toast('Ошибка удаления', true);
  if (storagePath) await sb.storage.from('works').remove([storagePath]);
  const delUrl = (wpCache.find(p => p.id === photoId) || {}).url;
  wpCache = wpCache.filter(p => p.id !== photoId);
  const workId = $('w-id').value;
  if (delUrl === wCoverUrl) { // удалили обложку — назначаем новую (первое фото)
    wCoverUrl = wpCache.length ? wpCache[0].url : null;
    await sb.from('works').update({ image_url: wCoverUrl }).eq('id', workId);
  }
  renderWpGrid(); loadWorks(); toast('Удалено');
}

async function moveWp(photoId, dir) {
  if (wpMoving) return;
  wpMoving = true;
  try {
    const idx = wpCache.findIndex(p => p.id === photoId);
    const swap = idx + dir;
    if (swap < 0 || swap >= wpCache.length) return;
    [wpCache[idx], wpCache[swap]] = [wpCache[swap], wpCache[idx]];
    const results = await Promise.all(wpCache.map((p, i) => sb.from('work_photos').update({ sort: i }).eq('id', p.id)));
    if (results.some(r => r.error)) {
      toast('Ошибка сортировки', true);
      await loadWorkPhotos($('w-id').value);
      return;
    }
    wpCache.forEach((p, i) => p.sort = i);
    renderWpGrid(); loadWorks(); // порядок ≠ обложка: обложку меняет только кнопка «★ Обложкой»
  } finally { wpMoving = false; }
}

function openLb(idx) {
  lbPhotos = wpCache; lbIdx = idx;
  $('lb-img').src = safeUrl(lbPhotos[idx].url);
  $('lb-cnt').textContent = (idx + 1) + ' / ' + lbPhotos.length;
  $('lightbox').classList.toggle('lb-single', lbPhotos.length === 1);
  $('lightbox').classList.add('open');
  document.addEventListener('keydown', lbKey);
}
function closeLb() {
  $('lightbox').classList.remove('open');
  document.removeEventListener('keydown', lbKey);
}
function lbBgClick(e) { if (e.target === $('lightbox')) closeLb(); }
function lbNav(dir) {
  lbIdx = (lbIdx + dir + lbPhotos.length) % lbPhotos.length;
  $('lb-img').src = safeUrl(lbPhotos[lbIdx].url);
  $('lb-cnt').textContent = (lbIdx + 1) + ' / ' + lbPhotos.length;
}
function lbKey(e) {
  if (e.key === 'ArrowLeft') lbNav(-1);
  else if (e.key === 'ArrowRight') lbNav(1);
  else if (e.key === 'Escape') closeLb();
}

// ================= CATEGORIES (справочник) =================
let CATS = [];
function workWord(n) { return (n % 10 === 1 && n % 100 !== 11) ? 'работа' : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'работы' : 'работ'); }
async function loadCategories() {
  showListLoading('cats-list');
  const { data, error } = await sb.from('categories').select('*').order('sort');
  if (error) { CATS = []; return toast('Ошибка загрузки категорий', true); }
  CATS = data || [];
  fillCategorySelect();
  renderCatsList();
}
function fillCategorySelect() {
  const sel = $('w-category'); if (!sel) return;
  const cur = sel.value;
  sel.replaceChildren();
  sel.appendChild(el('option', { value: '', text: '— выберите —' }));
  CATS.forEach(c => sel.appendChild(el('option', { value: c.name, text: c.name })));
  sel.value = (cur && CATS.some(c => c.name === cur)) ? cur : '';
}
async function addCategory(name, selectAfter) {
  name = (typeof name === 'string' ? name : $('c-new').value || '').trim();
  if (!name) return toast('Введите название', true);
  if (CATS.some(c => c.name.toLowerCase() === name.toLowerCase())) return toast('Такая категория уже есть', true);
  const sort = CATS.length ? Math.max(...CATS.map(c => c.sort)) + 1 : 0;
  const { error } = await sb.from('categories').insert({ name, sort });
  if (error) return toast('Ошибка: ' + error.message, true);
  if ($('c-new')) $('c-new').value = '';
  await loadCategories();
  if (selectAfter && $('w-category')) $('w-category').value = name;
  toast('Категория добавлена');
}
function newCategoryInline() {
  inlinePrompt('Название новой категории', '').then(name => {
    if (name) addCategory(name, true);
  });
}
async function moveCategory(id, dir) {
  const idx = CATS.findIndex(c => c.id === id); const sw = idx + dir;
  if (sw < 0 || sw >= CATS.length) return;
  [CATS[idx], CATS[sw]] = [CATS[sw], CATS[idx]];
  const res = await Promise.all(CATS.map((c, i) => sb.from('categories').update({ sort: i }).eq('id', c.id)));
  if (res.some(r => r.error)) toast('Ошибка сортировки', true);
  await loadCategories();
}
async function renameCategory(c) {
  const name = await inlinePrompt('Новое название категории «' + c.name + '»', c.name);
  if (!name || name === c.name) return;
  if (CATS.some(x => x.id !== c.id && x.name.toLowerCase() === name.toLowerCase())) return toast('Такая категория уже есть', true);
  const r1 = await sb.from('categories').update({ name }).eq('id', c.id);
  if (r1.error) return toast('Ошибка: ' + r1.error.message, true);
  await sb.from('works').update({ category: name }).eq('category', c.name); // синхрон works
  await loadCategories(); loadWorks();
  toast('Переименовано');
}
async function catCount(name) {
  const { count } = await sb.from('works').select('id', { count: 'exact', head: true }).eq('category', name);
  return count || 0;
}
async function renderCatsList() {
  const box = $('cats-list'); box.replaceChildren();
  if (!CATS.length) { box.appendChild(el('div', { class: 'empty', text: 'Категорий пока нет' })); return; }
  for (const c of CATS) {
    const n = await catCount(c.name);
    const actions = el('div', { class: 'li-actions' },
      el('span', { class: 'badge ' + (n ? 'on' : 'off'), text: n + ' ' + workWord(n) }),
      el('button', { class: 'btn btn-ghost', text: '↑', title: 'Выше', onclick: () => moveCategory(c.id, -1) }),
      el('button', { class: 'btn btn-ghost', text: '↓', title: 'Ниже', onclick: () => moveCategory(c.id, 1) }),
      el('button', { class: 'btn btn-ghost', text: 'Переименовать', onclick: () => renameCategory(c) }),
      el('button', { class: 'btn btn-danger', text: 'Удалить', onclick: () => delCategory(c, n) })
    );
    box.appendChild(el('div', { class: 'list-item' }, el('div', { class: 'li-body' }, el('div', { class: 't', text: c.name })), actions));
  }
}
// удаление категории с предупреждением
let cdTarget = null;
async function delCategory(c, n) {
  if (n === 0) {
    if (!confirm('Удалить категорию «' + c.name + '»?')) return;
    return doDelCat(c);
  }
  cdTarget = c;
  $('cd-name').textContent = c.name;
  $('cd-info').textContent = 'В категории ' + n + ' ' + workWord(n) + '. Выберите, что сделать:';
  const sel = $('cd-to'); sel.replaceChildren();
  const others = CATS.filter(x => x.id !== c.id);
  others.forEach(o => sel.appendChild(el('option', { value: o.name, text: o.name })));
  $('cd-reassign').style.display = others.length ? 'block' : 'none';
  $('cat-del').style.display = 'flex';
}
function closeCatDel() { $('cat-del').style.display = 'none'; cdTarget = null; }
async function catDelReassign() {
  const c = cdTarget, to = $('cd-to').value; if (!c || !to) return;
  const r = await sb.from('works').update({ category: to }).eq('category', c.name);
  if (r.error) return toast('Ошибка: ' + r.error.message, true);
  closeCatDel(); await doDelCat(c); loadWorks();
  toast('Работы перенесены в «' + to + '»');
}
async function catDelWithWorks() {
  const c = cdTarget; if (!c) return;
  if (!confirm('Удалить категорию «' + c.name + '» ВМЕСТЕ со всеми её работами? Безвозвратно.')) return;
  const r = await sb.from('works').delete().eq('category', c.name); // CASCADE удалит work_photos
  if (r.error) return toast('Ошибка: ' + r.error.message, true);
  closeCatDel(); await doDelCat(c); loadWorks();
  toast('Категория и работы удалены');
}
async function doDelCat(c) {
  const { error } = await sb.from('categories').delete().eq('id', c.id);
  if (error) return toast('Ошибка: ' + error.message, true);
  await loadCategories();
}

// ================= REVIEWS =================
let reviewFilter = 'pending';
function setReviewFilter(f) {
  reviewFilter = f;
  document.querySelectorAll('.filters .f[data-rf]').forEach(x => x.classList.toggle('active', x.dataset.rf === f));
  loadReviews();
}
async function loadReviews() {
  showListLoading('reviews-list');
  const box = $('reviews-list');
  let q = sb.from('reviews').select('*').order('created_at', { ascending: false });
  if (reviewFilter === 'pending') q = q.eq('approved', false);
  else if (reviewFilter === 'approved') q = q.eq('approved', true);
  const { data, error } = await q;
  if (error) return toast('Ошибка загрузки отзывов', true);
  if (!data.length) { box.appendChild(el('div', { class: 'empty', text: 'Нет отзывов в этой категории' })); return; }
  data.forEach(r => {
    const badge = el('span', { class: 'badge ' + (r.approved ? 'on' : 'off'), text: r.approved ? 'опубликован' : 'на модерации' });
    const actions = el('div', { class: 'li-actions' }, badge,
      el('button', { class: 'btn btn-ghost', text: 'Изменить', onclick: () => editReview(r) }),
      el('button', { class: r.approved ? 'btn btn-ghost' : 'btn btn-ok', text: r.approved ? 'Снять' : 'Одобрить',
        onclick: () => r.approved ? togglePublish('reviews', r.id, false, 'approved') : moderateReview(r.id, 'approve') }),
      el('button', { class: 'btn btn-danger', text: 'Удалить', onclick: () => moderateReview(r.id, 'reject') })
    );
    box.appendChild(el('div', { class: 'list-item' },
      el('div', { class: 'li-body' },
        el('div', { class: 't' }, el('span', { class: 'stars', text: '★'.repeat(r.rating) }), document.createTextNode('  ' + (r.author_name || '') + (r.author_city ? ' · ' + r.author_city : ''))),
        el('div', { class: 'm', text: r.text })),
      actions));
  });
}

// ================= NEWS =================
async function loadNews() {
  showListLoading('news-list');
  const box = $('news-list');
  const { data, error } = await sb.from('news').select('*').order('created_at', { ascending: false });
  if (error) return toast('Ошибка загрузки новостей', true);
  if (!data.length) { box.appendChild(el('div', { class: 'empty', text: 'Пока нет новостей' })); return; }
  data.forEach(n => {
    const badge = el('span', { class: 'badge ' + (n.published ? 'on' : 'off'), text: n.published ? 'на сайте' : 'черновик' });
    const actions = el('div', { class: 'li-actions' }, badge,
      el('button', { class: 'btn btn-ghost', text: n.published ? 'Снять' : 'Опубликовать', onclick: () => togglePublish('news', n.id, !n.published) }),
      el('button', { class: 'btn btn-ghost', text: 'Изменить', onclick: () => editNews(n) }),
      el('button', { class: 'btn btn-danger', text: 'Удалить', onclick: () => del('news', n.id) })
    );
    box.appendChild(el('div', { class: 'list-item' },
      el('div', { class: 'li-body' }, el('div', { class: 't', text: n.title }), el('div', { class: 'm', text: n.preview_text || '' })),
      actions));
  });
}
function editNews(n) {
  $('n-id').value = n.id; $('n-title').value = n.title || ''; $('n-preview').value = n.preview_text || '';
  $('n-body').value = n.body || ''; $('n-published').checked = !!n.published;
  $('n-image-url').value = n.image_url || '';
  $('n-photo').value = '';
  const prev = $('n-photo-preview');
  prev.replaceChildren();
  if (n.image_url) prev.appendChild(el('img', { src: safeUrl(n.image_url), alt: '', style: 'max-width:200px;border-radius:8px' }));
  $('news-form-title').textContent = 'Изменить новость'; window.scrollTo({ top: 0, behavior: 'smooth' });
}
function resetNewsForm() {
  ['n-id','n-title','n-preview','n-body','n-image-url'].forEach(i => $(i).value = '');
  $('n-photo').value = ''; $('n-photo-preview').replaceChildren();
  $('n-published').checked = false; $('news-form-title').textContent = 'Добавить новость';
}
async function saveNews() {
  if (!validateNewsForm()) return;
  const title = $('n-title').value.trim();
  const btn = $('n-save'); btn.disabled = true; btn.textContent = 'Сохранение…';
  try {
    let image_url = $('n-image-url').value.trim() || null;
    const file = $('n-photo').files[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) throw new Error('Файл больше 15 МБ');
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = 'news/' + crypto.randomUUID() + '.' + ext;
      const up = await sb.storage.from('works').upload(path, file, { cacheControl: '3600', upsert: false });
      if (up.error) throw up.error;
      image_url = sb.storage.from('works').getPublicUrl(path).data.publicUrl;
    }
    const row = { title, preview_text: $('n-preview').value.trim() || null, body: $('n-body').value.trim() || null, published: $('n-published').checked, image_url };
    const id = $('n-id').value;
    const res = id ? await sb.from('news').update(row).eq('id', id) : await sb.from('news').insert(row);
    if (res.error) throw res.error;
    toast('Сохранено'); clearDirty(); resetNewsForm(); loadNews();
  } catch (e) { toast('Ошибка: ' + (e.message || e), true); }
  finally { btn.disabled = false; btn.textContent = 'Сохранить'; }
}

// ================= SETTINGS =================
let settingsCache = {};
let pricingKnownIds = new Set();
function cloneDef(obj) { return JSON.parse(JSON.stringify(obj || {})); }

function renderScopeChecks() {
  const box = $('w-scope'); if (!box) return;
  const items = settingsCache.scope_items || window.DEFAULT_SCOPE_ITEMS || [];
  box.replaceChildren();
  items.forEach(v => {
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = v;
    box.appendChild(el('label', { class: 'check' }, cb, document.createTextNode(' ' + v)));
  });
}

function renderPricingRow(container, item, priceKey) {
  const row = el('div', { class: 'pr-row', 'data-id': item.id || '' });
  const cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'pr-en'; cb.checked = item.enabled !== false;
  const idIn = document.createElement('input'); idIn.type = 'text'; idIn.className = 'pr-id'; idIn.value = item.id || ''; idIn.placeholder = 'id';
  const lbl = document.createElement('input'); lbl.type = 'text'; lbl.className = 'pr-label'; lbl.value = item.label || '';
  const pr = document.createElement('input'); pr.type = 'number'; pr.className = 'pr-price'; pr.value = item[priceKey] != null ? item[priceKey] : 0;
  const rm = el('button', { class: 'btn btn-ghost pr-rm', text: '✕', title: 'Удалить строку' });
  rm.addEventListener('click', () => {
    const id = (idIn.value.trim() || row.dataset.id || '').trim();
    if (id && pricingKnownIds.has(id) && !confirm('Удалить «' + id + '» из прайса? Позиция исчезнет в конструкторе на сайте.')) return;
    row.remove();
  });
  row.append(cb, idIn, lbl, pr, rm);
  container.appendChild(row);
}

function addPricingRow(containerId, priceKey) {
  renderPricingRow($(containerId), { id: 'new-' + Date.now(), label: '', [priceKey]: 0, enabled: true }, priceKey);
}

function collectPricingRows(container, priceKey) {
  const seen = new Set();
  return [...container.querySelectorAll('.pr-row')].map(row => {
    let id = (row.querySelector('.pr-id')?.value.trim() || row.dataset.id || '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    if (!id) id = 'item-' + Math.random().toString(36).slice(2, 8);
    while (seen.has(id)) id = id + '-2';
    seen.add(id);
    return {
      id,
      label: row.querySelector('.pr-label').value.trim(),
      [priceKey]: parseInt(row.querySelector('.pr-price').value, 10) || 0,
      enabled: row.querySelector('.pr-en').checked
    };
  }).filter(i => i.label);
}

function loadPricingForm() {
  const p = settingsCache.pricing || cloneDef(window.DEFAULT_PRICING);
  pricingKnownIds = new Set();
  ['types', 'profiles', 'glass', 'hardware'].forEach(k => (p[k] || []).forEach(i => { if (i.id) pricingKnownIds.add(i.id); }));
  $('p-base').value = p.base_per_m ?? 2500;
  $('p-min').value = p.min_price ?? 3000;
  const w = p.width || {}, h = p.height || {};
  $('p-w-min').value = w.min ?? 800; $('p-w-max').value = w.max ?? 2000; $('p-w-def').value = w.default ?? 1400;
  $('p-h-min').value = h.min ?? 600; $('p-h-max').value = h.max ?? 2400; $('p-h-def').value = h.default ?? 1400;
  const defs = window.DEFAULT_PRICING || {};
  const fill = (id, items, key, fallback) => {
    const box = $(id); box.replaceChildren();
    (items && items.length ? items : fallback).forEach(i => renderPricingRow(box, i, key, key));
  };
  fill('p-types', p.types, 'surcharge', defs.types);
  fill('p-profiles', p.profiles, 'price', defs.profiles);
  fill('p-glass', p.glass, 'price', defs.glass);
  fill('p-hardware', p.hardware, 'price', defs.hardware);
}

async function savePricing(opts) {
  const quiet = opts && opts.quiet;
  if (!validatePricing()) return false;
  const btn = $('p-save'); if (btn && !quiet) { btn.disabled = true; btn.textContent = 'Сохранение…'; }
  try {
    const { data: row } = await sb.from('site_settings').select('data').eq('id', 1).maybeSingle();
    if (row && row.data) settingsCache = row.data;
    settingsCache.pricing = {
      base_per_m: parseInt($('p-base').value, 10) || 2500,
      min_price: parseInt($('p-min').value, 10) || 3000,
      width: { min: +$('p-w-min').value || 800, max: +$('p-w-max').value || 2000, step: 10, default: +$('p-w-def').value || 1400 },
      height: { min: +$('p-h-min').value || 600, max: +$('p-h-max').value || 2400, step: 10, default: +$('p-h-def').value || 1400 },
      types: collectPricingRows($('p-types'), 'surcharge'),
      profiles: collectPricingRows($('p-profiles'), 'price'),
      glass: collectPricingRows($('p-glass'), 'price'),
      hardware: collectPricingRows($('p-hardware'), 'price')
    };
    const { error } = await sb.from('site_settings').upsert({ id: 1, data: settingsCache, updated_at: new Date().toISOString() });
    if (error) throw error;
    if (!quiet) toast('Прайс сохранён');
    clearDirty();
    loadPricingForm();
    return true;
  } catch (e) { if (!quiet) toast('Ошибка: ' + (e.message || e), true); return false; }
  finally { if (btn && !quiet) { btn.disabled = false; btn.textContent = 'Сохранить прайс'; } }
}

function parseStatsLines(text) {
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const p = l.split('|').map(x => x.trim());
    return { value: p[0] || '', label: p[1] || '' };
  }).filter(s => s.value);
}
function statsToLines(stats) {
  return (stats || []).map(s => (s.value || '') + ' | ' + (s.label || '')).join('\n');
}
function validateSiteSettings() {
  const V = AdminValidate; V.clearAll(); let ok = true;
  const warnings = [];
  const phone = $('s-phone').value.replace(/\D/g, '');
  if (phone && !V.digitsPhone(phone)) ok = V.show('s-phone', 'Телефон: 10–11 цифр, с 7') && ok;
  const wa = $('s-wa').value.replace(/\D/g, '');
  if (wa && !V.digitsPhone(wa)) ok = V.show('s-wa', 'Некорректный WhatsApp') && ok;
  const email = $('s-email').value.trim();
  if (email && !V.email(email)) ok = V.show('s-email', 'Некорректный e-mail') && ok;
  if ($('s-vk').value.trim() && !V.url($('s-vk').value)) ok = V.show('s-vk', 'Ссылка с http:// или https://') && ok;
  if ($('s-avito').value.trim() && !V.url($('s-avito').value)) ok = V.show('s-avito', 'Ссылка с http:// или https://') && ok;
  const seoT = $('s-seo-title').value.trim();
  if (seoT.length > 70) { V.show('s-seo-title', 'Title: рекомендуется до 70 символов (сейчас ' + seoT.length + ')', 'warn'); warnings.push('seo-title'); }
  const seoD = $('s-seo-desc').value.trim();
  if (seoD.length > 160) { V.show('s-seo-desc', 'Description: рекомендуется до 160 символов (сейчас ' + seoD.length + ')', 'warn'); warnings.push('seo-desc'); }
  const hp = $('s-hero-price').value;
  if (hp && !V.num(hp, 0, 99999999)) ok = V.show('s-hero-price', 'Некорректная цена «от»') && ok;
  if (!ok) toast('Исправьте ошибки в форме', true);
  return { ok, warnings };
}

function blurValidateField(id) {
  const V = AdminValidate;
  if (id === 's-email' && $('s-email').value.trim()) {
    V.email($('s-email').value) ? V.ok('s-email') : V.show('s-email', 'Некорректный e-mail');
  }
  if (id === 's-phone' && $('s-phone').value.replace(/\D/g, '')) {
    V.digitsPhone($('s-phone').value) ? V.ok('s-phone') : V.show('s-phone', 'Телефон: 10–11 цифр, с 7');
  }
  if (id === 's-wa' && $('s-wa').value.replace(/\D/g, '')) {
    V.digitsPhone($('s-wa').value) ? V.ok('s-wa') : V.show('s-wa', 'Некорректный WhatsApp');
  }
  if ((id === 's-vk' || id === 's-avito') && $(id).value.trim()) {
    V.url($(id).value) ? V.ok(id) : V.show(id, 'Ссылка с http:// или https://');
  }
  if (id === 's-seo-desc' && $('s-seo-desc').value.trim().length > 160) {
    V.show('s-seo-desc', 'Рекомендуется до 160 символов', 'warn');
  }
  if (id === 's-seo-title') {
    const t = $('s-seo-title').value.trim();
    if (t.length > 70) V.show('s-seo-title', 'Title: рекомендуется до 70 символов (сейчас ' + t.length + ')', 'warn');
    else if (t) V.ok('s-seo-title');
  }
  if (id === 's-hero-lead' && $('s-hero-lead').value.trim().length > 400) {
    V.show('s-hero-lead', 'Рекомендуется до 400 символов', 'warn');
  }
  if (id === 's-hero-price' && $('s-hero-price').value) {
    V.num($('s-hero-price').value, 0, 99999999) ? V.ok('s-hero-price') : V.show('s-hero-price', 'Некорректная цена «от»');
  }
  if (id === 's-footer-copy' && $('s-footer-copy').value.trim().length > 200) {
    V.show('s-footer-copy', 'Рекомендуется до 200 символов', 'warn');
  }
  if (id === 's-og-image-url' && $('s-og-image-url').value.trim()) {
    V.url($('s-og-image-url').value) ? V.ok('s-og-image-url') : V.show('s-og-image-url', 'Ссылка с http:// или https://');
  }
  if (id === 'w-title' && $('w-title').value.trim()) {
    V.len($('w-title').value.trim(), 2, 120) ? V.ok('w-title') : V.show('w-title', 'Название: 2–120 символов');
  }
  if (id === 'w-pricefrom' && $('w-pricefrom').value) {
    V.num($('w-pricefrom').value, 0, 99999999) ? V.ok('w-pricefrom') : V.show('w-pricefrom', 'Цена «от»: положительное число');
  }
  if (id === 'p-base' && $('p-base').value) {
    V.num($('p-base').value, 1, 999999) ? V.ok('p-base') : V.show('p-base', 'База должна быть > 0');
  }
  if (id === 'p-min' && $('p-min').value !== '') {
    V.num($('p-min').value, 0, 9999999) ? V.ok('p-min') : V.show('p-min', 'Некорректный минимум');
  }
  if (id === 'n-title' && $('n-title').value.trim() && !V.len($('n-title').value.trim(), 3, 120)) {
    V.show('n-title', 'Заголовок: 3–120 символов');
  }
  if (id === 'rv-text' && $('rv-text').value.trim() && !V.len($('rv-text').value.trim(), 10, 2000)) {
    V.show('rv-text', 'Текст: 10–2000 символов');
  }
  if (id === 'c-new' && $('c-new').value.trim()) {
    const n = $('c-new').value.trim();
    if (CATS.some(c => c.name.toLowerCase() === n.toLowerCase())) V.show('c-new', 'Такая категория уже есть');
    else V.ok('c-new');
  }
}

function validatePricing() {
  const V = AdminValidate; V.clearAll(); let ok = true;
  if (!V.num($('p-base').value, 1, 999999)) ok = V.show('p-base', 'База должна быть > 0') && ok;
  if (!V.num($('p-min').value, 0, 9999999)) ok = V.show('p-min', 'Некорректный минимум') && ok;
  const wMin = +$('p-w-min').value, wMax = +$('p-w-max').value, wDef = +$('p-w-def').value;
  if (wMin >= wMax) ok = V.show('p-w-max', 'Ширина: макс > мин') && ok;
  if (wDef < wMin || wDef > wMax) ok = V.show('p-w-def', 'Ширина: default между мин и макс') && ok;
  const hMin = +$('p-h-min').value, hMax = +$('p-h-max').value, hDef = +$('p-h-def').value;
  if (hMin >= hMax) ok = V.show('p-h-max', 'Высота: макс > мин') && ok;
  if (hDef < hMin || hDef > hMax) ok = V.show('p-h-def', 'Высота: default между мин и макс') && ok;
  ['p-types', 'p-profiles', 'p-glass', 'p-hardware'].forEach(id => {
    $(id).querySelectorAll('.pr-row').forEach(row => {
      const lid = row.querySelector('.pr-id');
      const llbl = row.querySelector('.pr-label');
      if (llbl && llbl.value.trim() && lid && lid.value.trim() && !V.slug(lid.value.trim())) {
        lid.classList.add('input-invalid'); ok = false;
      }
    });
  });
  if (!ok) toast('Исправьте ошибки в прайсе (id: латиница, цифры, -_)', true);
  return ok;
}

function validateNewsForm() {
  const V = AdminValidate; V.clearAll(); let ok = true;
  const title = $('n-title').value.trim();
  if (!V.len(title, 3, 120)) ok = V.show('n-title', 'Заголовок: 3–120 символов') && ok;
  const prev = $('n-preview').value.trim();
  if (prev.length > 300) ok = V.show('n-preview', 'Краткий текст: до 300 символов') && ok;
  if (!ok) toast('Исправьте ошибки в новости', true);
  return ok;
}

function validateReviewForm() {
  const V = AdminValidate; V.clearAll(); let ok = true;
  if (!V.len($('rv-name').value.trim(), 2, 60)) ok = V.show('rv-name', 'Имя: 2–60 символов') && ok;
  if (!V.len($('rv-text').value.trim(), 10, 2000)) ok = V.show('rv-text', 'Текст: 10–2000 символов') && ok;
  if (!ok) toast('Исправьте ошибки в отзыве', true);
  return ok;
}

function validateWorkForm() {
  const V = AdminValidate; V.clearAll(); let ok = true;
  if (!V.len($('w-title').value.trim(), 2, 120)) ok = V.show('w-title', 'Название: 2–120 символов') && ok;
  const pf = $('w-pricefrom').value;
  if (pf && !V.num(pf, 0, 99999999)) ok = V.show('w-pricefrom', 'Цена «от»: положительное число') && ok;
  if (!ok) toast('Исправьте ошибки в работе', true);
  return ok;
}

async function loadSiteSettingsForm() {
  const { data, error } = await sb.from('site_settings').select('data').eq('id', 1).maybeSingle();
  if (error) return toast('Не удалось загрузить настройки', true);
  settingsCache = (data && data.data) || {};
  const s = settingsCache, h = s.hero || {}, f = s.footer || {}, seo = s.seo || {}, soc = s.social || {}, sec = s.sections || {}, copy = s.copy || window.DEFAULT_SECTION_COPY || {};
  $('s-company').value = s.company_name || '';
  $('s-phone').value = s.phone || '';
  $('s-phone-disp').value = s.phone_display || '';
  $('s-wa').value = s.whatsapp || '';
  $('s-tg').value = s.telegram || '';
  $('s-email').value = s.email || '';
  $('s-hours').value = s.hours || '';
  $('s-hero-eyebrow').value = h.eyebrow || '';
  $('s-hero-t1').value = h.title_before || '';
  $('s-hero-t2').value = h.title_em || '';
  $('s-hero-lead').value = h.lead || '';
  $('s-hero-price').value = h.price_from || '';
  $('s-hero-profiles').value = (h.profiles || []).join(', ');
  $('s-hero-chips').value = (h.chips || []).join('\n');
  $('s-hero-stats').value = statsToLines(h.stats);
  $('s-footer-about').value = f.about || '';
  $('s-footer-copy').value = f.copyright || '';
  $('s-vk').value = soc.vk || '';
  $('s-avito').value = soc.avito || '';
  $('s-seo-title').value = seo.title || '';
  $('s-seo-desc').value = seo.description || '';
  $('s-og-image-url').value = seo.og_image || '';
  const ogp = $('s-og-preview'); ogp.replaceChildren();
  const ogHint = $('s-og-size-hint');
  if (ogHint) ogHint.textContent = '';
  if (seo.og_image) {
    const img = el('img', { src: safeUrl(seo.og_image), alt: '', style: 'max-width:200px;border-radius:8px' });
    img.onload = () => { if (ogHint) ogHint.textContent = 'Текущая: ' + img.naturalWidth + '×' + img.naturalHeight + ' px'; };
    ogp.appendChild(img);
  }
  const priv = $('s-privacy-html');
  if (priv) priv.value = s.privacy_html || '';
  $('s-copy-ctor-t').value = (copy.constructor || {}).title || '';
  $('s-copy-ctor-s').value = (copy.constructor || {}).subtitle || '';
  $('s-copy-gal-t').value = (copy.gallery || {}).title || '';
  $('s-copy-gal-s').value = (copy.gallery || {}).subtitle || '';
  $('s-copy-rev-t').value = (copy.reviews || {}).title || '';
  $('s-copy-rev-s').value = (copy.reviews || {}).subtitle || '';
  $('s-copy-news-t').value = (copy.news || {}).title || '';
  $('s-copy-news-s').value = (copy.news || {}).subtitle || '';
  $('s-copy-con-t').value = (copy.contact || {}).title || '';
  $('s-copy-con-s').value = (copy.contact || {}).subtitle || '';
  $('s-scope-items').value = (s.scope_items || window.DEFAULT_SCOPE_ITEMS || []).join('\n');
  $('s-logo-url').value = s.logo_url || '';
  $('s-sec-gallery').checked = sec.gallery !== false;
  $('s-sec-reviews').checked = sec.reviews !== false;
  $('s-sec-news').checked = sec.news !== false;
  $('s-sec-constructor').checked = sec.constructor !== false;
  $('s-sec-contact').checked = sec.contact !== false;
  const lp = $('s-logo-preview'); lp.replaceChildren();
  if (s.logo_url) lp.appendChild(el('img', { src: safeUrl(s.logo_url), alt: '', style: 'max-height:48px;border-radius:6px' }));
  loadPricingForm();
  renderScopeChecks();
  clearDirty();
}
async function saveSiteSettings(opts) {
  const quiet = opts && opts.quiet;
  const v = validateSiteSettings();
  if (!v.ok) return false;
  const btn = $('s-save'); if (btn && !quiet) { btn.disabled = true; btn.textContent = 'Сохранение…'; }
  try {
    let logo_url = $('s-logo-url').value.trim() || settingsCache.logo_url || null;
    const logoFile = $('s-logo').files[0];
    if (logoFile) {
      if (logoFile.size > 5 * 1024 * 1024) throw new Error('Логотип больше 5 МБ');
      const ext = (logoFile.name.split('.').pop() || 'png').toLowerCase();
      const path = 'site/logo-' + Date.now() + '.' + ext;
      const up = await sb.storage.from('works').upload(path, logoFile, { cacheControl: '3600', upsert: true });
      if (up.error) throw up.error;
      logo_url = sb.storage.from('works').getPublicUrl(path).data.publicUrl;
    }
    let og_image = $('s-og-image-url').value.trim() || (settingsCache.seo || {}).og_image || null;
    const ogFile = $('s-og-image').files[0];
    if (ogFile) {
      if (ogFile.size > 5 * 1024 * 1024) throw new Error('OG-картинка больше 5 МБ');
      const ext = (ogFile.name.split('.').pop() || 'jpg').toLowerCase();
      const path = 'site/og-' + Date.now() + '.' + ext;
      const up = await sb.storage.from('works').upload(path, ogFile, { cacheControl: '3600', upsert: true });
      if (up.error) throw up.error;
      og_image = sb.storage.from('works').getPublicUrl(path).data.publicUrl;
    }
    const profiles = $('s-hero-profiles').value.split(',').map(x => x.trim()).filter(Boolean);
    const chips = $('s-hero-chips').value.split('\n').map(x => x.trim()).filter(Boolean);
    const scope_items = $('s-scope-items').value.split('\n').map(x => x.trim()).filter(Boolean);
    const data = Object.assign({}, settingsCache, {
      company_name: $('s-company').value.trim() || 'Mirokon',
      phone: $('s-phone').value.replace(/\D/g, '') || '',
      phone_display: $('s-phone-disp').value.trim() || '',
      whatsapp: $('s-wa').value.replace(/\D/g, '') || $('s-phone').value.replace(/\D/g, ''),
      telegram: $('s-tg').value.trim().replace(/^@/, ''),
      email: $('s-email').value.trim(),
      hours: $('s-hours').value.trim(),
      logo_url,
      scope_items: scope_items.length ? scope_items : window.DEFAULT_SCOPE_ITEMS,
      hero: {
        eyebrow: $('s-hero-eyebrow').value.trim(),
        title_before: $('s-hero-t1').value.trim(),
        title_em: $('s-hero-t2').value.trim(),
        lead: $('s-hero-lead').value.trim(),
        price_from: parseInt($('s-hero-price').value, 10) || 0,
        chips,
        stats: parseStatsLines($('s-hero-stats').value),
        profiles
      },
      footer: { about: $('s-footer-about').value.trim(), copyright: $('s-footer-copy').value.trim() },
      seo: { title: $('s-seo-title').value.trim(), description: $('s-seo-desc').value.trim(), og_image },
      social: { vk: $('s-vk').value.trim(), avito: $('s-avito').value.trim() },
      sections: {
        constructor: $('s-sec-constructor').checked,
        gallery: $('s-sec-gallery').checked,
        reviews: $('s-sec-reviews').checked,
        news: $('s-sec-news').checked,
        contact: $('s-sec-contact').checked
      },
      copy: {
        constructor: { title: $('s-copy-ctor-t').value.trim(), subtitle: $('s-copy-ctor-s').value.trim() },
        gallery: { title: $('s-copy-gal-t').value.trim(), subtitle: $('s-copy-gal-s').value.trim() },
        reviews: { title: $('s-copy-rev-t').value.trim(), subtitle: $('s-copy-rev-s').value.trim() },
        news: { title: $('s-copy-news-t').value.trim(), subtitle: $('s-copy-news-s').value.trim() },
        contact: { title: $('s-copy-con-t').value.trim(), subtitle: $('s-copy-con-s').value.trim() }
      }
    });
    const { error } = await sb.from('site_settings').upsert({ id: 1, data, updated_at: new Date().toISOString() });
    if (error) throw error;
    settingsCache = data;
    $('s-logo').value = '';
    $('s-og-image').value = '';
    if (!quiet) {
      if (v.warnings.length) toast('Настройки сохранены (есть рекомендации по SEO)', false, true);
      else toast('Настройки сохранены');
    }
    clearDirty();
    loadSiteSettingsForm();
    return true;
  } catch (e) { if (!quiet) toast('Ошибка: ' + (e.message || e), true); return false; }
  finally { if (btn && !quiet) { btn.disabled = false; btn.textContent = 'Сохранить настройки'; } }
}

async function saveAllSiteConfig() {
  const btn = $('s-save-all');
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Сохранение…'; }
  try {
    const ok1 = await saveSiteSettings({ quiet: true });
    if (!ok1) return;
    const ok2 = await savePricing({ quiet: true });
    if (ok2) toast('Настройки и прайс сохранены');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = label || 'Сохранить настройки и прайс'; }
  }
}

async function savePrivacy() {
  const html = ($('s-privacy-html')?.value || '').trim();
  const btn = document.querySelector('#panel-settings button[onclick="savePrivacy()"]');
  const label = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Сохранение…'; }
  try {
    const { data: row } = await sb.from('site_settings').select('data').eq('id', 1).maybeSingle();
    const data = Object.assign({}, (row && row.data) || settingsCache, { privacy_html: html || null });
    const { error } = await sb.from('site_settings').upsert({ id: 1, data, updated_at: new Date().toISOString() });
    if (error) throw error;
    settingsCache = data;
    clearDirty();
    toast('Политика сохранена');
  } catch (e) { toast('Ошибка: ' + (e.message || e), true); }
  finally { if (btn) { btn.disabled = false; btn.textContent = label || 'Сохранить политику'; } }
}

function editReview(r) {
  $('rv-edit-id').value = r.id;
  $('rv-name').value = r.author_name || '';
  $('rv-city').value = r.author_city || '';
  $('rv-rating').value = String(r.rating || 5);
  $('rv-text').value = r.text || '';
  $('rv-approved').checked = !!r.approved;
  $('rv-form-title').textContent = 'Редактировать отзыв';
  $('rv-save-btn').textContent = 'Сохранить изменения';
  $('rv-cancel-btn').style.display = '';
  switchTab('reviews', true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function cancelReviewEdit() {
  $('rv-edit-id').value = '';
  ['rv-name', 'rv-city', 'rv-text'].forEach(i => $(i).value = '');
  $('rv-rating').value = '5';
  $('rv-approved').checked = true;
  $('rv-form-title').textContent = 'Добавить отзыв вручную';
  $('rv-save-btn').textContent = 'Добавить отзыв';
  $('rv-cancel-btn').style.display = 'none';
  AdminValidate.clearAll();
}

async function saveManualReview() {
  if (!validateReviewForm()) return;
  const name = $('rv-name').value.trim();
  const text = $('rv-text').value.trim();
  const rating = parseInt($('rv-rating').value, 10) || 5;
  const editId = $('rv-edit-id').value;
  const row = {
    author_name: name,
    author_city: $('rv-city').value.trim() || null,
    rating,
    text,
    approved: $('rv-approved').checked
  };
  const { error } = editId
    ? await sb.from('reviews').update(row).eq('id', editId)
    : await sb.from('reviews').insert(row);
  if (error) return toast('Ошибка: ' + error.message, true);
  cancelReviewEdit();
  toast(editId ? 'Отзыв обновлён' : 'Отзыв добавлен');
  loadReviews();
}

// ================= общие =================
async function togglePublish(table, id, value, field) {
  const f = field || 'published';
  const { error } = await sb.from(table).update({ [f]: value }).eq('id', id);
  if (error) return toast('Ошибка: ' + error.message, true);
  toast(value ? 'Опубликовано' : 'Снято с публикации');
  table === 'works' ? loadWorks() : table === 'reviews' ? loadReviews() : loadNews();
}
async function del(table, id) {
  if (!confirm('Удалить запись безвозвратно?')) return;
  if (table === 'works') {
    const { data: photos } = await sb.from('work_photos').select('storage_path').eq('work_id', id);
    if (photos && photos.length) {
      const paths = photos.map(p => p.storage_path).filter(Boolean);
      if (paths.length) await sb.storage.from('works').remove(paths);
    }
    if ($('w-id').value === id) resetWorkForm();
  }
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) return toast('Ошибка: ' + error.message, true);
  toast('Удалено');
  table === 'works' ? loadWorks() : table === 'reviews' ? loadReviews() : loadNews();
}

// Модерация отзыва через сервер: меняет БД И редактирует сообщение в Telegram
// (убирает кнопки, дописывает «обработано в админке»).
async function moderateReview(id, action) {
  if (action === 'reject' && !confirm('Удалить отзыв безвозвратно?')) return;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return location.replace('/landing.html');
    const res = await fetch('/api/moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify({ id, action })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || ('код ' + res.status));
    toast(action === 'approve' ? 'Одобрено' : 'Удалено');
    loadReviews();
  } catch (e) {
    toast('Ошибка: ' + (e.message || e), true);
  }
}