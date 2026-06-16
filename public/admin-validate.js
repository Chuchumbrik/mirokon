// Валидация и UX полей админки
window.AdminValidate = {
  clearAll() {
    document.querySelectorAll('.field-err').forEach(e => e.remove());
    document.querySelectorAll('.field-warn').forEach(e => e.remove());
    document.querySelectorAll('.input-invalid').forEach(e => e.classList.remove('input-invalid'));
    document.querySelectorAll('.input-warn').forEach(e => e.classList.remove('input-warn'));
  },
  show(id, msg, type) {
    const el = document.getElementById(id);
    if (!el) return false;
    const isWarn = type === 'warn';
    el.classList.toggle('input-invalid', !isWarn);
    el.classList.toggle('input-warn', isWarn);
    const cls = isWarn ? 'field-warn' : 'field-err';
    const wrap = el.closest('.row2 > div') || el.parentElement;
    const existing = wrap.querySelector('.' + cls + '[data-for="' + id + '"]');
    if (existing) existing.textContent = msg;
    else {
      const err = document.createElement('div');
      err.className = cls;
      err.textContent = msg;
      err.dataset.for = id;
      wrap.appendChild(err);
    }
    return false;
  },
  ok(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('input-invalid', 'input-warn'); }
    const wrap = el && (el.closest('.row2 > div') || el.parentElement);
    if (wrap) {
      wrap.querySelector('.field-err[data-for="' + id + '"]')?.remove();
      wrap.querySelector('.field-warn[data-for="' + id + '"]')?.remove();
    }
  },
  digitsPhone(v) {
    const d = String(v || '').replace(/\D/g, '').replace(/^8/, '7');
    return d.length >= 10 && d.length <= 11 && d.startsWith('7');
  },
  formatPhoneDisplay(digits) {
    const d = String(digits || '').replace(/\D/g, '').replace(/^8/, '7');
    if (d.length < 11) return '';
    return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9, 11);
  },
  email(v) {
    return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  },
  url(v) {
    return !v || /^https?:\/\/.+/i.test(v.trim());
  },
  len(v, min, max) {
    const s = String(v || '').trim();
    return s.length >= min && s.length <= max;
  },
  num(v, min, max) {
    const n = parseInt(v, 10);
    if (isNaN(n)) return false;
    if (min != null && n < min) return false;
    if (max != null && n > max) return false;
    return true;
  },
  slug(v) {
    return /^[a-z0-9][a-z0-9_-]*$/i.test(String(v || '').trim());
  },
  attachBlur(fields, fn) {
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.blurVal) return;
      el.dataset.blurVal = '1';
      el.addEventListener('blur', () => fn(id));
    });
  },
  initPhoneMask(phoneId, displayId) {
    const phone = document.getElementById(phoneId);
    const disp = displayId ? document.getElementById(displayId) : null;
    if (!phone || phone.dataset.mask) return;
    phone.dataset.mask = '1';
    phone.addEventListener('input', () => {
      let d = phone.value.replace(/\D/g, '').replace(/^8/, '7');
      if (d && !d.startsWith('7')) d = '7' + d;
      d = d.slice(0, 11);
      phone.value = d;
      if (disp && (!disp.value.trim() || disp.dataset.auto === '1')) {
        disp.value = d.length === 11 ? AdminValidate.formatPhoneDisplay(d) : '';
        disp.dataset.auto = '1';
      }
    });
    if (disp && !disp.dataset.mask) {
      disp.dataset.mask = '1';
      disp.addEventListener('input', () => { disp.dataset.auto = '0'; });
    }
  },
  initAdminUX() {
    AdminValidate.initPhoneMask('s-phone', 's-phone-disp');
    AdminValidate.initPhoneMask('s-wa');
    AdminValidate.attachBlur(['s-email', 's-phone', 's-wa', 's-vk', 's-avito', 's-seo-title', 's-seo-desc', 's-hero-price', 's-hero-lead', 's-footer-copy', 's-og-image-url', 'p-base', 'p-min', 'n-title', 'n-preview', 'rv-name', 'rv-text', 'w-title', 'w-pricefrom', 'c-new'], id => {
      if (typeof blurValidateField === 'function') blurValidateField(id);
    });
    const ogIn = document.getElementById('s-og-image');
    if (ogIn && !ogIn.dataset.ogHook) {
      ogIn.dataset.ogHook = '1';
      ogIn.addEventListener('change', () => {
        const f = ogIn.files[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        const img = new Image();
        img.onload = () => {
          const hint = document.getElementById('s-og-size-hint');
          if (hint) hint.textContent = 'Размер файла: ' + img.naturalWidth + '×' + img.naturalHeight + ' px' + (img.naturalWidth !== 1200 || img.naturalHeight !== 630 ? ' (рекомендуется 1200×630)' : ' ✓');
          URL.revokeObjectURL(url);
        };
        img.src = url;
      });
    }
  }
};
