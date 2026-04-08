const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function sendJSON(res, status, data) {
  res.writeHead(status, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  sendJSON(res, status, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function generateId(collection) {
  const ids = collection.map(item => item.id || 0);
  return Math.max(0, ...ids) + 1;
}

function updateDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const match = pathname.match(/^\/api\/(\w+)(?:\/(\d+))?$/);
  if (!match) {
    return sendError(res, 404, 'Not found');
  }

  const [, resource, idStr] = match;
  const id = idStr ? parseInt(idStr) : null;

  try {
    if (method === 'GET') {
      if (!db[resource]) {
        return sendError(res, 404, `Resource '${resource}' not found`);
      }

      if (id) {
        const item = db[resource].find(item => item.id === id);
        if (!item) return sendError(res, 404, 'Item not found');
        return sendJSON(res, 200, item);
      }

      let items = db[resource];

      const _page = parseInt(url.searchParams.get('_page')) || 1;
      const _limit = parseInt(url.searchParams.get('_limit')) || items.length;
      const _sort = url.searchParams.get('_sort');
      const _order = url.searchParams.get('_order') || 'asc';
      const _search = url.searchParams.get('q');

      if (_search) {
        const searchLower = _search.toLowerCase();
        items = items.filter(item =>
          Object.values(item).some(val =>
            String(val).toLowerCase().includes(searchLower)
          )
        );
      }

      if (_sort) {
        items.sort((a, b) => {
          const aVal = a[_sort];
          const bVal = b[_sort];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return _order === 'desc' ? -comparison : comparison;
        });
      }

      const start = (_page - 1) * _limit;
      const paginatedItems = items.slice(start, start + _limit);

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: paginatedItems,
        total: items.length,
        page: _page,
        limit: _limit
      }));
      return;
    }

    if (method === 'POST') {
      if (!db[resource]) {
        db[resource] = [];
      }
      const body = await parseBody(req);
      const newItem = { id: generateId(db[resource]), ...body };
      db[resource].push(newItem);
      updateDB();
      return sendJSON(res, 201, newItem);
    }

    if (method === 'PUT' || method === 'PATCH') {
      if (!id) return sendError(res, 400, 'ID required');
      const index = db[resource].findIndex(item => item.id === id);
      if (index === -1) return sendError(res, 404, 'Item not found');

      const body = await parseBody(req);
      db[resource][index] = { ...db[resource][index], ...body };
      updateDB();
      return sendJSON(res, 200, db[resource][index]);
    }

    if (method === 'DELETE') {
      if (!id) return sendError(res, 400, 'ID required');
      const index = db[resource].findIndex(item => item.id === id);
      if (index === -1) return sendError(res, 404, 'Item not found');

      db[resource].splice(index, 1);
      updateDB();
      return sendJSON(res, 200, { success: true });
    }

    sendError(res, 405, 'Method not allowed');
  } catch (err) {
    console.error('Server error:', err);
    sendError(res, 500, err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Mock API Server running on http://localhost:${PORT}`);
  console.log(`Serving data from: ${DB_PATH}`);
});