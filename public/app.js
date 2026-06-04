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
      document.getElementById(id).addEventListener('change', () => { drawWindow(); calcPrice(); });
    });
    widthSlider.addEventListener('input', () => { updateVal(widthSlider, widthVal); drawWindow(); calcPrice(); });
    heightSlider.addEventListener('input', () => { updateVal(heightSlider, heightVal); drawWindow(); calcPrice(); });

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

    function addToCart() {
      // Переносим параметры конструктора в заявку (ТЗ C-5)
      const typeText = document.getElementById('window-type').selectedOptions[0].textContent;
      const profText = document.getElementById('profile').selectedOptions[0].textContent;
      const glassText = document.getElementById('glass').selectedOptions[0].textContent;
      const hwText = document.getElementById('hardware').selectedOptions[0].textContent;
      const price = priceEl.textContent;
      const summary =
        `Заявка из конструктора:\n` +
        `• Тип: ${typeText}\n` +
        `• Профиль: ${profText}\n` +
        `• Стеклопакет: ${glassText}\n` +
        `• Фурнитура: ${hwText}\n` +
        `• Размер: ${widthSlider.value}×${heightSlider.value} мм\n` +
        `• Ориентировочно: ${price}`;
      const msg = document.getElementById('lead-message');
      if (msg) msg.value = summary;
      scrollToForm();
    }
    function resetCalc() {
      document.getElementById('window-type').selectedIndex = 0;
      document.getElementById('profile').selectedIndex = 0;
      document.getElementById('glass').selectedIndex = 0;
      document.getElementById('hardware').selectedIndex = 0;
      widthSlider.value = 1400; heightSlider.value = 1400;
      updateVal(widthSlider, widthVal); updateVal(heightSlider, heightVal);
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
initReviewsSwiper(); // на статичном fallback; loadReviews() переинициализирует после загрузки из БД

// ===== Supabase: контент из БД (только published/approved через RLS) =====
const SUPABASE_URL = 'https://ermeokjqkzpkefqtmvif.supabase.co';
const SUPABASE_ANON = 'sb_publishable_LhXYeGG0w8wzi7JOlPx5Qg_GXd2Zc0K';
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON) : null;
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function loadGallery() {
  const grid = document.getElementById('gallery-grid'); if (!sb || !grid) return;
  const { data, error } = await sb.from('works').select('title,category,description,image_url').eq('published', true).order('sort');
  if (error) return console.error('works:', error.message);
  if (!data.length) { document.getElementById('gallery-empty').style.display = 'block'; return; }
  grid.innerHTML = data.map(w => {
    const safeImg = w.image_url && /^(https?:\/\/|\/)/i.test(w.image_url) ? w.image_url : '';
    const media = safeImg
      ? `<img src="${esc(safeImg)}" alt="${esc(w.title)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
      : `<svg><use href="#win-illus"/></svg>`;
    return `<article class="gallery-card" tabindex="0" role="button" data-title="${esc(w.title)}" data-desc="${esc(w.description)}" data-img="${esc(safeImg)}" onclick="openLightbox(this)" onkeydown="if(event.key==='Enter')openLightbox(this)">`
      + `<div class="gallery-img"><span class="gallery-cat">${esc(w.category||'Работа')}</span>${media}<div class="gallery-overlay"><span>Смотреть ↗</span></div></div>`
      + `<div class="gallery-body"><h3>${esc(w.title)}</h3><p>${esc(w.description||'')}</p></div></article>`;
  }).join('');
}

async function loadReviews() {
  const wrap = document.getElementById('reviews-wrapper'); if (!sb || !wrap) return;
  const { data, error } = await sb.from('reviews').select('author_name,author_city,rating,text').eq('approved', true).order('created_at', { ascending: false });
  if (error) return console.error('reviews:', error.message);
  if (!data.length) { document.getElementById('reviews-empty').style.display = 'block'; document.getElementById('reviews-swiper').style.display = 'none'; return; }
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
  if (error) return console.error('news:', error.message);
  if (!data.length) { document.getElementById('news-empty').style.display = 'block'; return; }
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
      body: JSON.stringify({ name, rating, text })
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
// ===== Gallery lightbox =====
const lightbox = document.getElementById('lightbox');
let lbLastFocused = null;
function lbKeydown(e) {
  if (e.key === 'Escape') { closeLightbox(); return; }
  if (e.key !== 'Tab') return;
  const f = lightbox.querySelectorAll('button, a[href], input, textarea, [tabindex]:not([tabindex="-1"])');
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
function openLightbox(card) {
  lbLastFocused = document.activeElement;
  document.getElementById('lb-title').textContent = card.dataset.title || 'Работа';
  document.getElementById('lb-desc').textContent = card.dataset.desc || '';
  const box = lightbox.querySelector('.lightbox-img');
  box.replaceChildren();
  const imgUrl = card.dataset.img && /^(https?:\/\/|\/)/i.test(card.dataset.img) ? card.dataset.img : '';
  if (imgUrl) {
    const img = document.createElement('img');   // src через свойство не парсит HTML
    img.src = imgUrl; img.alt = '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover';
    box.appendChild(img);
  } else {
    box.innerHTML = '<svg><use href="#win-illus"/></svg>';
  }
  lightbox.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', lbKeydown);
  lightbox.querySelector('.modal-close').focus();
}
function closeLightbox() {
  lightbox.classList.add('hidden');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', lbKeydown);
  if (lbLastFocused) lbLastFocused.focus();
}
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

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
        body: JSON.stringify({ name, phone: phoneEl.value, message })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus('ok', data.message || 'Заявка отправлена! Мы свяжемся с вами в ближайшее время.');
        form.reset();
        clrErr(nameEl, errName); clrErr(phoneEl, errPhone); validConsent();
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
