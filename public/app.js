    // Constructor logic
    const svg = document.getElementById('window-svg');
    const priceEl = document.getElementById('total-price');
    const widthSlider = document.getElementById('width');
    const heightSlider = document.getElementById('height');
    const widthVal = document.getElementById('width-val');
    const heightVal = document.getElementById('height-val');

    // Prices — ТЕСТОВЫЕ значения (тестовая фаза, см. docs/business-requirements.md)
    const BASE_PER_M = 2500;                 // базовая цена за метр периметра
    const TYPE_PRICE = {                     // надбавка за тип конструкции
      'single-turn': 0, 'single-deaf': -1500, 'double-deaf-turn': 3500,
      'double-turn': 5000, 'triple': 8000, 'balcony': 12000
    };

    function updateVal(slider, valEl) { valEl.textContent = slider.value; }

    // Плавная анимация числа цены
    function animatePrice(target) {
      const from = Number(priceEl.dataset.v || 0);
      if (from === target) { priceEl.textContent = target.toLocaleString('ru-RU') + ' ₽'; return; }
      const dur = 350, t0 = performance.now();
      cancelAnimationFrame(priceEl._raf || 0);
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const ease = 0.5 - Math.cos(Math.PI * k) / 2;
        priceEl.textContent = Math.round(from + (target - from) * ease).toLocaleString('ru-RU') + ' ₽';
        if (k < 1) priceEl._raf = requestAnimationFrame(step);
        else priceEl.dataset.v = target;
      };
      priceEl._raf = requestAnimationFrame(step);
    }

    function calcPrice() {
      const w = parseFloat(widthSlider.value) / 1000;
      const h = parseFloat(heightSlider.value) / 1000;
      const perim = 2 * (w + h);
      const type = document.getElementById('window-type').value;
      const prof = parseFloat(document.getElementById('profile').selectedOptions[0].dataset.price || 0);
      const gl = parseFloat(document.getElementById('glass').selectedOptions[0].dataset.price || 0);
      const hw = parseFloat(document.getElementById('hardware').selectedOptions[0].dataset.price || 0);
      let total = BASE_PER_M * perim + prof * perim + gl * (w * h) + hw + (TYPE_PRICE[type] || 0);
      total = Math.max(total, 3000);
      animatePrice(Math.round(total));
    }

    // SVG-превью окна — все 6 типов конструкций
    const GLASS_DEFS = '<defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAF2FF"/><stop offset="0.5" stop-color="#D7E8FF"/><stop offset="1" stop-color="#F4F9FF"/></linearGradient></defs>';

    function sash(x, y, w, h, opts) {
      opts = opts || {};
      let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="url(#cg)" stroke="#94a3b8" stroke-width="3"/>`;
      s += `<path d="M${x + w * 0.22} ${y + h * 0.12} L${x + w * 0.6} ${y + h * 0.9}" stroke="#fff" stroke-width="${Math.max(6, w * 0.08)}" opacity="0.5" stroke-linecap="round"/>`;
      if (opts.tilt) s += `<path d="M${x + 8} ${y + h - 8} L${x + w / 2} ${y + 10} L${x + w - 8} ${y + h - 8}" fill="none" stroke="#93c5fd" stroke-width="2" stroke-dasharray="5 4"/>`;
      if (opts.handle) {
        const hx = opts.handle === 'left' ? x + 7 : x + w - 13;
        s += `<rect x="${hx}" y="${y + h / 2 - 16}" width="6" height="32" rx="3" fill="#1E40AF"/>`;
      }
      return s;
    }

    const LAYOUTS = {
      'single-turn':      [{ handle: 'right', tilt: true }],
      'single-deaf':      [{}],
      'double-deaf-turn': [{}, { handle: 'right', tilt: true }],
      'double-turn':      [{ handle: 'left', tilt: true }, { handle: 'right', tilt: true }],
      'triple':           [{ handle: 'left', tilt: true }, {}, { handle: 'right', tilt: true }]
    };

    function drawWindow() {
      const type = document.getElementById('window-type').value;
      const x0 = 30, y0 = 30, W = 340, H = 238, gap = 5;
      const frame = `<rect x="20" y="20" width="360" height="258" rx="12" fill="#fff" stroke="#cbd5e1" stroke-width="8"/>`;
      let inner = '';
      if (type === 'balcony') {
        const winW = W * 0.42, doorW = W * 0.5, winH = H * 0.6;
        inner += sash(x0, y0 + (H - winH), winW, winH, { handle: 'right', tilt: true });
        inner += sash(x0 + winW + gap, y0, doorW, H, { handle: 'left' });
        inner += `<line x1="${x0}" y1="${y0 + (H - winH)}" x2="${x0 + winW}" y2="${y0 + (H - winH)}" stroke="#cbd5e1" stroke-width="4"/>`;
      } else {
        const lay = LAYOUTS[type] || LAYOUTS['single-turn'];
        const n = lay.length, sw = (W - gap * (n - 1)) / n;
        lay.forEach((sp, i) => { inner += sash(x0 + i * (sw + gap), y0, sw, H, sp); });
      }
      const dim = `<text x="200" y="296" text-anchor="middle" font-family="Inter,sans-serif" font-size="15" font-weight="600" fill="#64748B">${widthSlider.value} × ${heightSlider.value} мм</text>`;
      svg.innerHTML = GLASS_DEFS + frame + inner + dim;
    }

    // Events
    ['window-type', 'profile', 'glass', 'hardware'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => { ctorDirty = true; drawWindow(); calcPrice(); });
    });
    widthSlider.addEventListener('input', () => { ctorDirty = true; updateVal(widthSlider, widthVal); drawWindow(); calcPrice(); });
    heightSlider.addEventListener('input', () => { ctorDirty = true; updateVal(heightSlider, heightVal); drawWindow(); calcPrice(); });

    // Init
    drawWindow();
    calcPrice();

    function scrollToForm() {
      document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    }

    // Мобильное меню
    function toggleMenu() {
      const open = document.getElementById('mobile-nav').classList.toggle('open');
      document.getElementById('menu-btn').setAttribute('aria-expanded', open);
    }
    function closeMenu() {
      document.getElementById('mobile-nav').classList.remove('open');
      document.getElementById('menu-btn').setAttribute('aria-expanded', 'false');
    }

    // ===== Мульти-корзина позиций =====
    const _CART_KEY = 'mirokon_cart';
    const cart = (() => { try { const s = localStorage.getItem(_CART_KEY); return s ? JSON.parse(s) : []; } catch { return []; } })();
    function _persistCart() { try { localStorage.setItem(_CART_KEY, JSON.stringify(cart)); } catch {} }

    let ctorDirty    = false; // пользователь изменил конструктор, но не сохранил
    let editingIndex  = -1;   // индекс редактируемой позиции (-1 = нет)
    let editingBackup = null; // копия оригинала для отмены

    // --- вспомогательные ---

    function _makeItem() {
      return {
        typeText:  document.getElementById('window-type').selectedOptions[0].textContent,
        typeVal:   document.getElementById('window-type').value,
        profText:  document.getElementById('profile').selectedOptions[0].textContent,
        profVal:   document.getElementById('profile').value,
        glassText: document.getElementById('glass').selectedOptions[0].textContent,
        glassVal:  document.getElementById('glass').value,
        hwText:    document.getElementById('hardware').selectedOptions[0].textContent,
        hwVal:     document.getElementById('hardware').value,
        width:  widthSlider.value,
        height: heightSlider.value,
        price:  parseInt(priceEl.dataset.v || 0) || 3000
      };
    }

    function _loadItemToConstructor(item) {
      if (item.typeVal)  document.getElementById('window-type').value = item.typeVal;
      if (item.profVal)  document.getElementById('profile').value     = item.profVal;
      if (item.glassVal) document.getElementById('glass').value       = item.glassVal;
      if (item.hwVal)    document.getElementById('hardware').value    = item.hwVal;
      widthSlider.value  = item.width;
      heightSlider.value = item.height;
      updateVal(widthSlider, widthVal);
      updateVal(heightSlider, heightVal);
      drawWindow(); calcPrice();
    }

    // Рендер предпросмотра заказа — вызывается и из submitCart, и при обновлении позиции
    function _renderPreview() {
      const preview = document.getElementById('form-order-preview');
      if (!preview || !cart.length) return;
      let total = 0;
      preview.replaceChildren();
      const head = document.createElement('div'); head.className = 'form-order-head';
      const n = cart.length, word = n===1?'позиция':n<=4?'позиции':'позиций';
      const titleSpan = document.createElement('span'); titleSpan.className = 'form-order-title';
      titleSpan.textContent = 'Ваш заказ · ' + n + ' ' + word;
      const editBtn = document.createElement('button'); editBtn.type = 'button'; editBtn.className = 'form-order-edit'; editBtn.textContent = '← Изменить состав';
      editBtn.addEventListener('click', () => document.getElementById('constructor').scrollIntoView({behavior:'smooth'}));
      head.appendChild(titleSpan); head.appendChild(editBtn);
      preview.appendChild(head);
      cart.forEach((item, i) => {
        total += item.price;
        const row  = document.createElement('div'); row.className = 'form-order-item';
        const info = document.createElement('div'); info.className = 'form-order-item-info';
        const nm   = document.createElement('div'); nm.className = 'form-order-item-name'; nm.textContent = (i+1) + '. ' + item.typeText;
        const mt   = document.createElement('div'); mt.className = 'form-order-item-meta'; mt.textContent = item.profText + ' · ' + item.glassText + ' · ' + item.width + '×' + item.height + ' мм';
        const pr   = document.createElement('span'); pr.className = 'form-order-item-price'; pr.textContent = item.price.toLocaleString('ru-RU') + ' ₽';
        info.appendChild(nm); info.appendChild(mt);
        row.appendChild(info); row.appendChild(pr);
        preview.appendChild(row);
      });
      const foot = document.createElement('div'); foot.className = 'form-order-total';
      const lbl  = document.createElement('span'); lbl.className = 'form-order-total-label'; lbl.textContent = 'Ориентировочная стоимость';
      const sm   = document.createElement('span'); sm.className  = 'form-order-total-sum';   sm.textContent  = total.toLocaleString('ru-RU') + ' ₽';
      foot.appendChild(lbl); foot.appendChild(sm);
      preview.appendChild(foot);
      preview.className = 'form-order-preview';
      preview.style.display = 'block';
    }

    // Показать/скрыть баннер редактирования и поменять текст кнопки «Добавить»
    function _updateEditBanner() {
      const banner = document.getElementById('ctor-edit-banner');
      const numEl  = document.getElementById('ctor-edit-num');
      const addBtn = document.getElementById('ctor-add-btn');
      if (!banner) return;
      if (editingIndex !== -1) {
        banner.style.display = 'flex';
        if (numEl)  numEl.textContent  = editingIndex + 1;
        if (addBtn) addBtn.textContent = 'Сохранить изменения';
      } else {
        banner.style.display = 'none';
        if (addBtn) addBtn.textContent = '+ Добавить в список';
      }
    }

    // --- публичные функции ---

    function addToCart() {
      const item = _makeItem();
      if (editingIndex !== -1) {
        cart[editingIndex] = item;    // обновить позицию на месте
        editingIndex  = -1;
        editingBackup = null;
        // если предпросмотр заказа уже открыт — обновить его автоматически
        const fp = document.getElementById('form-order-preview');
        if (fp && fp.style.display !== 'none') _renderPreview();
      } else {
        cart.push(item);
        document.getElementById('cart-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      ctorDirty = false;
      _persistCart();
      renderCart();
      _updateEditBanner();
    }

    function editFromCart(i) {
      if (editingIndex !== -1 && editingIndex !== i) {
        cart[editingIndex] = editingBackup; // откатить предыдущую при переключении
      }
      editingIndex  = i;
      editingBackup = Object.assign({}, cart[i]);
      _loadItemToConstructor(cart[i]);
      ctorDirty = false;
      renderCart();
      _updateEditBanner();
      document.getElementById('constructor').scrollIntoView({ behavior: 'smooth' });
    }

    function cancelEdit() {
      if (editingIndex !== -1 && editingBackup) {
        cart[editingIndex] = editingBackup; // вернуть оригинал в корзину
        _loadItemToConstructor(editingBackup); // вернуть оригинал в конструктор
        _persistCart();
      }
      editingIndex  = -1;
      editingBackup = null;
      ctorDirty = false;
      renderCart();
      _updateEditBanner();
    }

    function removeFromCart(i) {
      if (editingIndex === i)      { editingIndex = -1; editingBackup = null; _updateEditBanner(); }
      else if (editingIndex > i)   { editingIndex--; }
      cart.splice(i, 1); _persistCart(); renderCart();
    }

    function clearCart() {
      cart.length = 0; editingIndex = -1; editingBackup = null; ctorDirty = false;
      _persistCart(); renderCart(); _updateEditBanner();
    }

    renderCart(); // восстановить корзину из localStorage при загрузке

    function renderCart() {
      const section = document.getElementById('cart-section');
      const itemsEl = document.getElementById('cart-items');
      const totalEl = document.getElementById('cart-total');
      const countEl = document.getElementById('cart-count');
      if (!cart.length) { section.style.display = 'none'; return; }
      section.style.display = 'block';
      countEl.textContent = cart.length;
      itemsEl.replaceChildren();
      let total = 0;
      cart.forEach((item, i) => {
        const isEditing = i === editingIndex;
        total += item.price;
        const row   = document.createElement('div');   row.className   = 'cart-item' + (isEditing ? ' editing' : '');
        const body  = document.createElement('div');   body.className  = 'cart-item-body';
        const title = document.createElement('div');   title.className = 'cart-item-title'; title.textContent = item.typeText;
        const meta  = document.createElement('div');   meta.className  = 'cart-item-meta';  meta.textContent  = item.profText + ' · ' + item.glassText + ' · ' + item.width + '×' + item.height + ' мм';
        if (isEditing) {
          const badge = document.createElement('span'); badge.className = 'cart-item-editing-badge'; badge.textContent = 'в редактировании';
          body.append(title, meta, badge);
        } else {
          body.append(title, meta);
        }
        const price = document.createElement('span');  price.className  = 'cart-item-price'; price.textContent = item.price.toLocaleString('ru-RU') + ' ₽';
        const edit  = document.createElement('button'); edit.className   = 'cart-item-edit' + (isEditing ? ' active' : ''); edit.textContent = '✎'; edit.title = 'Редактировать позицию'; edit.disabled = isEditing;
        edit.addEventListener('click', () => editFromCart(i));
        const rm    = document.createElement('button'); rm.className = 'cart-item-rm'; rm.textContent = '✕'; rm.title = 'Удалить позицию';
        rm.addEventListener('click', () => removeFromCart(i));
        row.append(body, price, edit, rm);
        itemsEl.appendChild(row);
      });
      const n = cart.length, word = n === 1 ? 'позиция' : n <= 4 ? 'позиции' : 'позиций';
      const lbl = document.createElement('span'); lbl.className = 'cart-total-label'; lbl.textContent = 'Итого ' + n + ' ' + word;
      const sum = document.createElement('span'); sum.className = 'cart-total-sum';   sum.textContent = total.toLocaleString('ru-RU') + ' ₽';
      totalEl.replaceChildren(lbl, sum);
    }

    function submitCart() {
      // Несохранённые изменения редактируемой позиции
      if (editingIndex !== -1 && ctorDirty) {
        if (confirm('Позиция ' + (editingIndex + 1) + ' открыта на редактирование с несохранёнными изменениями.\nСохранить перед отправкой?')) addToCart();
        else cancelEdit();
      }
      // Несохранённая новая позиция (не в режиме редактирования)
      if (ctorDirty && editingIndex === -1) {
        const type = document.getElementById('window-type').selectedOptions[0].textContent;
        const sz   = widthSlider.value + '×' + heightSlider.value + ' мм';
        const p    = (parseInt(priceEl.dataset.v || 0) || 3000).toLocaleString('ru-RU');
        if (confirm('В конструкторе настроена позиция:\n' + type + ', ' + sz + ' (~' + p + ' ₽)\n\nДобавить её в заявку?')) addToCart();
      }
      const fp = document.getElementById('form-order-preview');
      if (fp && cart.length) {
        _renderPreview();
        const msg = document.getElementById('lead-message');
        if (msg) msg.value = '';
      }
      document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    }

    function ctaOrder() {
      if (!cart.length) addToCart();
      submitCart();
    }

    function resetCalc() {
      if (editingIndex !== -1) cancelEdit(); // отменить редактирование при сбросе
      document.getElementById('window-type').selectedIndex = 0;
      document.getElementById('profile').selectedIndex = 0;
      document.getElementById('glass').selectedIndex = 0;
      document.getElementById('hardware').selectedIndex = 0;
      widthSlider.value = 1400; heightSlider.value = 1400;
      updateVal(widthSlider, widthVal); updateVal(heightSlider, heightVal);
      ctorDirty = false;
      drawWindow(); calcPrice();
    }

    
// Swiper reviews slider
let reviewsSwiper = null;
function initReviewsSwiper() {
  if (reviewsSwiper) reviewsSwiper.destroy(true, true);
  reviewsSwiper = new Swiper('.mySwiper', {
    slidesPerView: 1, spaceBetween: 30, loop: true, grabCursor: true,
    keyboard: { enabled: true }, a11y: { enabled: true },
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    breakpoints: { 768: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 3, spaceBetween: 30 } }
  });
}
// Swiper инициализируется в loadReviews() уже на данных из БД (на скелетоне не нужен — иначе loop-warning)

// ===== Supabase: контент из БД (только published/approved через RLS) =====
const SUPABASE_URL = 'https://ermeokjqkzpkefqtmvif.supabase.co';
const SUPABASE_ANON = 'sb_publishable_LhXYeGG0w8wzi7JOlPx5Qg_GXd2Zc0K';
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON) : null;
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ===== Галерея работ как кейсы =====
let WORKS = [], PHOTOS = {}, activeCat = 'all', CAT_ORDER = [];
function okUrl(u) { return (u && /^(https?:\/\/|\/)/i.test(u)) ? u : ''; }
function photosOf(w) {
  const list = (PHOTOS[w.id] || []).slice();
  const cover = okUrl(w.image_url);
  if (cover && !list.includes(cover)) list.unshift(cover);
  return list;
}

async function loadGallery() {
  const grid = document.getElementById('gallery-grid'); if (!sb || !grid) return;
  const { data, error } = await sb.from('works')
    .select('id,title,category,description,image_url,scope,system,duration_days,area,warranty,price_from,tpl_window_type,sort')
    .eq('published', true).order('sort');
  if (error) return console.error('works:', error.message);
  if (!data || !data.length) { document.getElementById('gallery-empty').style.display = 'block'; return; }
  WORKS = data;
  const ids = data.map(w => w.id);
  const { data: ph } = await sb.from('work_photos').select('work_id,url,sort').in('work_id', ids).order('sort');
  PHOTOS = {};
  (ph || []).forEach(p => { const u = okUrl(p.url); if (u) (PHOTOS[p.work_id] = PHOTOS[p.work_id] || []).push(u); });
  const { data: cats } = await sb.from('categories').select('name').order('sort');
  CAT_ORDER = (cats || []).map(c => c.name);
  renderFilters();
  renderGallery();
}

function renderFilters() {
  const box = document.getElementById('gallery-filters'); if (!box) return;
  const cats = [...new Set(WORKS.map(w => w.category).filter(Boolean))];
  if (CAT_ORDER.length) cats.sort((a, b) => (CAT_ORDER.indexOf(a) + 1 || 999) - (CAT_ORDER.indexOf(b) + 1 || 999));
  const mk = (val, label) => {
    const b = document.createElement('button');
    b.className = 'gallery-chip' + (activeCat === val ? ' active' : '');
    b.textContent = label; b.type = 'button'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', activeCat === val ? 'true' : 'false');
    b.onclick = () => { activeCat = val; renderFilters(); renderGallery(); };
    return b;
  };
  box.replaceChildren(mk('all', 'Все'), ...cats.map(c => mk(c, c)));
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid'); if (!grid) return;
  const items = activeCat === 'all' ? WORKS : WORKS.filter(w => w.category === activeCat);
  grid.innerHTML = items.map(w => {
    const cover = photosOf(w)[0] || '';
    const media = cover
      ? `<img src="${esc(cover)}" alt="${esc(w.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
      : `<svg><use href="#win-illus"/></svg>`;
    const from = w.price_from ? `<span class="gallery-from">от ${Number(w.price_from).toLocaleString('ru-RU')} ₽</span>` : '';
    return `<article class="gallery-card" tabindex="0" role="button" data-id="${esc(w.id)}" onclick="openWork('${esc(w.id)}', this)" onkeydown="if(event.key==='Enter')openWork('${esc(w.id)}', this)">`
      + `<div class="gallery-img"><span class="gallery-cat">${esc(w.category || 'Работа')}</span>${media}<div class="gallery-overlay"><span>Смотреть ↗</span></div></div>`
      + `<div class="gallery-body"><h3>${esc(w.title)}</h3><p>${esc(w.description || '')}</p>${from}</div></article>`;
  }).join('');
}

async function loadReviews() {
  const wrap = document.getElementById('reviews-wrapper'); if (!sb || !wrap) return;
  const { data, error } = await sb.from('reviews').select('author_name,author_city,rating,text').eq('approved', true).order('created_at', { ascending: false });
  if (error) { wrap.innerHTML = ''; document.getElementById('reviews-empty').style.display = 'block'; document.getElementById('reviews-swiper').style.display = 'none'; return console.error('reviews:', error.message); }
  if (!data.length) { document.getElementById('reviews-empty').style.display = 'block'; document.getElementById('reviews-swiper').style.display = 'none'; return; }
  // агрегат рейтинга
  const agg = document.getElementById('reviews-agg');
  if (agg) {
    const avg = data.reduce((s, r) => s + (r.rating || 0), 0) / data.length;
    const full = Math.round(avg), n = data.length;
    const word = (n % 10 === 1 && n % 100 !== 11) ? 'отзыв' : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'отзыва' : 'отзывов');
    agg.innerHTML = `<span class="stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span><span class="rate">${avg.toFixed(1)}</span><span class="cnt">· ${n} ${word}</span>`;
    agg.style.display = 'flex';
  }
  wrap.innerHTML = data.map(r => {
    const initial = esc((r.author_name || '?').trim().charAt(0).toUpperCase());
    return `<div class="swiper-slide"><div class="review-card">`
      + `<div class="review-stars" aria-label="${r.rating} из 5">${'★'.repeat(r.rating)}</div>`
      + `<p class="quote">«${esc(r.text)}»</p>`
      + `<div class="review-author"><div class="review-avatar">${initial}</div><div><h4>${esc(r.author_name)}</h4><p>${esc(r.author_city||'')}</p></div></div>`
      + `</div></div>`;
  }).join('');
  initReviewsSwiper();
}

async function loadNews() {
  const grid = document.getElementById('news-grid'); if (!sb || !grid) return;
  const { data, error } = await sb.from('news').select('title,preview_text,created_at').eq('published', true).order('created_at', { ascending: false }).limit(8);
  if (error) { grid.innerHTML = ''; document.getElementById('news-empty').style.display = 'block'; return console.error('news:', error.message); }
  if (!data.length) { grid.innerHTML = ''; document.getElementById('news-empty').style.display = 'block'; return; }
  const fmt = d => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
  grid.innerHTML = data.map(n => `<article class="news-card"><span class="news-date">${esc(fmt(n.created_at))}</span><h3>${esc(n.title)}</h3><p>${esc(n.preview_text||'')}</p></article>`).join('');
}

loadGallery(); loadReviews(); loadNews();

// ===== Review modal =====
const reviewModal = document.getElementById('review-modal');
const reviewStatusEl = document.getElementById('review-status');
const stars = document.querySelectorAll('.star');
const ratingInput = document.getElementById('r-rating');
let lastFocused = null;

function highlightStars(n) {
  stars.forEach(s => { s.style.color = (parseInt(s.dataset.rating) <= n) ? '#fbbf24' : '#d1d5db'; });
}

function trapFocus(e) {
  if (e.key === 'Escape') { closeReviewModal(); return; }
  if (e.key !== 'Tab') return;
  const f = reviewModal.querySelectorAll('button, input, textarea, [tabindex]:not([tabindex="-1"])');
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function openReviewModal() {
  lastFocused = document.activeElement;
  reviewModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  reviewStatusEl.className = 'form-status';
  highlightStars(parseInt(ratingInput.value) || 5);
  document.addEventListener('keydown', trapFocus);
  document.getElementById('r-name').focus();
}

function closeReviewModal() {
  reviewModal.classList.add('hidden');
  document.body.style.overflow = '';
  document.getElementById('review-form').reset();
  ratingInput.value = 5;
  highlightStars(5);
  reviewStatusEl.className = 'form-status';
  document.removeEventListener('keydown', trapFocus);
  if (lastFocused) lastFocused.focus();
}

// клик по затемнению вне карточки закрывает модалку
reviewModal.addEventListener('click', (e) => { if (e.target === reviewModal) closeReviewModal(); });

// выбор рейтинга: клик, клавиатура, ховер
function pickStar(star) {
  ratingInput.value = parseInt(star.dataset.rating);
  highlightStars(parseInt(star.dataset.rating));
}
stars.forEach(star => {
  star.addEventListener('click', () => pickStar(star));
  star.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickStar(star); } });
  star.addEventListener('mouseenter', () => highlightStars(parseInt(star.dataset.rating)));
});
const ratingRow = document.querySelector('.rating');
if (ratingRow) ratingRow.addEventListener('mouseleave', () => highlightStars(parseInt(ratingInput.value) || 5));
highlightStars(parseInt(ratingInput.value) || 5);

// отправка отзыва -> /api/review (модерация в Telegram)
document.getElementById('review-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameEl = document.getElementById('r-name');
  const textEl = document.getElementById('r-text');
  const name = nameEl.value.trim();
  const text = textEl.value.trim();
  const city = (document.getElementById('r-city')?.value || '').trim();
  const rating = parseInt(ratingInput.value);
  const setStatus = (type, msg) => { reviewStatusEl.className = 'form-status ' + type; reviewStatusEl.textContent = msg; };
  nameEl.classList.toggle('invalid', !name);
  textEl.classList.toggle('invalid', !text);
  if (!name || !text) { setStatus('err', 'Заполните имя и текст отзыва'); return; }
  const btn = e.target.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Отправка...';
  setStatus('', '');
  try {
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, city, rating, text })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus('ok', data.message || 'Спасибо! Ваш отзыв отправлен на модерацию.');
      document.getElementById('review-form').reset();
      ratingInput.value = 5; highlightStars(5);
    } else {
      setStatus('err', 'Ошибка: ' + (data.error || ('код ' + res.status)));
    }
  } catch (err) {
    setStatus('err', 'Ошибка отправки: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = orig;
  }
});
// ===== Детальный вид кейса (work-detail) =====
const workModal = document.getElementById('work-detail');
const wdCard = document.getElementById('wd-card');
let wdLastFocused = null;
const wdReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function wdKeydown(e) {
  if (e.key === 'Escape') { closeWork(); return; }
  if (e.key !== 'Tab') return;
  const f = workModal.querySelectorAll('button, a[href], img.wd-thumb, .wd-rail-item, [tabindex]:not([tabindex="-1"])');
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function wdSetHero(url) {
  const hero = document.getElementById('wd-hero');
  if (url) hero.src = url; else hero.removeAttribute('src');
  workModal.querySelectorAll('.wd-thumb').forEach(t => t.classList.toggle('active', t.dataset.url === url));
}

function openWork(id, cardEl) {
  const w = WORKS.find(x => x.id === id); if (!w) return;
  if (!workModal.classList.contains('hidden')) cardEl = null; // переход между кейсами — без FLIP
  else wdLastFocused = document.activeElement;
  const photos = photosOf(w);

  document.getElementById('wd-cat').textContent = w.category || 'Работа';
  document.getElementById('wd-title').textContent = w.title || 'Работа';
  document.getElementById('wd-desc').textContent = w.description || '';
  document.getElementById('wd-hero').alt = w.title || '';

  // миниатюры
  const thumbs = document.getElementById('wd-thumbs');
  thumbs.replaceChildren();
  photos.forEach((u, i) => {
    const img = document.createElement('img');
    img.className = 'wd-thumb' + (i === 0 ? ' active' : '');
    img.src = u; img.alt = ''; img.dataset.url = u; img.loading = 'lazy'; img.tabIndex = 0;
    img.addEventListener('click', () => wdSetHero(u));
    img.addEventListener('keydown', e => { if (e.key === 'Enter') wdSetHero(u); });
    thumbs.appendChild(img);
  });
  thumbs.style.display = photos.length > 1 ? 'flex' : 'none';
  wdSetHero(photos[0] || '');

  // перечень работ
  const scope = document.getElementById('wd-scope');
  scope.replaceChildren();
  (w.scope || []).forEach(s => { const li = document.createElement('li'); li.textContent = s; scope.appendChild(li); });

  // мета
  const meta = document.getElementById('wd-meta');
  meta.replaceChildren();
  const dur = w.duration_days ? (w.duration_days === 1 ? '1 день' : w.duration_days + ' дня') : null;
  [[w.system, '🪟'], [dur, '🕒'], [w.area, '📍'], [w.warranty && 'Гарантия ' + w.warranty, '🛡']]
    .filter(([t]) => t).forEach(([t, ic]) => { const s = document.createElement('span'); s.textContent = ic + ' ' + t; meta.appendChild(s); });

  // цена «от»
  const price = document.getElementById('wd-price');
  price.replaceChildren();
  if (w.price_from) {
    price.append('от ' + Number(w.price_from).toLocaleString('ru-RU') + ' ₽');
    const sm = document.createElement('small'); sm.textContent = 'ориентировочно, под ключ'; price.appendChild(sm);
    price.style.display = '';
  } else { price.style.display = 'none'; }

  document.getElementById('wd-calc').onclick = () => calcLikeThis(w.tpl_window_type);

  // правый рейл — ТОЛЬКО другие работы этой же категории
  const rail = document.getElementById('wd-rail');
  const railAside = workModal.querySelector('.wd-rail');
  const railTitle = workModal.querySelector('.wd-rail-title');
  const grid = workModal.querySelector('.wd-grid');
  rail.replaceChildren();
  const sameCat = WORKS.filter(x => x.id !== id && x.category === w.category);
  if (!sameCat.length) {
    if (railAside) railAside.style.display = 'none';
    if (grid) grid.classList.add('no-rail');
  } else {
    if (railAside) railAside.style.display = '';
    if (grid) grid.classList.remove('no-rail');
    if (railTitle) railTitle.textContent = 'Ещё в категории «' + (w.category || 'Работы') + '»';
    sameCat.forEach(o => {
      const item = document.createElement('div'); item.className = 'wd-rail-item'; item.tabIndex = 0; item.setAttribute('role', 'button');
      const im = document.createElement('img'); const ph = photosOf(o)[0]; if (ph) im.src = ph; im.alt = ''; im.loading = 'lazy';
      const tb = document.createElement('div');
      const t = document.createElement('div'); t.className = 't'; t.textContent = o.title;
      const c = document.createElement('div'); c.className = 'c'; c.textContent = o.category || '';
      tb.append(t, c); item.append(im, tb);
      item.addEventListener('click', () => openWork(o.id));
      item.addEventListener('keydown', e => { if (e.key === 'Enter') openWork(o.id); });
      rail.appendChild(item);
    });
  }

  workModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', wdKeydown);
  wdCard.scrollTop = 0;
  flipOpen(cardEl);
  workModal.querySelector('.modal-close').focus();
  if (window.ym) ym(0, 'reachGoal', 'portfolio_open');
}

// FLIP: карточка «вырастает» в оверлей. Fallback — просто показать (reduced-motion / нет rect).
function flipOpen(cardEl) {
  if (wdReduce || !cardEl || typeof cardEl.getBoundingClientRect !== 'function') return;
  const first = cardEl.getBoundingClientRect();
  const last = wdCard.getBoundingClientRect();
  if (!first.width || !last.width) return;
  const dx = first.left - last.left, dy = first.top - last.top;
  const sx = first.width / last.width, sy = first.height / last.height;
  wdCard.style.transformOrigin = 'top left';
  wdCard.style.transform = `translate(${dx}px,${dy}px) scale(${sx},${sy})`;
  wdCard.style.opacity = '0.5';
  requestAnimationFrame(() => {
    wdCard.style.transition = 'transform .42s cubic-bezier(.2,.8,.2,1), opacity .3s ease';
    wdCard.style.transform = 'none'; wdCard.style.opacity = '1';
  });
  wdCard.addEventListener('transitionend', function te() {
    wdCard.style.transition = ''; wdCard.style.transformOrigin = ''; wdCard.removeEventListener('transitionend', te);
  }, { once: true });
}

function closeWork() {
  workModal.classList.add('hidden');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', wdKeydown);
  if (wdLastFocused) wdLastFocused.focus();
}
workModal.addEventListener('click', (e) => { if (e.target === workModal) closeWork(); });

// CTA «Рассчитать для моей квартиры» — предвыбор типа в конструкторе + информер
function calcLikeThis(type) {
  closeWork();
  const sel = document.getElementById('window-type');
  if (sel && type && [...sel.options].some(o => o.value === type)) {
    sel.value = type;
    sel.dispatchEvent(new Event('change'));
  }
  const informer = document.getElementById('ctor-informer');
  if (informer) informer.style.display = 'flex';
  document.getElementById('constructor').scrollIntoView({ behavior: wdReduce ? 'auto' : 'smooth' });
  if (window.ym) ym(0, 'reachGoal', 'portfolio_to_calculator');
}

// Lead form — маска телефона, динамическая валидация по полям, отправка в /api/lead
(function () {
  const form = document.getElementById('lead-form');
  const phoneEl = document.getElementById('lead-phone');
  const nameEl = document.getElementById('lead-name');
  const consentEl = document.getElementById('lead-consent');
  const consentLabel = document.getElementById('lead-consent-label');
  const statusEl = document.getElementById('lead-status');
  const errName = document.getElementById('err-name');
  const errPhone = document.getElementById('err-phone');
  const errConsent = document.getElementById('err-consent');
  const setStatus = (type, msg) => { statusEl.className = 'form-status ' + type; statusEl.textContent = msg; };

  const setErr = (input, errEl, msg) => {
    if (input) input.classList.add('invalid');
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
  };
  const clrErr = (input, errEl) => {
    if (input) input.classList.remove('invalid');
    if (errEl) { errEl.classList.remove('show'); errEl.textContent = ''; }
  };

  // Валидаторы возвращают true/false и обновляют сообщение под полем
  function validName() {
    const v = nameEl.value.trim();
    if (!v) { setErr(nameEl, errName, 'Укажите, как к вам обращаться'); return false; }
    if (v.length < 2) { setErr(nameEl, errName, 'Имя слишком короткое'); return false; }
    clrErr(nameEl, errName); return true;
  }
  function validPhone() {
    const d = phoneEl.value.replace(/\D/g, '');
    if (!d || d.length < 11) { setErr(phoneEl, errPhone, 'Введите номер в формате +7 (___) ___-__-__'); return false; }
    clrErr(phoneEl, errPhone); return true;
  }
  function validConsent() {
    if (!consentEl.checked) {
      if (consentLabel) consentLabel.classList.add('invalid');
      if (errConsent) { errConsent.textContent = 'Нужно согласие на обработку персональных данных'; errConsent.classList.add('show'); }
      return false;
    }
    if (consentLabel) consentLabel.classList.remove('invalid');
    if (errConsent) { errConsent.classList.remove('show'); errConsent.textContent = ''; }
    return true;
  }

  // Маска телефона РФ: +7 (XXX) XXX-XX-XX
  phoneEl.addEventListener('input', () => {
    let d = phoneEl.value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (!d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    phoneEl.value = out;
    if (phoneEl.classList.contains('invalid')) validPhone(); // очистить ошибку по мере ввода
  });

  // Валидация на blur; повторная проверка по input — только если поле уже в ошибке
  nameEl.addEventListener('blur', validName);
  nameEl.addEventListener('input', () => { if (nameEl.classList.contains('invalid')) validName(); });
  phoneEl.addEventListener('blur', validPhone);
  consentEl.addEventListener('change', validConsent);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // honeypot: бот заполнил скрытое поле — делаем вид, что всё ок
    if (document.getElementById('lead-company').value) { setStatus('ok', 'Заявка отправлена!'); form.reset(); return; }

    const okName = validName(), okPhone = validPhone(), okConsent = validConsent();
    if (!okName || !okPhone || !okConsent) {
      setStatus('err', 'Проверьте выделенные поля');
      (!okName ? nameEl : !okPhone ? phoneEl : consentEl).focus();
      return;
    }

    const name = nameEl.value.trim();
    const message = document.getElementById('lead-message').value.trim();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Отправка...';
    setStatus('', '');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: phoneEl.value, message, cart_items: (typeof cart !== 'undefined' && cart.length ? cart.map(i => ({ type: i.typeText, profile: i.profText, glass: i.glassText, hardware: i.hwText, width: parseInt(i.width), height: parseInt(i.height), price: i.price })) : null) })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('ok', data.message || 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
        form.reset();
        clearCart();
        const fp = document.getElementById('form-order-preview');
        if (fp) { fp.style.display = 'none'; fp.replaceChildren(); }
        clrErr(nameEl, errName); clrErr(phoneEl, errPhone);
        if (consentLabel) consentLabel.classList.remove('invalid');
        if (errConsent) { errConsent.classList.remove('show'); errConsent.textContent = ''; }
        if (window.ym) ym(0, 'reachGoal', 'lead'); // цель Яндекс.Метрики (активна, когда счётчик подключён)
      } else {
        setStatus('err', 'Ошибка: ' + (data.error || ('код ' + res.status)));
      }
    } catch (err) {
      setStatus('err', 'Не удалось отправить: ' + err.message + '. Позвоните нам напрямую.');
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  });
})();

// ===== Навигация: тень хедера, scroll-spy, бренд → наверх, появление секций =====
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');

  // Тень хедера + липкая мобильная CTA-панель при прокрутке
  const mcta = document.getElementById('mobile-cta');
  const contactSec = document.getElementById('contact');
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
    if (mcta) {
      // показываем после скролла, но прячем, когда секция контактов входит в кадр
      // (там уже есть форма и кнопки — дублировать не нужно)
      const contactTop = contactSec ? contactSec.getBoundingClientRect().top : Infinity;
      mcta.classList.toggle('show', window.scrollY > 500 && contactTop > window.innerHeight * 0.55);
    }
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Клик по бренду (лого) — всегда в самый верх страницы
  document.querySelectorAll('a.brand[href="#hero"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', location.pathname);
    });
  });

  // Scroll-spy: подсветка активного пункта меню при прокрутке
  const navLinks = [...document.querySelectorAll('.nav-link')];
  const sections = ['constructor', 'gallery', 'reviews', 'news', 'contact']
    .map(id => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(s => spy.observe(s));
  }

  // Плавное появление секций при прокрутке (с уважением к prefers-reduced-motion)
  if (!reduce && 'IntersectionObserver' in window) {
    const sel = ['#constructor .text-center', '#constructor .grid', '#gallery .text-center', '.gallery-grid',
      '#reviews .text-center', '#news .text-center', '.news-grid', '#contact .lead-copy', '#contact .form-card'];
    const targets = sel.flatMap(s => [...document.querySelectorAll(s)]);
    targets.forEach(el => el.classList.add('reveal'));
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    targets.forEach(el => io.observe(el));
  }
})();
