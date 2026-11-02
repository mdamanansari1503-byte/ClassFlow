// node server.js


const { EventEmitter } = require('events');
const server = require('../server.js');

function mockRequest(options = {}) {
  const req = new EventEmitter();
  req.url = options.url || '/';
  req.method = options.method || 'GET';
  req.headers = options.headers || {};
  
  process.nextTick(() => {
    if (options.body) {
      req.emit('data', Buffer.from(typeof options.body === 'string' ? options.body : JSON.stringify(options.body)));
    }
    req.emit('end');
  });

  return req;
}

function mockResponse(callback) {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  let body = '';

  res.writeHead = function (code, headers) {
    res.statusCode = code;
    if (headers) Object.assign(res.headers, headers);
  };

  res.write = function (chunk) {
    body += chunk ? chunk.toString() : '';
  };

  res.end = function (chunk) {
    if (chunk) body += chunk.toString();
    callback({
      statusCode: res.statusCode,
      headers: res.headers,
      body: body
    });
  };

  return res;
}

function runTest(name, fn) {
  return new Promise((resolve) => {
    fn((err, result) => {
      if (err) {
        console.error(`❌ FAIL: ${name} ->`, err.message);
        resolve(false);
      } else {
        console.log(`✅ PASS: ${name}`);
        resolve(true);
      }
    });
  });
}

async function startSuite() {
  console.log('\n--- Running ClassFlow Backend Tests ---');
  let passed = 0;
  let total = 0;

  // Test 1: GET /api/homework
  total++;
  const t1 = await runTest('GET /api/homework returns 200 and data list', (done) => {
    const req = mockRequest({ url: '/api/homework', method: 'GET' });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200 got ${out.statusCode}`));
      const json = JSON.parse(out.body);
      if (!Array.isArray(json.data)) return done(new Error('Expected array'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t1) passed++;

  // Test 2: POST /api/homework
  total++;
  const t2 = await runTest('POST /api/homework creates new homework', (done) => {
    const payload = {
      subject: 'Physics',
      title: 'Test Optics Problem Set',
      description: 'Solve questions 1 through 5.',
      dueDate: '2026-11-10',
      dueTime: '17:00',
      priority: 'High',
      assignedBy: 'Tester'
    };
    const req = mockRequest({ url: '/api/homework', method: 'POST', body: payload });
    const res = mockResponse((out) => {
      if (out.statusCode !== 201) return done(new Error(`Expected 201 got ${out.statusCode}: ${out.body}`));
      const json = JSON.parse(out.body);
      if (json.data.title !== payload.title) return done(new Error('Title mismatch'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t2) passed++;

  // Test 3: GET /api/today-topics
  total++;
  const t3 = await runTest('GET /api/today-topics returns topics', (done) => {
    const req = mockRequest({ url: '/api/today-topics', method: 'GET' });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200 got ${out.statusCode}`));
      const json = JSON.parse(out.body);
      if (!Array.isArray(json.data)) return done(new Error('Expected array'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t3) passed++;

  // Test 4: POST /api/today-topics
  total++;
  const t4 = await runTest('POST /api/today-topics creates new covered topic', (done) => {
    const payload = {
      subject: 'Chemistry',
      period: 'Period 2',
      teacher: 'Dr. Sen',
      topicTitle: 'Thermodynamics: First Law & Enthalpy',
      details: 'Derived ΔU = q + w, covered adiabatic expansions.',
      keyFormulas: 'ΔH = ΔU + PΔV',
      date: '2026-11-02',
      postedBy: 'Tester'
    };
    const req = mockRequest({ url: '/api/today-topics', method: 'POST', body: payload });
    const res = mockResponse((out) => {
      if (out.statusCode !== 201) return done(new Error(`Expected 201 got ${out.statusCode}: ${out.body}`));
      const json = JSON.parse(out.body);
      if (json.data.topicTitle !== payload.topicTitle) return done(new Error('Topic title mismatch'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t4) passed++;

  // Test 5: GET /api/stats
  total++;
  const t5 = await runTest('GET /api/stats returns accurate statistics', (done) => {
    const req = mockRequest({ url: '/api/stats', method: 'GET' });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200 got ${out.statusCode}`));
      const json = JSON.parse(out.body);
      if (typeof json.totalHomework !== 'number' || typeof json.totalTopics !== 'number') {
        return done(new Error('Invalid stats response'));
      }
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t5) passed++;

  // Test 6: Static File Serving / (index.html)
  total++;
  const t6 = await runTest('GET / serves index.html', (done) => {
    const req = mockRequest({ url: '/', method: 'GET' });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200 got ${out.statusCode}`));
      if (!out.body.includes('ClassFlow')) return done(new Error('index.html missing ClassFlow text'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t6) passed++;

  // Test 7: Static File Serving /js/db.js
  total++;
  const t7 = await runTest('GET /js/db.js serves IndexedDB helper', (done) => {
    const req = mockRequest({ url: '/js/db.js', method: 'GET' });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200 got ${out.statusCode}`));
      if (!out.body.includes('ClassFlowDB')) return done(new Error('Missing ClassFlowDB'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t7) passed++;

  // Test 8: Static File Serving /js/components/modulesView.js
  total++;
  const t8 = await runTest('GET /js/components/modulesView.js serves module view', (done) => {
    const req = mockRequest({ url: '/js/components/modulesView.js', method: 'GET' });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200 got ${out.statusCode}`));
      if (!out.body.includes('ModulesView')) return done(new Error('Missing ModulesView'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t8) passed++;

  // Test 9: Static File Serving /js/components/notesView.js
  total++;
  const t9 = await runTest('GET /js/components/notesView.js serves notes view', (done) => {
    const req = mockRequest({ url: '/js/components/notesView.js', method: 'GET' });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200 got ${out.statusCode}`));
      if (!out.body.includes('NotesView')) return done(new Error('Missing NotesView'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t9) passed++;

  // Test 10: Static File Serving /js/components/remindersView.js
  total++;
  const t10 = await runTest('GET /js/components/remindersView.js serves reminders view', (done) => {
    const req = mockRequest({ url: '/js/components/remindersView.js', method: 'GET' });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200 got ${out.statusCode}`));
      if (!out.body.includes('RemindersView')) return done(new Error('Missing RemindersView'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t10) passed++;

  // Test 11: Create classroom via POST /api/auth/classroom
  total++;
  const t11 = await runTest('POST /api/auth/classroom creates new classroom', (done) => {
    const payload = {
      name: 'Aman',
      className: 'BTech-CS-2026',
      password: 'mypassword123'
    };
    const req = mockRequest({ url: '/api/auth/classroom', method: 'POST', body: payload });
    const res = mockResponse((out) => {
      if (out.statusCode !== 201 && out.statusCode !== 200) return done(new Error(`Expected 201 or 200, got ${out.statusCode}`));
      const json = JSON.parse(out.body);
      if (!json.success || !json.class) return done(new Error('Auth failed'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t11) passed++;

  // Test 12: Reject wrong classroom password
  total++;
  const t12 = await runTest('POST /api/auth/classroom rejects wrong password', (done) => {
    const payload = {
      name: 'Sneha',
      className: 'BTech-CS-2026',
      password: 'WRONG_PASSWORD'
    };
    const req = mockRequest({ url: '/api/auth/classroom', method: 'POST', body: payload });
    const res = mockResponse((out) => {
      if (out.statusCode !== 401) return done(new Error(`Expected 401, got ${out.statusCode}`));
      const json = JSON.parse(out.body);
      if (json.success !== false) return done(new Error('Expected success=false'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t12) passed++;

  // Test 13: Classroom homework isolation
  total++;
  const t13 = await runTest('POST /api/homework in specific class is isolated', (done) => {
    const payload = {
      subject: 'Compiler Design',
      topic: 'Lexical Analysis Homework',
      dueDate: '2026-11-20'
    };
    const req = mockRequest({
      url: '/api/homework',
      method: 'POST',
      headers: {
        'x-class-id': 'btech-cs-2026',
        'x-class-key': 'mypassword123'
      },
      body: payload
    });
    const res = mockResponse((out) => {
      if (out.statusCode !== 201) return done(new Error(`Expected 201, got ${out.statusCode}`));
      const json = JSON.parse(out.body);
      if (json.data.classId !== 'btech-cs-2026') return done(new Error('classId not assigned'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t13) passed++;

  // Test 14: Referral link check GET /api/auth/classroom/check
  total++;
  const t14 = await runTest('GET /api/auth/classroom/check verifies referral info', (done) => {
    const req = mockRequest({
      url: '/api/auth/classroom/check?class=BTech-CS-2026&pass=mypassword123',
      method: 'GET'
    });
    const res = mockResponse((out) => {
      if (out.statusCode !== 200) return done(new Error(`Expected 200, got ${out.statusCode}`));
      const json = JSON.parse(out.body);
      if (!json.exists || !json.passwordMatch) return done(new Error('Referral check mismatch'));
      done(null);
    });
    server.emit('request', req, res);
  });
  if (t14) passed++;

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)`);
  console.log(`========================================\n`);

  process.exit(passed === total ? 0 : 1);
}

startSuite();


