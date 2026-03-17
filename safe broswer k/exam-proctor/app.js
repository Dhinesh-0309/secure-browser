// ── Screen router ──────────────────────────────────────────
const SCREENS = ['screen-home','screen-admin','screen-code','screen-consent','screen-exam','screen-result'];

function show(id) {
  SCREENS.forEach(s => {
    const el = document.getElementById(s);
    if (!el) return;
    if (s === id) {
      el.style.display = 'block';
      requestAnimationFrame(() => el.classList.add('active'));
    } else {
      el.classList.remove('active');
      setTimeout(() => { if (!el.classList.contains('active')) el.style.display = 'none'; }, 300);
    }
  });
  if (id === 'screen-admin') { loadAdminExamList(); loadExams(); }
}

window.addEventListener('DOMContentLoaded', () => {
  const code = new URLSearchParams(window.location.search).get('code');
  if (code) {
    document.getElementById('s-code').value = code.toUpperCase();
    show('screen-code');
    verifyCode();
  }
});

// ══════════════════════════════════════════════════════════
//  ADMIN — Tabs
// ══════════════════════════════════════════════════════════
function aTab(name) {
  document.querySelectorAll('.atab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.apanel').forEach(p => p.classList.remove('active'));
  document.getElementById('atab-' + name).classList.add('active');
  document.getElementById('apanel-' + name).classList.add('active');
  if (name === 'results') loadResults();
  if (name === 'create')  loadAdminExamList();
}

// ══════════════════════════════════════════════════════════
//  ADMIN — Exam list
// ══════════════════════════════════════════════════════════
async function loadAdminExamList() {
  const el = document.getElementById('admin-exam-list');
  if (!el) return;
  const res   = await fetch('/api/admin/exams');
  const exams = await res.json();

  if (!exams.length) {
    el.innerHTML = '<p style="color:#475569;font-size:.85rem">No exams yet — create one above.</p>';
    return;
  }

  el.innerHTML = exams.map(e => `
    <div class="exam-list-card">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap">
          <span style="color:var(--text);font-weight:600;font-size:.9rem">${e.title}</span>
          <span class="code-badge">${e.code}</span>
        </div>
        <div style="color:var(--muted);font-size:.78rem;margin-bottom:8px">
          ${e.questions.length} questions &nbsp;·&nbsp; ${e.duration} min &nbsp;·&nbsp;
          Created ${new Date(e.createdAt).toLocaleDateString()}
        </div>
        <div class="link-row">
          <input type="text" value="${location.origin}/?code=${e.code}" readonly
            style="font-size:.78rem;padding:7px 10px" />
          <button class="btn-outline" onclick="copyText('${location.origin}/?code=${e.code}', this)"
            style="padding:7px 12px;font-size:.76rem;white-space:nowrap">Copy</button>
        </div>
      </div>
      <button class="btn-danger" onclick="deleteExam('${e.id}')"
        style="padding:7px 14px;font-size:.78rem;align-self:flex-start;flex-shrink:0">Delete</button>
    </div>`).join('');
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ Copied';
    btn.style.color = '#22c55e';
    btn.style.borderColor = '#22c55e';
    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; btn.style.borderColor = ''; }, 2000);
  });
}

async function deleteExam(id) {
  if (!confirm('Delete this exam? Existing sessions will remain.')) return;
  await fetch('/api/admin/exam/' + id, { method: 'DELETE' });
  loadAdminExamList();
  loadExams();
}

// ══════════════════════════════════════════════════════════
//  ADMIN — Create Exam
// ══════════════════════════════════════════════════════════
let qCount = 0;

function addQ() {
  qCount++;
  const i   = qCount;
  const div = document.createElement('div');
  div.id    = 'qb-' + i;
  div.className = 'q-block';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="color:var(--muted);font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px">
        Question ${i}
      </span>
      <button onclick="document.getElementById('qb-${i}').remove()"
        style="background:var(--bg);color:var(--muted);padding:4px 10px;border-radius:6px;font-size:.76rem;border:0.5px solid var(--border)">
        Remove</button>
    </div>
    <textarea id="qt-${i}" placeholder="Enter your question here..."></textarea>
    <div class="opts-grid">
      <input type="text" id="qo-${i}-0" placeholder="Option A" />
      <input type="text" id="qo-${i}-1" placeholder="Option B" />
      <input type="text" id="qo-${i}-2" placeholder="Option C" />
      <input type="text" id="qo-${i}-3" placeholder="Option D" />
    </div>
    <div class="correct-row">
      <span>Correct:</span>
      ${['A','B','C','D'].map((l,j) =>
        `<label><input type="radio" name="qa-${i}" value="${j}" /> ${l}</label>`
      ).join('')}
    </div>`;
  document.getElementById('q-builder').appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function createExam() {
  const title    = document.getElementById('a-title').value.trim();
  const duration = parseInt(document.getElementById('a-duration').value) || 30;
  if (!title) { alert('Enter an exam title.'); return; }

  const questions = [];
  for (let i = 1; i <= qCount; i++) {
    if (!document.getElementById('qb-' + i)) continue;
    const text    = document.getElementById('qt-' + i).value.trim();
    const options = [0,1,2,3].map(j => document.getElementById('qo-' + i + '-' + j).value.trim());
    const ansEl   = document.querySelector('input[name="qa-' + i + '"]:checked');
    if (!text)               { alert('Question ' + i + ': enter question text.'); return; }
    if (options.some(o=>!o)) { alert('Question ' + i + ': fill all 4 options.'); return; }
    if (!ansEl)              { alert('Question ' + i + ': select the correct answer.'); return; }
    questions.push({ text, options, answer: parseInt(ansEl.value) });
  }
  if (!questions.length) { alert('Add at least one question.'); return; }

  const res  = await fetch('/api/exam', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, duration, questions })
  });
  const { exam } = await res.json();

  document.getElementById('a-code').textContent = exam.code;
  const link = location.origin + '/?code=' + exam.code;
  document.getElementById('a-link').value = link;
  document.getElementById('a-created').style.display = 'block';
  document.getElementById('a-created').scrollIntoView({ behavior: 'smooth' });

  document.getElementById('q-builder').innerHTML = '';
  document.getElementById('a-title').value    = '';
  document.getElementById('a-duration').value = '';
  qCount = 0;
  loadAdminExamList();
}

function copyLink() {
  const btn = document.querySelector('[onclick="copyLink()"]');
  copyText(document.getElementById('a-link').value, btn);
}

// ══════════════════════════════════════════════════════════
//  ADMIN — Results
// ══════════════════════════════════════════════════════════
async function loadExams() {
  const res   = await fetch('/api/admin/exams');
  const exams = await res.json();
  const sel   = document.getElementById('r-filter');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">All Exams</option>' +
    exams.map(e =>
      `<option value="${e.code}" ${e.code===cur?'selected':''}>${e.title} (${e.code})</option>`
    ).join('');
}

async function loadResults() {
  await loadExams();
  const code     = document.getElementById('r-filter').value;
  const url      = '/api/admin/sessions' + (code ? '?examCode=' + code : '');
  const res      = await fetch(url);
  const sessions = await res.json();
  const submitted = sessions.filter(s => s.submitted);
  const flagged   = submitted.filter(s => s.cheatScore > 10);

  document.getElementById('r-summary').innerHTML = [
    { label:'Attempts',  value: sessions.length,  color:'var(--accent)' },
    { label:'Submitted', value: submitted.length, color:'var(--success)' },
    { label:'Flagged',   value: flagged.length,   color:'var(--danger)' }
  ].map(c => `
    <div class="summary-card" style="border-color:${c.color}22">
      <div class="val" style="color:${c.color}">${c.value}</div>
      <div class="lbl">${c.label}</div>
    </div>`).join('');

  if (!submitted.length) {
    document.getElementById('r-table').innerHTML = '<p style="color:#475569;padding:4px;font-size:.88rem">No submissions yet.</p>';
    return;
  }

  const badTypes = ['MOBILE_DETECTED','EXTRA_PERSON','MULTIPLE_FACES'];
  const rows = submitted.map(s => {
    const cs    = s.cheatScore || 0;
    const cls   = cs===0?'score-low':cs<=10?'score-low':cs<=25?'score-medium':'score-high';
    const label = cs===0?'Clean':cs<=10?'Low':cs<=25?'Moderate':'High';
    const dur   = s.endTime
      ? Math.round((new Date(s.endTime)-new Date(s.startTime))/1000)+'s' : '-';
    const vTypes = [...new Set((s.violations||[]).map(v=>v.type))];
    const vTags  = vTypes.length
      ? vTypes.map(t =>
          `<span style="display:inline-block;background:var(--bg);border:0.5px solid var(--border);border-radius:5px;padding:2px 7px;
            margin:2px;font-size:.72rem;font-weight:600;color:${badTypes.includes(t)?'var(--danger)':'var(--warn)'}">
            ${t.replace(/_/g,' ')}</span>`).join('')
      : '<span style="color:var(--muted);font-size:.8rem">None</span>';

    const sd = encodeURIComponent(JSON.stringify(s));
    return `<tr>
      <td style="font-weight:600">${s.studentName}</td>
      <td><span class="code-badge">${s.examCode}</span></td>
      <td style="font-weight:700;color:var(--text)">${s.score||'-'}</td>
      <td style="font-size:.8rem;color:var(--muted)">${new Date(s.startTime).toLocaleString()}</td>
      <td style="color:var(--muted)">${dur}</td>
      <td><span class="score-badge ${cls}">${label} (${cs})</span></td>
      <td>${vTags}</td>
      <td><button onclick="showV('${sd}')"
        style="background:var(--bg);color:var(--muted);padding:5px 12px;border-radius:7px;
               font-size:.76rem;cursor:pointer;border:0.5px solid var(--border);font-weight:600">
        Details</button></td>
    </tr>`;
  }).join('');

  document.getElementById('r-table').innerHTML = `
    <table>
      <thead><tr>
        <th>Student</th><th>Exam</th><th>Score</th>
        <th>Started</th><th>Duration</th><th>Integrity</th><th>Flags</th><th></th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function showV(encoded) {
  const s = JSON.parse(decodeURIComponent(encoded));
  document.getElementById('v-modal-title').textContent = s.studentName + ' — ' + s.examCode;
  const colorMap = {
    MOBILE_DETECTED:'score-high', EXTRA_PERSON:'score-high', MULTIPLE_FACES:'score-high',
    NO_FACE:'score-medium', LOOKING_AWAY:'score-medium',
    TAB_SWITCH:'score-low', WINDOW_BLUR:'score-low', FULLSCREEN_EXIT:'score-low'
  };
  const vs = s.violations || [];
  document.getElementById('v-modal-body').innerHTML = !vs.length
    ? '<p style="color:var(--muted)">No violations recorded.</p>'
    : `<p style="color:var(--muted);font-size:.82rem;margin-bottom:14px">
        Total cheat score: <span style="color:var(--danger);font-weight:700">${s.cheatScore}</span></p>` +
      vs.map(v => `
        <div style="display:flex;gap:12px;padding:11px 0;border-bottom:0.5px solid var(--border)">
          <span class="score-badge ${colorMap[v.type]||'score-low'}"
            style="white-space:nowrap;font-size:.7rem;align-self:flex-start">
            ${v.type.replace(/_/g,' ')}
          </span>
          <div>
            <div style="color:var(--text);font-size:.86rem;font-weight:500">${v.detail}</div>
            <div style="color:var(--muted);font-size:.76rem;margin-top:3px">
              ${new Date(v.timestamp).toLocaleString()} &nbsp;·&nbsp; +${v.score} pts
            </div>
          </div>
        </div>`).join('');
  document.getElementById('v-modal').classList.add('open');
}

function exportCSV() {
  const code = document.getElementById('r-filter').value;
  window.location.href = '/api/admin/export' + (code ? '?examCode=' + code : '');
}

// ══════════════════════════════════════════════════════════
//  STUDENT — Verify code
// ══════════════════════════════════════════════════════════
let currentExam = null;

document.getElementById('s-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') verifyCode();
});

async function verifyCode() {
  const code  = document.getElementById('s-code').value.trim().toUpperCase();
  const errEl = document.getElementById('s-code-err');
  errEl.style.display = 'none';
  if (!code) { errEl.textContent = 'Enter an exam code.'; errEl.style.display='block'; return; }

  try {
    const res = await fetch('/api/exam/' + code);
    if (!res.ok) {
      errEl.textContent = 'Invalid code. Please check and try again.';
      errEl.style.display = 'block';
      return;
    }
    currentExam = await res.json();
    document.getElementById('s-exam-title').textContent = currentExam.title;
    document.getElementById('s-exam-meta').textContent  =
      code + ' · ' + currentExam.duration + ' min · ' + currentExam.questions.length + ' questions';
    show('screen-consent');
  } catch (e) {
    errEl.textContent = 'Could not connect to server.';
    errEl.style.display = 'block';
  }
}

// ══════════════════════════════════════════════════════════
//  STUDENT — Start exam
// ══════════════════════════════════════════════════════════
let sessionId       = null;
let violationLogger = null;
let proctor         = null;
let timerInterval   = null;
let timeLeft        = 0;
let answers         = {};

async function startExam() {
  const name = document.getElementById('s-name').value.trim();
  if (!name) { alert('Enter your full name.'); return; }
  if (!document.getElementById('s-consent').checked) {
    alert('You must agree to the monitoring terms.'); return;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  } catch (e) {
    alert('Camera access is required. Please allow it and try again.'); return;
  }

  try { await document.documentElement.requestFullscreen(); } catch (_) {}

  const res  = await fetch('/api/session/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentName: name, examCode: currentExam.code })
  });
  const data = await res.json();
  if (data.error) { alert(data.error); return; }
  sessionId = data.sessionId;
  timeLeft  = (data.duration || 30) * 60;
  answers   = {};

  violationLogger = new ViolationLogger(sessionId);

  const video  = document.getElementById('proctor-video');
  const canvas = document.getElementById('proctor-canvas');
  video.srcObject = stream;
  await video.play();

  proctor = new Proctor(video, canvas, violationLogger);
  const cs = document.getElementById('cam-status');
  cs.textContent = '⏳ Loading AI...'; cs.className = 'warn';
  try {
    await proctor.init();
    proctor.start();
  } catch (e) {
    cs.textContent = '● Camera active'; cs.className = 'warn';
  }

  document.addEventListener('visibilitychange', onVisChange);
  window.addEventListener('blur', onBlur);
  document.addEventListener('fullscreenchange', onFSChange);

  renderQuestions();
  startTimer();
  document.getElementById('e-title').textContent = currentExam.title;
  show('screen-exam');
}

function onVisChange() { if (document.hidden) violationLogger.record('TAB_SWITCH','Page hidden'); }
function onBlur()      { violationLogger.record('WINDOW_BLUR','Window lost focus'); }
function onFSChange()  { if (!document.fullscreenElement) violationLogger.record('FULLSCREEN_EXIT','Exited fullscreen'); }

// ── Render questions with navigator ──
function renderQuestions() {
  const total = currentExam.questions.length;
  const qContainer = document.getElementById('e-questions');
  const qNav       = document.getElementById('q-nav');
  qContainer.innerHTML = '';
  qNav.innerHTML = '';

  currentExam.questions.forEach((q, i) => {
    // Question block
    const d = document.createElement('div');
    d.className = 'question-block card';
    d.id = 'question-' + (i+1);
    d.innerHTML = `<p>${i+1}. ${q.text}</p>` +
      q.options.map((opt, j) => `
        <label class="option-label" id="opt-${i+1}-${j}">
          <input type="radio" name="q${i+1}" value="${j}" />
          ${opt}
        </label>`).join('');
    qContainer.appendChild(d);

    // Nav button
    const btn = document.createElement('button');
    btn.className = 'q-nav-btn';
    btn.textContent = i + 1;
    btn.id = 'qnav-' + (i+1);
    btn.onclick = () => {
      document.getElementById('question-' + (i+1))
        .scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    qNav.appendChild(btn);
  });

  // Track answers + update nav + progress
  qContainer.addEventListener('change', e => {
    if (e.target.type !== 'radio') return;
    const qNum = parseInt(e.target.name.replace('q',''));
    answers[e.target.name] = parseInt(e.target.value);

    // Highlight selected option
    const block = document.getElementById('question-' + qNum);
    block.querySelectorAll('.option-label').forEach(l => l.classList.remove('selected'));
    e.target.closest('.option-label').classList.add('selected');

    // Mark nav button answered
    document.getElementById('qnav-' + qNum).classList.add('answered');

    updateProgress(total);
  });

  updateProgress(total);
}

function updateProgress(total) {
  const answered = Object.keys(answers).length;
  const pct = total ? (answered / total) * 100 : 0;
  document.getElementById('exam-progress-bar').style.width = pct + '%';
  document.getElementById('exam-progress-text').textContent = answered + ' / ' + total + ' answered';
}

// ── Timer ──
function startTimer() {
  const el = document.getElementById('e-timer');
  timerInterval = setInterval(() => {
    timeLeft--;
    const m = String(Math.floor(timeLeft/60)).padStart(2,'0');
    const s = String(timeLeft%60).padStart(2,'0');
    el.textContent = m + ':' + s;
    if (timeLeft <= 60) el.classList.add('urgent');
    if (timeLeft <= 0)  submitExam();
  }, 1000);
}

// ── Submit with confirm modal ──
function confirmSubmit() {
  const total      = currentExam.questions.length;
  const answered   = Object.keys(answers).length;
  const unanswered = total - answered;

  const modal    = document.getElementById('submit-modal');
  const icon     = document.getElementById('submit-modal-icon');
  const title    = document.getElementById('submit-modal-title');
  const msg      = document.getElementById('submit-modal-msg');
  const unEl     = document.getElementById('submit-unanswered');

  if (unanswered === 0) {
    title.textContent = 'Ready to submit?';
    msg.textContent   = 'You have answered all ' + total + ' questions. Submit now?';
    unEl.innerHTML    = '';
  } else {
    title.textContent = unanswered + ' question' + (unanswered>1?'s':'') + ' unanswered';
    msg.textContent   = 'You still have unanswered questions. Are you sure you want to submit?';
    // Show which ones
    const uList = [];
    for (let i = 1; i <= total; i++) {
      if (answers['q'+i] === undefined) uList.push(i);
    }
    unEl.innerHTML = uList.map(n =>
      `<span class="unanswered-pill">Q${n}</span>`).join('');
  }

  modal.classList.add('open');
}

function doSubmit() {
  document.getElementById('submit-modal').classList.remove('open');
  submitExam();
}

async function submitExam() {
  clearInterval(timerInterval);
  if (proctor) proctor.stop();
  if (document.fullscreenElement) document.exitFullscreen();

  document.removeEventListener('visibilitychange', onVisChange);
  window.removeEventListener('blur', onBlur);
  document.removeEventListener('fullscreenchange', onFSChange);

  const res  = await fetch('/api/session/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, answers })
  });
  const data = await res.json();

  document.getElementById('r-score').textContent = data.score || 'N/A';
  const cs = data.cheatScore || 0;
  const [msg, color] = cs === 0
    ? ['No issues detected', 'var(--success)']
    : cs <= 15
    ? ['Minor irregularities noted', 'var(--warn)']
    : ['Irregularities detected — under review', 'var(--danger)'];
  document.getElementById('r-integrity').innerHTML =
    `<span style="color:${color};font-weight:700">${msg}</span>`;

  show('screen-result');
}
