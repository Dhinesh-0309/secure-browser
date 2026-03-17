const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const app     = express();
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

const readDB = () => {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('db.json corrupted, resetting:', e.message);
    const fresh = { exams: [], sessions: [], violations: [] };
    fs.writeFileSync(DB_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
};
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// Generate a short readable exam code like "EXAM-4F2K"
function genCode() {
  return 'EXAM-' + Math.random().toString(36).toUpperCase().slice(2, 6);
}

// ── EXAM CRUD ──────────────────────────────────────────────

// Create exam
app.post('/api/exam', (req, res) => {
  const { title, duration, questions } = req.body;
  if (!title || !questions || questions.length === 0)
    return res.status(400).json({ error: 'title and questions required' });

  const db   = readDB();
  let code   = genCode();
  // ensure unique
  while (db.exams.find(e => e.code === code)) code = genCode();

  const exam = {
    id: uuidv4(),
    code,
    title,
    duration: duration || 30,   // minutes
    questions,                   // [{text, options:[str], answer:idx}]
    createdAt: new Date().toISOString()
  };
  db.exams.push(exam);
  writeDB(db);
  res.json({ exam });
});

// Get exam by code (student — no answer keys)
app.get('/api/exam/:code', (req, res) => {
  const db   = readDB();
  const exam = db.exams.find(e => e.code === req.params.code.toUpperCase());
  if (!exam) return res.status(404).json({ error: 'Exam not found' });
  // Strip answer keys before sending to student
  const safe = {
    ...exam,
    questions: exam.questions.map(({ text, options }) => ({ text, options }))
  };
  res.json(safe);
});

// Get all exams (admin)
app.get('/api/admin/exams', (req, res) => {
  const db = readDB();
  res.json(db.exams);
});

// Delete exam
app.delete('/api/admin/exam/:id', (req, res) => {
  const db  = readDB();
  db.exams  = db.exams.filter(e => e.id !== req.params.id);
  writeDB(db);
  res.json({ ok: true });
});

// ── SESSION ────────────────────────────────────────────────

app.post('/api/session/start', (req, res) => {
  const { studentName, examCode } = req.body;
  const db   = readDB();
  const exam = db.exams.find(e => e.code === examCode);
  if (!exam) return res.status(404).json({ error: 'Invalid exam code' });

  const session = {
    id: uuidv4(),
    studentName,
    examCode,
    examTitle: exam.title,
    startTime: new Date().toISOString(),
    endTime:   null,
    submitted: false,
    answers:   {},
    score:     null,   // marks scored
    cheatScore: 0
  };
  db.sessions.push(session);
  writeDB(db);
  res.json({ sessionId: session.id, duration: exam.duration });
});

// ── VIOLATION ──────────────────────────────────────────────

app.post('/api/violation', (req, res) => {
  const { sessionId, type, detail, score } = req.body;
  const db = readDB();
  db.violations.push({
    id: uuidv4(), sessionId, type, detail, score,
    timestamp: new Date().toISOString()
  });
  const session = db.sessions.find(s => s.id === sessionId);
  if (session) session.cheatScore = (session.cheatScore || 0) + score;
  writeDB(db);
  res.json({ ok: true });
});

// ── SUBMIT ─────────────────────────────────────────────────

app.post('/api/session/submit', (req, res) => {
  const { sessionId, answers } = req.body;
  const db      = readDB();
  const session = db.sessions.find(s => s.id === sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const exam = db.exams.find(e => e.code === session.examCode);
  let correct = 0;
  if (exam) {
    exam.questions.forEach((q, i) => {
      const key = `q${i + 1}`;
      if (answers[key] !== undefined && answers[key] === q.answer) correct++;
    });
  }

  session.answers    = answers;
  session.endTime    = new Date().toISOString();
  session.submitted  = true;
  session.score      = exam ? `${correct}/${exam.questions.length}` : 'N/A';
  writeDB(db);
  res.json({ ok: true, cheatScore: session.cheatScore, score: session.score });
});

// ── ADMIN RESULTS ──────────────────────────────────────────

app.get('/api/admin/sessions', (req, res) => {
  const { examCode } = req.query;
  const db = readDB();
  let sessions = db.sessions;
  if (examCode) sessions = sessions.filter(s => s.examCode === examCode);
  const result = sessions.map(s => ({
    ...s,
    violations: db.violations.filter(v => v.sessionId === s.id)
  }));
  res.json(result);
});

// ── EXPORT CSV ─────────────────────────────────────────────

app.get('/api/admin/export', (req, res) => {
  const { examCode } = req.query;
  const db = readDB();
  let sessions = db.sessions.filter(s => s.submitted);
  if (examCode) sessions = sessions.filter(s => s.examCode === examCode);

  const rows = [
    ['Student Name', 'Exam', 'Score', 'Cheat Score', 'Integrity', 'Started', 'Duration', 'Violations']
  ];

  sessions.forEach(s => {
    const violations = db.violations.filter(v => v.sessionId === s.id);
    const duration   = s.endTime
      ? Math.round((new Date(s.endTime) - new Date(s.startTime)) / 1000) + 's'
      : '-';
    const integrity  = s.cheatScore === 0 ? 'Clean'
      : s.cheatScore <= 10 ? 'Low'
      : s.cheatScore <= 25 ? 'Moderate' : 'High';
    const vList = violations.map(v => `${v.type}(${v.detail})`).join(' | ');
    rows.push([
      s.studentName, s.examTitle || s.examCode,
      s.score || '-', s.cheatScore, integrity,
      new Date(s.startTime).toLocaleString(), duration,
      `"${vList}"`
    ]);
  });

  const csv = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="results-${examCode || 'all'}.csv"`);
  res.send(csv);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
