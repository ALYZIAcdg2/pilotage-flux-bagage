export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') {
      return Response.redirect(new URL('/flux-bags.html', url.origin).toString(), 302);
    }
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }
    return env.ASSETS.fetch(request);
  }
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

async function handleApi(request, env, url) {
  try {
    if (url.pathname === '/api/health' && request.method === 'GET') {
      const row = await env.DB.prepare('SELECT 1 AS ok').first();
      return json({ ok: row?.ok === 1 });
    }

    if (url.pathname === '/api/data' && request.method === 'GET') {
      const result = await env.DB.prepare(
        'SELECT date, records_json FROM daily_data ORDER BY date'
      ).all();
      const data = {};
      for (const row of result.results || []) {
        try { data[row.date] = JSON.parse(row.records_json || '[]'); }
        catch { data[row.date] = []; }
      }
      const metaRows = await env.DB.prepare('SELECT key, value FROM app_metadata').all();
      const metadata = {};
      for (const row of metaRows.results || []) {
        try { metadata[row.key] = JSON.parse(row.value); }
        catch { metadata[row.key] = row.value; }
      }
      return json({ data, metadata });
    }

    if (url.pathname === '/api/days' && request.method === 'PUT') {
      const body = await request.json();
      const days = Array.isArray(body.days) ? body.days : [];
      if (days.length > 400) return json({ error: 'Trop de journées dans une seule requête.' }, 413);

      const statements = [];
      const now = new Date().toISOString();
      for (const item of days) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item?.date || '')) continue;
        const records = Array.isArray(item.records) ? item.records : [];
        if (records.length === 0) {
          statements.push(env.DB.prepare('DELETE FROM daily_data WHERE date = ?').bind(item.date));
        } else {
          statements.push(env.DB.prepare(`
            INSERT INTO daily_data(date, records_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
              records_json = excluded.records_json,
              updated_at = excluded.updated_at
          `).bind(item.date, JSON.stringify(records), now));
        }
      }

      const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};
      for (const [key, value] of Object.entries(metadata)) {
        if (value == null) continue;
        statements.push(env.DB.prepare(`
          INSERT INTO app_metadata(key, value, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        `).bind(key, JSON.stringify(value), now));
      }

      if (statements.length) await env.DB.batch(statements);
      return json({ ok: true, savedDays: days.length, savedAt: now });
    }

    return json({ error: 'Route API inconnue.' }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: error?.message || 'Erreur serveur.' }, 500);
  }
}
