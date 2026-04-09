const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads', 'img');

let db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'cms2',
  password: process.env.DB_PASSWORD || 'SuperCN$168@',
  database: process.env.DB_NAME || 'cms2',
  waitForConnections: true,
  connectionLimit: 10,
});

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

  if (method === 'POST' && pathname === '/api/upload/image') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { image } = JSON.parse(body);
        if (!image) {
          return sendError(res, 400, 'No image data provided');
        }
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const extMatch = image.match(/^data:image\/(\w+);base64,/);
        const ext = extMatch ? (extMatch[1] === 'jpeg' ? '.jpg' : '.' + extMatch[1]) : '.jpg';
        const hash = crypto.randomBytes(16).toString('hex');
        const filename = hash + ext;
        const filepath = path.join(UPLOAD_DIR, filename);
        fs.writeFileSync(filepath, buffer);

        const [result] = await pool.execute(
          'INSERT INTO cms_images (filename) VALUES (?)',
          [filename]
        );
        const imageId = result.insertId;

        sendJSON(res, 201, { data: { id: imageId, filename, url: `/image/${imageId}` } });
      } catch (err) {
        console.error('Upload error:', err);
        sendError(res, 500, 'Failed to upload image');
      }
    });
    return;
  }

  if (method === 'GET' && pathname.startsWith('/image/')) {
    const imageId = pathname.split('/')[2];
    try {
      const [rows] = await pool.execute('SELECT filename FROM cms_images WHERE id = ?', [imageId]);
      if (!rows.length) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Image not found' }));
      }
      const filename = rows[0].filename;
      const filepath = path.join(UPLOAD_DIR, filename);
      if (!fs.existsSync(filepath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Image file not found' }));
      }
      res.writeHead(200, { 'Content-Type': 'image/png' });
      fs.createReadStream(filepath).pipe(res);
      return;
    } catch (err) {
      console.error('Image fetch error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to fetch image' }));
    }
  }

  if (method === 'GET' && pathname === '/api/documents') {
    try {
      const [rows] = await pool.execute('SELECT * FROM documents ORDER BY ordering ASC');
      const documents = await Promise.all(rows.map(async (doc) => {
        const [langRows] = await pool.execute('SELECT * FROM documents_lang WHERE docid = ?', [doc.id]);
        const [imgRows] = await pool.execute('SELECT * FROM documents_images WHERE docid = ? ORDER BY ordering', [doc.id]);
        
        const langDict = {};
        langRows.forEach((lang) => {
          langDict[lang.lang] = {
            title: lang.title,
            subtitle: lang.subtitle,
            content: lang.content ? String(lang.content) : '',
            subcontent: lang.subcontent ? String(lang.subcontent) : '',
            meta_title: lang.meta_title || '',
            meta_description: lang.meta_description || '',
            meta_keywords: lang.meta_keywords || '',
          };
        });
        
        return {
          ...doc,
          lang_data: langDict,
          images: imgRows,
        };
      }));
      return sendJSON(res, 200, { data: documents, total: documents.length });
    } catch (err) {
      console.error('Documents fetch error:', err);
      return sendError(res, 500, 'Failed to fetch documents');
    }
  }

  if (method === 'GET' && pathname.match(/^\/api\/documents\/\d+$/)) {
    const id = pathname.split('/')[3];
    try {
      const [rows] = await pool.execute('SELECT * FROM documents WHERE id = ?', [id]);
      if (!rows.length) return sendError(res, 404, 'Document not found');
      const doc = rows[0];
      
      const [langRows] = await pool.execute('SELECT * FROM documents_lang WHERE docid = ?', [id]);
      const [imgRows] = await pool.execute('SELECT * FROM documents_images WHERE docid = ? ORDER BY ordering', [id]);
      
      const langDict = {};
      langRows.forEach((lang) => {
        langDict[lang.lang] = {
          title: lang.title,
          subtitle: lang.subtitle,
          content: lang.content ? String(lang.content) : '',
          subcontent: lang.subcontent ? String(lang.subcontent) : '',
          meta_title: lang.meta_title || '',
          meta_description: lang.meta_description || '',
          meta_keywords: lang.meta_keywords || '',
        };
      });
      
      return sendJSON(res, 200, { data: { ...doc, lang_data: langDict, images: imgRows } });
    } catch (err) {
      console.error('Document fetch error:', err);
      return sendError(res, 500, 'Failed to fetch document');
    }
  }

  if (method === 'POST' && pathname === '/api/documents') {
    try {
    const body = await parseBody(req);
    const { slug, parent_menuid, footer_group_id, is_published, in_header, in_footer, ordering, footer_ordering, lang_data } = body;
    
    const [result] = await pool.execute(
      `INSERT INTO documents (parent_menuid, footer_group_id, is_published, in_header, in_footer, slug, ordering, footer_ordering)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [parent_menuid || 0, footer_group_id || 0, is_published || 0, in_header || 0, in_footer || 0, slug || '', ordering || 1, footer_ordering || 10]
    );
    const docId = result.insertId;
    
    if (lang_data) {
      for (const [lang, langValue] of Object.entries(lang_data)) {
        await pool.execute(
          `INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [docId, lang, (langValue).title || '', (langValue).subtitle || '', (langValue).content || '', (langValue).subcontent || '', (langValue).meta_title || '', (langValue).meta_description || '', (langValue).meta_keywords || '']
        );
      }
    }
    
    return sendJSON(res, 201, { data: { id: docId } });
    } catch (err) {
      console.error('Document create error:', err);
      return sendError(res, 500, 'Failed to create document');
    }
  }

  if (method === 'PUT' && pathname.match(/^\/api\/documents\/\d+$/)) {
    const id = pathname.split('/')[3];
    try {
      const body = await parseBody(req);
      const { slug, parent_menuid, footer_group_id, is_published, in_header, in_footer, ordering, footer_ordering, lang_data } = body;
      
      await pool.execute(
        `UPDATE documents SET parent_menuid=?, footer_group_id=?, is_published=?, in_header=?, in_footer=?, slug=?, ordering=?, footer_ordering=? WHERE id=?`,
        [parent_menuid || 0, footer_group_id || 0, is_published || 0, in_header || 0, in_footer || 0, slug || '', ordering || 1, footer_ordering || 10, id]
      );
      
      if (lang_data) {
        for (const [lang, langValue] of Object.entries(lang_data)) {
          const [existing] = await pool.execute('SELECT id FROM documents_lang WHERE docid=? AND lang=?', [id, lang]);
          if (existing.length) {
            await pool.execute(
              `UPDATE documents_lang SET title=?, subtitle=?, content=?, subcontent=?, meta_title=?, meta_description=?, meta_keywords=? WHERE docid=? AND lang=?`,
              [(langValue).title || '', (langValue).subtitle || '', (langValue).content || '', (langValue).subcontent || '', (langValue).meta_title || '', (langValue).meta_description || '', (langValue).meta_keywords || '', id, lang]
            );
          } else {
            await pool.execute(
              `INSERT INTO documents_lang (docid, lang, title, subtitle, content, subcontent, meta_title, meta_description, meta_keywords)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, lang, (langValue).title || '', (langValue).subtitle || '', (langValue).content || '', (langValue).subcontent || '', (langValue).meta_title || '', (langValue).meta_description || '', (langValue).meta_keywords || '']
            );
          }
        }
      }
      
      return sendJSON(res, 200, { data: { success: true } });
    } catch (err) {
      console.error('Document update error:', err);
      return sendError(res, 500, 'Failed to update document');
    }
  }

  if (method === 'DELETE' && pathname.match(/^\/api\/documents\/\d+$/)) {
    const id = pathname.split('/')[3];
    try {
      await pool.execute('DELETE FROM documents_lang WHERE docid=?', [id]);
      await pool.execute('DELETE FROM documents_images WHERE docid=?', [id]);
      await pool.execute('DELETE FROM documents WHERE id=?', [id]);
      return sendJSON(res, 200, { success: true });
    } catch (err) {
      console.error('Document delete error:', err);
      return sendError(res, 500, 'Failed to delete document');
    }
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