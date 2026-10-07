/**
 * Клиент данных Mirokon для PHP API (замена @supabase/supabase-js).
 * Поддерживает подмножество API, которое используют app.js / admin.js / landing.html.
 */
(function (global) {
  const API = '/api';

  async function req(url, opts) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      ...opts,
      headers: {
        ...(opts && opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...((opts && opts.headers) || {}),
      },
    });
    let json = null;
    try { json = await res.json(); } catch (_) { json = null; }
    return { res, json };
  }

  class Query {
    constructor(table) {
      this.table = table;
      this._select = '*';
      this._filters = [];
      this._order = [];
      this._limit = null;
      this._single = false;
      this._maybeSingle = false;
      this._count = false;
      this._head = false;
      this._op = 'select';
      this._data = null;
    }
    select(cols, opts) {
      this._select = cols || '*';
      if (opts && opts.count === 'exact') this._count = true;
      if (opts && opts.head) this._head = true;
      return this;
    }
    eq(col, val) { this._filters.push(['eq', col, val]); return this; }
    neq(col, val) { this._filters.push(['neq', col, val]); return this; }
    in(col, vals) { this._filters.push(['in', col, vals]); return this; }
    order(col, opts) {
      const asc = !(opts && opts.ascending === false);
      this._order.push([col, asc ? 'asc' : 'desc']);
      return this;
    }
    limit(n) { this._limit = n; return this; }
    single() { this._single = true; return this; }
    maybeSingle() { this._maybeSingle = true; return this; }
    insert(data) {
      this._op = 'insert';
      this._data = data;
      return this;
    }
    update(data) {
      this._op = 'update';
      this._data = data;
      return this;
    }
    delete() {
      this._op = 'delete';
      return this;
    }
    upsert(data) {
      this._op = 'upsert';
      this._data = Array.isArray(data) ? data[0] : data;
      return this;
    }

    then(resolve, reject) {
      return this._execute().then(resolve, reject);
    }

    async _execute() {
      const body = {
        op: this._count && this._op === 'select' ? 'count' : this._op,
        table: this.table,
        select: this._select,
        filters: this._filters,
        order: this._order,
        limit: this._limit,
        single: this._single,
        maybeSingle: this._maybeSingle,
        count: this._count,
        head: this._head,
        data: this._data,
      };
      if (this._op === 'insert' && this._single) body.single = true;
      const { res, json } = await req(API + '/db.php', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        return { data: null, error: (json && (json.error || json.message)) ? json : { message: 'request failed' }, count: null };
      }
      if (this._count) {
        return { data: json.data, error: json.error || null, count: json.count };
      }
      return { data: json.data, error: json.error || null, count: json.count ?? null };
    }
  }

  function createClient() {
    return {
      from(table) { return new Query(table); },
      auth: {
        async getSession() {
          const { json } = await req(API + '/auth.php?action=session', { method: 'GET' });
          return { data: { session: json && json.data ? json.data.session : null }, error: null };
        },
        async signInWithPassword({ email, password }) {
          const { res, json } = await req(API + '/auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) return { data: null, error: { message: 'Invalid login' } };
          return { data: json.data, error: null };
        },
        async signOut() {
          await req(API + '/auth.php?action=logout', { method: 'POST', body: '{}' });
          return { error: null };
        },
      },
      async rpc(name) {
        if (name === 'is_admin') {
          const { json } = await req(API + '/auth.php?action=is_admin', { method: 'GET' });
          return { data: !!(json && json.data), error: null };
        }
        return { data: null, error: { message: 'unknown rpc' } };
      },
      storage: {
        from(_bucket) {
          return {
            async upload(path, file, _opts) {
              const fd = new FormData();
              fd.append('file', file);
              fd.append('path', path);
              const res = await fetch(API + '/upload.php', { method: 'POST', body: fd, credentials: 'same-origin' });
              const json = await res.json().catch(() => null);
              if (!res.ok || (json && json.error)) {
                return { data: null, error: (json && json.error) || { message: 'upload failed' } };
              }
              return { data: { path: json.data.path }, error: null };
            },
            getPublicUrl(path) {
              const clean = String(path || '').replace(/^\/+/, '');
              const url = clean.startsWith('uploads/') ? '/' + clean : '/uploads/' + clean;
              return { data: { publicUrl: url } };
            },
            async remove(paths) {
              const list = Array.isArray(paths) ? paths : [paths];
              const res = await fetch(API + '/upload.php', {
                method: 'DELETE',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paths: list }),
              });
              const json = await res.json().catch(() => null);
              return { data: json, error: res.ok ? null : { message: 'remove failed' } };
            },
          };
        },
      },
    };
  }

  global.createMirokonClient = createClient;
  // Совместимость: код, ожидающий window.supabase.createClient
  global.supabase = {
    createClient: function () { return createClient(); },
  };
})(window);
