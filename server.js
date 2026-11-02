const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'database', 'global-data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Connected SSE clients for live global updates
let sseClients = [];

function broadcastSSE(classId, eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    if (!classId || !client.classId || client.classId === classId) {
      try {
        client.res.write(payload);
      } catch (err) {
        // client disconnected
      }
    }
  });
}

// Database Helper (supports multi-class isolation)
function readDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialData = {
        classes: {
          general: {
            id: 'general',
            name: 'General',
            password: '123',
            createdAt: new Date().toISOString(),
            homework: [],
            todayTopics: []
          }
        }
      };
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const data = JSON.parse(raw);

    // Migration: if database still has top-level homework/todayTopics and no classes
    if (!data.classes) {
      data.classes = {
        general: {
          id: 'general',
          name: 'General',
          password: '123',
          createdAt: new Date().toISOString(),
          homework: data.homework || [],
          todayTopics: data.todayTopics || []
        }
      };
      delete data.homework;
      delete data.todayTopics;
      writeDatabase(data);
    }
    return data;
  } catch (err) {
    console.error('Error reading database:', err);
    return { classes: {} };
  }
}

function writeDatabase(data) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    // Write atomically via temporary file
    const tempPath = `${DB_PATH}.tmp.${crypto.randomBytes(4).toString('hex')}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, DB_PATH);
    return true;
  } catch (err) {
    console.error('Error writing database:', err);
    return false;
  }
}

// Helper to normalize class identifiers (case-insensitive, URL-safe)
function normalizeClassId(name) {
  if (!name) return 'general';
  return String(name).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'general';
}

// Resolve classroom from request headers or query params
function resolveClassroom(req, searchParams, db, checkAuth = false) {
  const hId = req.headers['x-class-id'];
  const hName = req.headers['x-class-name'];
  const hKey = req.headers['x-class-key'];

  const pId = searchParams.get('classId') || searchParams.get('class');
  const pKey = searchParams.get('key') || searchParams.get('pass');

  const rawName = hId || pId || hName || 'general';
  const classId = normalizeClassId(rawName);
  const password = (hKey || pKey || '').trim();

  if (!db.classes || typeof db.classes !== 'object') {
    db.classes = {};
  }

  if (!db.classes[classId]) {
    if (classId === 'general') {
      db.classes.general = {
        id: 'general',
        name: 'General',
        password: '123',
        createdAt: new Date().toISOString(),
        homework: [],
        todayTopics: []
      };
      writeDatabase(db);
    } else {
      return { error: 'Classroom not found. Please check class name or join again.', statusCode: 404 };
    }
  }

  const classroom = db.classes[classId];
  if (!Array.isArray(classroom.homework)) classroom.homework = [];
  if (!Array.isArray(classroom.todayTopics)) classroom.todayTopics = [];

  if (checkAuth && classroom.password && classId !== 'general') {
    if (classroom.password !== password) {
      return { error: 'Incorrect classroom password!', statusCode: 401 };
    }
  }

  return { classroom, classId };
}

// Helper to parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Safeguard against huge payloads (max 2MB)
      if (body.length > 2 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Send JSON Response helper
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Class-Id, X-Class-Name, X-Class-Key'
  });
  res.end(JSON.stringify(data));
}

// Static File Server Helper
function serveStaticFile(req, res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA Fallback: serve index.html for unknown routes if not an API request
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (indexErr, indexContent) => {
          if (indexErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
            res.end(indexContent);
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    }
  });
}

// Server Instance
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Class-Id, X-Class-Name, X-Class-Key'
    });
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const searchParams = reqUrl.searchParams;
  const method = req.method;

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // 0) CLASSROOM AUTHENTICATION & GATEWAY
  // POST /api/auth/classroom (Join or Create Classroom)
  if (pathname === '/api/auth/classroom' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const studentName = (body.name || '').trim();
      const rawClassName = (body.className || '').trim();
      const password = (body.password || '').trim();

      if (!studentName) {
        return sendJson(res, 400, { success: false, error: 'Student name is required' });
      }
      if (!rawClassName) {
        return sendJson(res, 400, { success: false, error: 'Classroom name is required' });
      }
      if (!password) {
        return sendJson(res, 400, { success: false, error: 'Classroom password is required' });
      }

      const classId = normalizeClassId(rawClassName);
      const db = readDatabase();

      if (!db.classes[classId]) {
        // Create new classroom
        db.classes[classId] = {
          id: classId,
          name: rawClassName,
          password: password,
          createdAt: new Date().toISOString(),
          homework: [],
          todayTopics: []
        };
        writeDatabase(db);
        return sendJson(res, 201, {
          success: true,
          isNew: true,
          message: `Classroom "${rawClassName}" created successfully!`,
          class: { id: classId, name: rawClassName, password: password },
          studentName
        });
      }

      // Existing classroom: verify password
      const existing = db.classes[classId];
      if (existing.password && existing.password !== password) {
        return sendJson(res, 401, {
          success: false,
          error: `Incorrect password for classroom "${existing.name}". Please check the password or create a different class.`
        });
      }

      return sendJson(res, 200, {
        success: true,
        isNew: false,
        message: `Joined classroom "${existing.name}" successfully!`,
        class: { id: classId, name: existing.name, password: existing.password },
        studentName
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // GET /api/auth/classroom/check (Quick pre-check for referral link)
  if (pathname === '/api/auth/classroom/check' && method === 'GET') {
    const raw = searchParams.get('class');
    const key = searchParams.get('pass') || searchParams.get('key');
    if (!raw) return sendJson(res, 400, { success: false, error: 'Class name required' });
    const classId = normalizeClassId(raw);
    const db = readDatabase();
    const existing = db.classes ? db.classes[classId] : null;
    if (!existing) {
      return sendJson(res, 200, { exists: false, classId, className: raw });
    }
    const passwordMatch = !existing.password || (existing.password === (key || '').trim());
    return sendJson(res, 200, {
      exists: true,
      classId,
      className: existing.name,
      passwordRequired: Boolean(existing.password),
      passwordMatch
    });
  }

  // SSE Live Updates: GET /api/events
  if (pathname === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 10000\n\n');

    const rawClass = searchParams.get('classId') || searchParams.get('class') || req.headers['x-class-id'] || 'general';
    const classId = normalizeClassId(rawClass);
    const clientId = crypto.randomUUID();
    const newClient = { id: clientId, classId, res };
    sseClients.push(newClient);

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c.id !== clientId);
    });
    return;
  }

  // GET /api/stats
  if (pathname === '/api/stats' && method === 'GET') {
    const db = readDatabase();
    const resolved = resolveClassroom(req, searchParams, db, false);
    if (resolved.error) {
      return sendJson(res, resolved.statusCode || 400, { success: false, error: resolved.error });
    }
    const classroom = resolved.classroom;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayHomeworkCount = classroom.homework.filter((h) => h.dueDate === todayStr).length;
    const todayTopicsCount = classroom.todayTopics.filter((t) => t.date === todayStr).length;

    // unique subjects
    const subjects = new Set([
      ...classroom.homework.map((h) => h.subject).filter(Boolean),
      ...classroom.todayTopics.map((t) => t.subject).filter(Boolean)
    ]);

    return sendJson(res, 200, {
      success: true,
      classId: resolved.classId,
      className: classroom.name,
      totalHomework: classroom.homework.length,
      todayHomeworkCount,
      todayTopicsCount,
      totalTopics: classroom.todayTopics.length,
      subjectsCount: subjects.size,
      subjects: Array.from(subjects)
    });
  }

  // 1) CLASSROOM HOMEWORK API
  // GET /api/homework
  if (pathname === '/api/homework' && method === 'GET') {
    const db = readDatabase();
    const resolved = resolveClassroom(req, searchParams, db, false);
    if (resolved.error) {
      return sendJson(res, resolved.statusCode || 400, { success: false, error: resolved.error });
    }
    const classroom = resolved.classroom;

    // Auto-prune expired homework
    const todayStr = new Date().toISOString().split('T')[0];
    const beforeLen = classroom.homework.length;
    classroom.homework = classroom.homework.filter(h => !h.dueDate || h.dueDate >= todayStr);
    if (classroom.homework.length !== beforeLen) writeDatabase(db);

    const subject = searchParams.get('subject');
    const date = searchParams.get('date');
    const search = searchParams.get('search');
    let list = [...classroom.homework];

    if (subject) {
      list = list.filter((h) => h.subject.toLowerCase() === subject.toLowerCase());
    }
    if (date) {
      list = list.filter((h) => h.dueDate === date);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((h) => 
        h.title.toLowerCase().includes(q) || 
        h.subject.toLowerCase().includes(q) ||
        (h.description && h.description.toLowerCase().includes(q))
      );
    }

    // Sort by dueDate asc, then createdAt desc
    list.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

    return sendJson(res, 200, { success: true, classId: resolved.classId, className: classroom.name, count: list.length, data: list });
  }

  // POST /api/homework
  if (pathname === '/api/homework' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const title = (body.topic || body.title || '').trim();
      const subject = (body.subject || '').trim();

      if (!title || !subject) {
        return sendJson(res, 400, { success: false, error: 'Subject and Topic are required' });
      }

      const db = readDatabase();
      const resolved = resolveClassroom(req, searchParams, db, false);
      if (resolved.error) {
        return sendJson(res, resolved.statusCode || 400, { success: false, error: resolved.error });
      }
      const classroom = resolved.classroom;
      const classId = resolved.classId;

      const newHomework = {
        id: 'hw-' + crypto.randomUUID().slice(0, 8),
        classId: classId,
        subject: subject,
        title: title,
        topic: title,
        description: (body.description || '').trim(),
        dueDate: body.dueDate || new Date().toISOString().split('T')[0],
        dueTime: body.dueTime || '23:59',
        priority: body.priority || 'Medium',
        assignedBy: (body.assignedBy || 'Student').trim(),
        tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map((t) => t.trim()).filter(Boolean) : []),
        resourceLink: (body.resourceLink || '').trim(),
        createdAt: new Date().toISOString()
      };

      classroom.homework.unshift(newHomework);
      writeDatabase(db);
      broadcastSSE(classId, 'homework_created', newHomework);

      return sendJson(res, 201, { success: true, data: newHomework });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // PUT /api/homework/:id
  if (pathname.startsWith('/api/homework/') && method === 'PUT') {
    const id = pathname.replace('/api/homework/', '');
    try {
      const body = await parseJsonBody(req);
      const db = readDatabase();
      const resolved = resolveClassroom(req, searchParams, db, false);
      if (resolved.error) {
        return sendJson(res, resolved.statusCode || 400, { success: false, error: resolved.error });
      }
      const classroom = resolved.classroom;
      const classId = resolved.classId;
      const index = classroom.homework.findIndex((h) => h.id === id);

      if (index === -1) {
        return sendJson(res, 404, { success: false, error: 'Homework not found' });
      }

      classroom.homework[index] = {
        ...classroom.homework[index],
        subject: body.subject ? body.subject.trim() : classroom.homework[index].subject,
        title: body.title ? body.title.trim() : classroom.homework[index].title,
        description: body.description !== undefined ? body.description.trim() : classroom.homework[index].description,
        dueDate: body.dueDate || classroom.homework[index].dueDate,
        dueTime: body.dueTime || classroom.homework[index].dueTime,
        priority: body.priority || classroom.homework[index].priority,
        resourceLink: body.resourceLink !== undefined ? body.resourceLink.trim() : classroom.homework[index].resourceLink,
        tags: Array.isArray(body.tags) ? body.tags : classroom.homework[index].tags,
        updatedAt: new Date().toISOString()
      };

      writeDatabase(db);
      broadcastSSE(classId, 'homework_updated', classroom.homework[index]);

      return sendJson(res, 200, { success: true, data: classroom.homework[index] });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // DELETE /api/homework/:id
  if (pathname.startsWith('/api/homework/') && method === 'DELETE') {
    const id = pathname.replace('/api/homework/', '');
    const db = readDatabase();
    const resolved = resolveClassroom(req, searchParams, db, false);
    if (resolved.error) {
      return sendJson(res, resolved.statusCode || 400, { success: false, error: resolved.error });
    }
    const classroom = resolved.classroom;
    const classId = resolved.classId;
    const initialLen = classroom.homework.length;
    classroom.homework = classroom.homework.filter((h) => h.id !== id);

    if (classroom.homework.length === initialLen) {
      return sendJson(res, 404, { success: false, error: 'Homework item not found' });
    }

    writeDatabase(db);
    broadcastSSE(classId, 'homework_deleted', { id });
    return sendJson(res, 200, { success: true, message: 'Homework removed', id });
  }

  // 2) CLASSROOM TODAY'S TOPICS API
  // GET /api/today-topics
  if (pathname === '/api/today-topics' && method === 'GET') {
    const db = readDatabase();
    const resolved = resolveClassroom(req, searchParams, db, false);
    if (resolved.error) {
      return sendJson(res, resolved.statusCode || 400, { success: false, error: resolved.error });
    }
    const classroom = resolved.classroom;
    const date = searchParams.get('date');
    const subject = searchParams.get('subject');
    const search = searchParams.get('search');
    let list = [...classroom.todayTopics];

    if (date) {
      list = list.filter((t) => t.date === date);
    }
    if (subject) {
      list = list.filter((t) => t.subject.toLowerCase() === subject.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.topicTitle.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.details && t.details.toLowerCase().includes(q))
      );
    }

    // Sort by date desc, then createdAt desc
    list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));

    return sendJson(res, 200, { success: true, classId: resolved.classId, className: classroom.name, count: list.length, data: list });
  }

  // POST /api/today-topics
  if (pathname === '/api/today-topics' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const subject = (body.subject || '').trim();
      const topicCovered = (body.topicCovered || body.topicTitle || '').trim();
      const reference = (body.reference || body.assignedHomeworkRef || '').trim();

      if (!subject || !topicCovered) {
        return sendJson(res, 400, { success: false, error: 'Subject and Topic are required' });
      }

      const db = readDatabase();
      const resolved = resolveClassroom(req, searchParams, db, false);
      if (resolved.error) {
        return sendJson(res, resolved.statusCode || 400, { success: false, error: resolved.error });
      }
      const classroom = resolved.classroom;
      const classId = resolved.classId;

      const newTopic = {
        id: 'topic-' + crypto.randomUUID().slice(0, 8),
        classId: classId,
        date: body.date || new Date().toISOString().split('T')[0],
        period: (body.period || 'General Lecture').trim(),
        subject: subject,
        teacher: (body.teacher || 'Faculty').trim(),
        topicTitle: topicCovered,
        topicCovered: topicCovered,
        details: (body.details || '').trim(),
        reference: reference,
        keyFormulas: (body.keyFormulas || '').trim(),
        assignedHomeworkRef: reference,
        postedBy: (body.postedBy || 'Student').trim(),
        createdAt: new Date().toISOString()
      };

      classroom.todayTopics.unshift(newTopic);
      writeDatabase(db);
      broadcastSSE(classId, 'topic_created', newTopic);

      return sendJson(res, 201, { success: true, data: newTopic });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // DELETE /api/today-topics/:id
  if (pathname.startsWith('/api/today-topics/') && method === 'DELETE') {
    const id = pathname.replace('/api/today-topics/', '');
    const db = readDatabase();
    const resolved = resolveClassroom(req, searchParams, db, false);
    if (resolved.error) {
      return sendJson(res, resolved.statusCode || 400, { success: false, error: resolved.error });
    }
    const classroom = resolved.classroom;
    const classId = resolved.classId;
    const initialLen = classroom.todayTopics.length;
    classroom.todayTopics = classroom.todayTopics.filter((t) => t.id !== id);

    if (classroom.todayTopics.length === initialLen) {
      return sendJson(res, 404, { success: false, error: 'Topic not found' });
    }

    writeDatabase(db);
    broadcastSSE(classId, 'topic_deleted', { id });
    return sendJson(res, 200, { success: true, message: 'Topic entry removed', id });
  }

  // -------------------------------------------------------------
  // STATIC ASSETS
  // -------------------------------------------------------------
  let cleanPath = decodeURIComponent(pathname).replace(/^[\/\\]+/, '');
  if (!cleanPath || cleanPath === '.' || cleanPath === '/') {
    cleanPath = 'index.html';
  }

  let filePath = path.join(PUBLIC_DIR, cleanPath);
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {
    // proceed to serveStaticFile
  }

  serveStaticFile(req, res, filePath);
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🎓 ClassFlow Server running at: http://localhost:${PORT}`);
    console.log(`📡 Real-Time Global Classroom Sync (SSE) active`);
    console.log(`💾 Global Data File: ${DB_PATH}`);
    console.log(`======================================================\n`);
  });
}

module.exports = server;
