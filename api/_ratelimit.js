// Общий rate-limit для публичных форм. Хранилище — Supabase (таблица rate_limits
// + RPC check_rate_limit, см. docs/supabase-rate-limit.sql).
// Файл с префиксом «_» не становится маршрутом на Vercel.

// IP клиента из заголовков прокси (первый хоп X-Forwarded-For).
function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Возвращает { allowed, degraded }. degraded=true — лимитер недоступен,
// тогда fail-open: лучше пропустить заявку, чем потерять реального клиента.
async function checkRateLimit(endpoint, ip, opts) {
  const { max = 3, windowSeconds = 3600 } = opts || {};
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return { allowed: true, degraded: true };
  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_ip: ip, p_endpoint: endpoint, p_max: max, p_window_seconds: windowSeconds })
    });
    if (!res.ok) return { allowed: true, degraded: true };
    const allowed = await res.json(); // RPC возвращает boolean
    return { allowed: allowed === true, degraded: false };
  } catch (e) {
    console.error('rate-limit error:', e.message);
    return { allowed: true, degraded: true };
  }
}

module.exports = { checkRateLimit, getClientIp };
