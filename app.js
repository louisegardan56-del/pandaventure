/* =====================================================================
   PANDA'VENTURE — app.js  v5
   ===================================================================== */

/* ── State ─────────────────────────────────────────────────────────── */
let currentStop   = null;
let currentTab    = 'photo';

// Quiz
let quizIndex     = 0;
let quizScorePts  = 0;   // points-based (TF=5, MCQ=10, estimate/order=15)
let quizAnswered  = false;
let orderSelected = [];

// Player
let playerName    = '';
let playerEmail   = '';
let teamName      = '';
let teamMembers   = '';

// Completion tracking
let quizDone  = {};   // { stopId: true }
let photoDone = {};   // { stopId: true }

// Live leaderboard
let sseSource     = null;

// Misc
let capsuleYears  = 5;


/* ── Boot ───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const stopId = parseInt(params.get('stop'));
  const stop   = STOPS.find(s => s.id === stopId);

  if (stop) {
    setTheme(stop);
    showOnboarding(stop);
  } else {
    showSplash();
  }
});


/* ── Theme ──────────────────────────────────────────────────────────── */
function setTheme(stop) {
  const app = document.getElementById('app');
  app.style.setProperty('--sc',       stop.color);
  app.style.setProperty('--sc-light', stop.colorLight);
  app.style.setProperty('--sc-dark',  stop.colorDark);
}

function resetTheme() {
  const app = document.getElementById('app');
  app.style.removeProperty('--sc');
  app.style.removeProperty('--sc-light');
  app.style.removeProperty('--sc-dark');
}


/* ── Screen transitions ─────────────────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}


/* ── Splash ─────────────────────────────────────────────────────────── */
function showSplash() {
  showScreen('screen-splash');
  setTimeout(() => showHome(), 2200);
}


/* ── Home / Map ─────────────────────────────────────────────────────── */
function showHome() {
  resetTheme();
  buildMap();
  showScreen('screen-home');
}

function buildMap() {
  const svg = document.getElementById('paris-map-svg');
  if (!svg || svg.dataset.built) return;
  svg.dataset.built = '1';

  const pins = [
    { id:1, cx:200, cy: 90 },
    { id:2, cx:210, cy:108 },
    { id:3, cx:118, cy: 80 },
    { id:4, cx:158, cy:112 },
    { id:5, cx:185, cy: 80 },
    { id:6, cx:170, cy: 94 },
    { id:7, cx:160, cy:122 },
  ];

  pins.forEach((p, idx) => {
    const stop = STOPS.find(s => s.id === p.id);
    if (!stop) return;

    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'map-pin');
    g.setAttribute('data-stop', p.id);
    g.style.cursor = 'pointer';
    g.style.animation = `pin-drop 0.5s cubic-bezier(.4,0,.2,1) ${idx * 0.08 + 0.3}s both`;

    const ring = document.createElementNS(ns, 'circle');
    ring.setAttribute('cx', p.cx); ring.setAttribute('cy', p.cy);
    ring.setAttribute('r', '12'); ring.setAttribute('fill', 'none');
    ring.setAttribute('stroke', stop.color); ring.setAttribute('stroke-width', '2.5');
    ring.setAttribute('opacity', '0.5');

    const animR = document.createElementNS(ns, 'animate');
    animR.setAttribute('attributeName', 'r');
    animR.setAttribute('values', '12;24');
    animR.setAttribute('dur', '2.2s');
    animR.setAttribute('begin', `${idx * 0.35}s`);
    animR.setAttribute('repeatCount', 'indefinite');
    animR.setAttribute('calcMode', 'spline');
    animR.setAttribute('keySplines', '0.4 0 0.6 1');

    const animO = document.createElementNS(ns, 'animate');
    animO.setAttribute('attributeName', 'opacity');
    animO.setAttribute('values', '0.5;0');
    animO.setAttribute('dur', '2.2s');
    animO.setAttribute('begin', `${idx * 0.35}s`);
    animO.setAttribute('repeatCount', 'indefinite');

    ring.appendChild(animR); ring.appendChild(animO);

    const shadow = document.createElementNS(ns, 'ellipse');
    shadow.setAttribute('cx', p.cx); shadow.setAttribute('cy', p.cy + 15);
    shadow.setAttribute('rx', '7'); shadow.setAttribute('ry', '2.5');
    shadow.setAttribute('fill', 'rgba(0,0,0,0.2)');

    const stem = document.createElementNS(ns, 'polygon');
    stem.setAttribute('points', `${p.cx-3.5},${p.cy+9} ${p.cx+3.5},${p.cy+9} ${p.cx},${p.cy+16}`);
    stem.setAttribute('fill', stop.color);

    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', p.cx); circle.setAttribute('cy', p.cy);
    circle.setAttribute('r', '12');
    circle.setAttribute('fill', stop.color);
    circle.setAttribute('stroke', '#ffffff'); circle.setAttribute('stroke-width', '2.5');
    circle.setAttribute('class', 'pin-circle');
    circle.setAttribute('filter', 'url(#pin-shadow)');

    const inner = document.createElementNS(ns, 'circle');
    inner.setAttribute('cx', p.cx); inner.setAttribute('cy', p.cy);
    inner.setAttribute('r', '8.5');
    inner.setAttribute('fill', 'rgba(255,255,255,0.22)');

    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', p.cx); text.setAttribute('y', p.cy + 4.5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '11');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = stop.emoji;

    g.appendChild(ring); g.appendChild(shadow); g.appendChild(stem);
    g.appendChild(circle); g.appendChild(inner); g.appendChild(text);

    g.addEventListener('click', (e) => { e.stopPropagation(); showMapCard(stop); });
    svg.appendChild(g);
  });
}


/* ── Map card ───────────────────────────────────────────────────────── */
function showMapCard(stop) {
  setTheme(stop);
  document.getElementById('mc-monument').textContent = stop.monument;
  document.getElementById('mc-species').textContent  = stop.species;
  document.getElementById('mc-emoji').textContent    = stop.emoji;
  document.getElementById('mc-slogan').textContent   = stop.slogan.replace('\n', ' ');

  const btn = document.getElementById('mc-go-btn');
  btn.onclick = null;
  btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); closeMapCard(); showOnboarding(stop); };

  document.getElementById('map-card').classList.add('open');
  const scroll = document.querySelector('.home-scroll');
  if (scroll) scroll.classList.add('locked');
  getOrCreateBackdrop().classList.add('visible');
}

function closeMapCard() {
  document.getElementById('map-card').classList.remove('open');
  const scroll = document.querySelector('.home-scroll');
  if (scroll) scroll.classList.remove('locked');
  const bd = document.getElementById('map-backdrop');
  if (bd) bd.classList.remove('visible');
  resetTheme();
}

function getOrCreateBackdrop() {
  let bd = document.getElementById('map-backdrop');
  if (!bd) {
    bd = document.createElement('div');
    bd.id = 'map-backdrop';
    bd.className = 'map-card-backdrop';
    bd.addEventListener('click', closeMapCard);
    document.getElementById('screen-home').appendChild(bd);
  }
  return bd;
}


/* ── Onboarding ─────────────────────────────────────────────────────── */
function showOnboarding(stop) {
  currentStop = stop;
  setTheme(stop);

  document.getElementById('ob-hero-photo').style.backgroundImage = `url("${stop.monumentPhoto}")`;

  const illu = document.getElementById('ob-species-illu');
  illu.src = stop.speciesIllustration;
  illu.alt = stop.species;

  document.getElementById('ob-monument').textContent = stop.monument;
  document.getElementById('ob-species').textContent  = stop.species;

  illu.classList.remove('animate-in');
  const sheet = document.querySelector('.ob-form-sheet');
  sheet.classList.remove('animate-in');

  showScreen('screen-onboarding');

  requestAnimationFrame(() => {
    illu.classList.add('animate-in');
    sheet.classList.add('animate-in');
  });

  document.getElementById('ob-email').value   = playerEmail   || '';
  document.getElementById('ob-team').value    = teamName      || '';
  document.getElementById('ob-members').value = teamMembers   || '';

  document.getElementById('ob-start-btn').onclick = () => {
    const emailVal   = document.getElementById('ob-email').value.trim();
    const teamVal    = document.getElementById('ob-team').value.trim();
    const membersVal = document.getElementById('ob-members').value.trim();

    if (!emailVal || !emailVal.includes('@')) { shakeField('ob-email'); return; }
    if (!teamVal)    { shakeField('ob-team'); return; }
    if (!membersVal) { shakeField('ob-members'); return; }

    playerEmail  = emailVal;
    teamName     = teamVal;
    teamMembers  = membersVal;
    playerName   = teamVal;

    openStop(stop);
  };
}

function shakeField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
}


/* ── Stop experience ────────────────────────────────────────────────── */
function openStop(stop) {
  currentStop = stop;
  setTheme(stop);

  document.getElementById('stop-hero-photo').style.backgroundImage = `url("${stop.photo}")`;
  document.getElementById('stop-monument').textContent = stop.monument;
  document.getElementById('stop-species').textContent  = stop.species;
  document.getElementById('stop-slogan').textContent   = stop.slogan;
  document.getElementById('stop-emoji-hero').textContent = stop.emoji;

  switchTab('photo');
  showScreen('screen-stop');
}

function goBackFromStop() {
  if (sseSource) { sseSource.close(); sseSource = null; }
  const params = new URLSearchParams(window.location.search);
  if (params.get('stop')) {
    window.location.href = window.location.pathname;
  } else {
    closeMapCard();
    showHome();
  }
}


/* ── Tabs ───────────────────────────────────────────────────────────── */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  const btn   = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  const panel = document.getElementById(`tab-${tab}`);
  if (btn)   btn.classList.add('active');
  if (panel) panel.classList.add('active');

  if (tab === 'photo') buildPhotoTab();
  if (tab === 'quiz')  initQuiz();
  if (tab === 'wwf')   buildWWFTab();
}


/* ════════════════════════════════════════════════════════════════════
   PHOTO TAB — GPS challenge
════════════════════════════════════════════════════════════════════ */
function buildPhotoTab() {
  const stop = currentStop;
  if (!stop) return;

  document.getElementById('photo-fact').textContent        = stop.fact;
  document.getElementById('photo-species-name').textContent = stop.species;
  document.getElementById('photo-species-emoji').textContent = stop.emoji;

  // Reset challenge status text
  const statusEl = document.getElementById('challenge-status');
  if (statusEl) { statusEl.textContent = ''; statusEl.className = 'challenge-status'; }
  const gpsBtn = document.getElementById('challenge-gps-btn');
  if (gpsBtn) { gpsBtn.disabled = false; gpsBtn.textContent = '📍 Je suis devant le panneau'; }

  // Photo done state
  if (photoDone[stop.id]) {
    document.getElementById('photo-challenge').classList.add('done');
    document.getElementById('photo-done-badge').classList.remove('hidden');
  } else {
    document.getElementById('photo-challenge').classList.remove('done');
    document.getElementById('photo-done-badge').classList.add('hidden');
  }

  updateCapsuleBtn();
}

/* GPS verification */
function verifyLocation() {
  const btn    = document.getElementById('challenge-gps-btn');
  const status = document.getElementById('challenge-status');

  btn.disabled    = true;
  btn.textContent = '📍 Localisation en cours…';
  status.textContent = '';
  status.className   = 'challenge-status';

  if (!navigator.geolocation) {
    status.textContent = 'GPS non disponible — caméra ouverte quand même.';
    btn.disabled    = false;
    btn.textContent = '📍 Je suis devant le panneau';
    openChallengeCamera();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const [lat2, lng2] = currentStop.panelCoords;
      const dist = haversineM(latitude, longitude, lat2, lng2);

      btn.disabled    = false;
      btn.textContent = '📍 Je suis devant le panneau';

      if (dist <= 300) {
        status.textContent = `✅ Vous êtes à ${Math.round(dist)} m du panneau — parfait !`;
        status.className   = 'challenge-status success';
        setTimeout(openChallengeCamera, 700);
      } else {
        status.innerHTML = `📍 Vous semblez être à ${Math.round(dist)} m du panneau.<br>`;
        status.className = 'challenge-status warning';

        const continueBtn = document.createElement('button');
        continueBtn.className = 'btn-secondary btn-sm';
        continueBtn.style.cssText = 'margin-top:10px;width:auto;display:inline-flex;';
        continueBtn.textContent = 'Ouvrir la caméra quand même';
        continueBtn.onclick = () => { continueBtn.remove(); openChallengeCamera(); };
        status.appendChild(continueBtn);
      }
    },
    () => {
      btn.disabled    = false;
      btn.textContent = '📍 Je suis devant le panneau';
      status.textContent = 'GPS indisponible — ouverture de la caméra.';
      status.className   = 'challenge-status warning';
      setTimeout(openChallengeCamera, 900);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

/* Haversine distance in metres */
function haversineM(lat1, lon1, lat2, lon2) {
  const R  = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* Open back camera with footprint overlay for the challenge */
function openChallengeCamera() {
  const overlay = document.getElementById('photobooth-overlay');
  overlay.dataset.mode = 'challenge';
  overlay.classList.add('open');

  document.getElementById('pb-footprints').classList.remove('hidden');
  document.getElementById('pb-frame-text').textContent = 'Challenge photo panneau';

  const video = document.getElementById('pb-video');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
    .then(stream => { video.srcObject = stream; video.play(); window._pbStream = stream; })
    .catch(() => {
      overlay.classList.remove('open');
      alert('Caméra non disponible sur cet appareil.');
    });
}

/* Open front camera for a keepsake selfie (legacy) */
function openPhotobooth() {
  const overlay = document.getElementById('photobooth-overlay');
  overlay.dataset.mode = 'souvenir';
  overlay.classList.add('open');

  document.getElementById('pb-footprints').classList.add('hidden');
  document.getElementById('pb-frame-text').textContent = '';

  const video = document.getElementById('pb-video');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    .then(stream => { video.srcObject = stream; video.play(); window._pbStream = stream; })
    .catch(() => {
      overlay.classList.remove('open');
      alert('Caméra non disponible sur cet appareil.');
    });
}

function closePhotobooth() {
  document.getElementById('photobooth-overlay').classList.remove('open');
  if (window._pbStream) { window._pbStream.getTracks().forEach(t => t.stop()); window._pbStream = null; }
}

function takePhoto() {
  const video  = document.getElementById('pb-video');
  const canvas = document.getElementById('pb-canvas');
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  // Watermark
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(0, canvas.height - 62, canvas.width, 62);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`${currentStop.emoji} ${currentStop.species}`, 16, canvas.height - 20);
  ctx.font = '14px sans-serif';
  ctx.fillText("Panda'venture × WWF", 16, canvas.height - 40);

  // Challenge completion
  const mode = document.getElementById('photobooth-overlay').dataset.mode;
  if (mode === 'challenge') {
    photoDone[currentStop.id] = true;
    updateCapsuleBtn();
    document.getElementById('photo-done-badge').classList.remove('hidden');
    document.getElementById('photo-challenge').classList.add('done');
  }

  const link = document.createElement('a');
  link.download = `pandaventure-${currentStop.id}-${mode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();

  closePhotobooth();
}

/* Capsule lock / unlock */
function updateCapsuleBtn() {
  const stop = currentStop;
  if (!stop) return;

  const btn     = document.getElementById('capsule-btn');
  const lockMsg = document.getElementById('capsule-lock-msg');
  const qDone   = quizDone[stop.id];
  const pDone   = photoDone[stop.id];

  if (!btn) return;

  if (qDone && pDone) {
    btn.disabled     = false;
    btn.style.opacity  = '1';
    btn.style.cursor   = 'pointer';
    btn.textContent    = '⏳ Créer ma capsule temporelle';
    if (lockMsg) lockMsg.classList.add('hidden');
  } else {
    btn.disabled     = true;
    btn.style.opacity  = '0.45';
    btn.style.cursor   = 'not-allowed';
    btn.textContent    = '🔒 Capsule temporelle';
    if (lockMsg) {
      lockMsg.classList.remove('hidden');
      const missing = [];
      if (!qDone) missing.push('le quiz');
      if (!pDone) missing.push('le défi photo');
      lockMsg.textContent = `Complète ${missing.join(' et ')} pour débloquer`;
    }
  }
}

function tryOpenCapsule() {
  const stop = currentStop;
  if (!stop) return;
  if (quizDone[stop.id] && photoDone[stop.id]) {
    showCapsule();
  } else {
    const lockMsg = document.getElementById('capsule-lock-msg');
    if (lockMsg) { lockMsg.classList.add('shake'); setTimeout(() => lockMsg.classList.remove('shake'), 500); }
  }
}


/* ════════════════════════════════════════════════════════════════════
   QUIZ — 4 question types
════════════════════════════════════════════════════════════════════ */
function initQuiz() {
  const stop = currentStop;
  if (!stop) return;

  quizIndex    = 0;
  quizScorePts = 0;
  quizAnswered = false;
  orderSelected = [];

  document.getElementById('quiz-result').classList.remove('show');
  document.getElementById('quiz-question-block').classList.remove('hidden');

  renderQuestion();
}

function renderQuestion() {
  const stop = currentStop;
  const q    = stop.quiz[quizIndex];
  const total = stop.quiz.length;

  // Progress
  const fill = document.getElementById('quiz-prog-fill');
  if (fill) fill.style.width = `${(quizIndex / total) * 100}%`;
  document.getElementById('quiz-progress').textContent  = `Question ${quizIndex + 1} / ${total}`;
  document.getElementById('quiz-score-inline').textContent = `${quizScorePts} pt${quizScorePts !== 1 ? 's' : ''}`;

  // Question text
  document.getElementById('quiz-q-text').textContent = q.q;

  // Points badge
  const ptsBadge = document.getElementById('quiz-pts-badge');
  if (ptsBadge) ptsBadge.textContent = `+${q.points} pts`;

  // Reset feedback
  const fb = document.getElementById('quiz-feedback');
  if (fb) { fb.classList.add('hidden'); fb.className = 'quiz-feedback hidden'; fb.textContent = ''; }

  // Hide all type blocks
  ['quiz-answers-grid', 'quiz-tf-grid', 'quiz-estimate-block', 'quiz-order-block'].forEach(id => {
    document.getElementById(id)?.classList.add('hidden');
  });

  quizAnswered = false;

  if (q.type === 'mcq')      renderMCQ(q);
  else if (q.type === 'tf')  renderTF(q);
  else if (q.type === 'estimate') renderEstimate(q);
  else if (q.type === 'order')    renderOrder(q);
}

/* ─── MCQ ─── */
function renderMCQ(q) {
  const grid = document.getElementById('quiz-answers-grid');
  grid.classList.remove('hidden');
  grid.innerHTML = '';
  q.answers.forEach((ans, i) => {
    const btn = document.createElement('button');
    btn.className   = 'answer-btn';
    btn.textContent = ans;
    btn.onclick     = () => selectMCQ(i, btn, q);
    grid.appendChild(btn);
  });
}

function selectMCQ(index, btn, q) {
  if (quizAnswered) return;
  quizAnswered = true;

  const allBtns = [...document.querySelectorAll('#quiz-answers-grid .answer-btn')];
  allBtns.forEach(b => b.disabled = true);

  const correct = (index === q.correct);
  if (correct) {
    quizScorePts += q.points;
    btn.classList.add('correct');
  } else {
    btn.classList.add('wrong');
    allBtns[q.correct].classList.add('correct');
  }
  updateScoreInline();
  showQuizFeedback(correct);
  scheduleNext();
}

/* ─── True / False ─── */
function renderTF(q) {
  document.getElementById('quiz-tf-grid').classList.remove('hidden');
  const vrai = document.getElementById('tf-vrai');
  const faux = document.getElementById('tf-faux');
  vrai.disabled = false; vrai.className = 'tf-btn tf-vrai';
  faux.disabled = false; faux.className = 'tf-btn tf-faux';
  window._tfQ = q;
}

function selectTF(value) {
  const q = window._tfQ;
  if (quizAnswered) return;
  quizAnswered = true;

  const vrai = document.getElementById('tf-vrai');
  const faux = document.getElementById('tf-faux');
  vrai.disabled = true; faux.disabled = true;

  const correct = (value === q.correct);
  if (correct) quizScorePts += q.points;

  if (value === true) {
    vrai.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) faux.classList.add('correct');
  } else {
    faux.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) vrai.classList.add('correct');
  }

  updateScoreInline();
  showQuizFeedback(correct);
  scheduleNext();
}

/* ─── Estimate (slider) ─── */
function renderEstimate(q) {
  const block = document.getElementById('quiz-estimate-block');
  block.classList.remove('hidden');

  const slider = document.getElementById('estimate-slider');
  slider.min      = q.min;
  slider.max      = q.max;
  slider.value    = Math.round((q.min + q.max) / 2);
  slider.disabled = false;

  document.getElementById('estimate-unit').textContent      = q.unit || '';
  document.getElementById('estimate-min-label').textContent = q.min.toLocaleString('fr-FR');
  document.getElementById('estimate-max-label').textContent = q.max.toLocaleString('fr-FR');
  document.getElementById('estimate-answer-reveal').classList.add('hidden');

  const validateBtn = document.getElementById('estimate-validate-btn');
  validateBtn.disabled = false;

  updateEstimateDisplay();
  slider.oninput = updateEstimateDisplay;

  window._estimateQ = q;
}

function updateEstimateDisplay() {
  const v = parseInt(document.getElementById('estimate-slider').value);
  document.getElementById('estimate-value').textContent = v.toLocaleString('fr-FR');
}

function validateEstimate() {
  const q = window._estimateQ;
  if (quizAnswered) return;
  quizAnswered = true;

  const slider   = document.getElementById('estimate-slider');
  const userVal  = parseInt(slider.value);
  const range    = q.max - q.min;
  const diff     = Math.abs(userVal - q.answer);
  const pct      = range > 0 ? diff / range : 0;

  let pts = 0;
  let msg = '';
  if (pct <= 0.05)      { pts = q.points;                          msg = '🎯 Incroyable, presque parfait !'; }
  else if (pct <= 0.15) { pts = Math.round(q.points * 0.7);        msg = '👌 Très proche !'; }
  else if (pct <= 0.30) { pts = Math.round(q.points * 0.4);        msg = '👍 Pas loin !'; }
  else                  { pts = Math.round(q.points * 0.15);
                          msg = `💡 Réponse : ${q.answer.toLocaleString('fr-FR')} ${q.unit || ''}`; }

  quizScorePts += pts;

  slider.disabled = true;
  document.getElementById('estimate-validate-btn').disabled = true;

  const reveal = document.getElementById('estimate-answer-reveal');
  reveal.textContent = `Réponse exacte : ${q.answer.toLocaleString('fr-FR')} ${q.unit || ''}`;
  reveal.classList.remove('hidden');

  updateScoreInline();
  showQuizFeedback(pts >= q.points * 0.6, msg);
  scheduleNext();
}

/* ─── Order (rank by tapping) ─── */
function renderOrder(q) {
  const block = document.getElementById('quiz-order-block');
  block.classList.remove('hidden');
  document.getElementById('order-result').classList.add('hidden');

  orderSelected = [];
  window._orderQ = q;

  // Shuffle items
  const shuffled = [...q.items].sort(() => Math.random() - 0.5);

  const container = document.getElementById('order-items');
  container.innerHTML = '';

  shuffled.forEach(item => {
    const btn = document.createElement('button');
    btn.className        = 'order-item-btn';
    btn.textContent      = item;
    btn.dataset.item     = item;
    btn.onclick          = () => tapOrderItem(item, btn);
    container.appendChild(btn);
  });
}

function tapOrderItem(item, btn) {
  const q = window._orderQ;
  if (quizAnswered) return;

  btn.classList.add('selected');
  btn.disabled = true;
  orderSelected.push(item);
  btn.textContent = `${orderSelected.length}. ${item}`;

  if (orderSelected.length === q.items.length) {
    quizAnswered = true;

    let correctCount = 0;
    orderSelected.forEach((it, i) => { if (it === q.correct[i]) correctCount++; });

    let pts = 0;
    const n = q.items.length;
    if (correctCount === n)          pts = q.points;
    else if (correctCount >= Math.ceil(n * 0.75)) pts = Math.round(q.points * 0.65);
    else if (correctCount >= Math.ceil(n * 0.5))  pts = Math.round(q.points * 0.35);
    else                             pts = Math.round(q.points * 0.1);
    quizScorePts += pts;

    // Show correct order
    const resultEl = document.getElementById('order-result');
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = '<div class="order-correct-label">Ordre correct</div>' +
      q.correct.map((c, i) => {
        const match = (orderSelected[i] === c);
        return `<div class="order-correct-item ${match ? 'match' : 'mismatch'}">${i+1}. ${c}</div>`;
      }).join('');

    updateScoreInline();
    const perfect = correctCount === n;
    showQuizFeedback(perfect, perfect
      ? '🏆 Ordre parfait !'
      : `${correctCount}/${n} positions correctes`);
    scheduleNext();
  }
}

/* ─── Shared quiz helpers ─── */
function updateScoreInline() {
  document.getElementById('quiz-score-inline').textContent =
    `${quizScorePts} pt${quizScorePts !== 1 ? 's' : ''}`;
}

function showQuizFeedback(correct, customMsg) {
  const fb = document.getElementById('quiz-feedback');
  if (!fb) return;
  fb.className  = `quiz-feedback ${correct ? 'correct-fb' : 'wrong-fb'}`;
  fb.textContent = customMsg || (correct ? '✓ Bonne réponse !' : '✗ Pas tout à fait…');
}

function scheduleNext() {
  setTimeout(() => {
    quizIndex++;
    if (quizIndex < currentStop.quiz.length) {
      renderQuestion();
    } else {
      endQuiz();
    }
  }, 1900);
}

/* ─── End of quiz ─── */
async function endQuiz() {
  quizDone[currentStop.id] = true;
  updateCapsuleBtn();

  // Fill progress to 100%
  const fill = document.getElementById('quiz-prog-fill');
  if (fill) fill.style.width = '100%';

  // Max possible score
  const maxPts = currentStop.quiz.reduce((s, q) => s + q.points, 0);
  const pct    = quizScorePts / maxPts;

  document.getElementById('quiz-question-block').classList.add('hidden');
  const resultEl = document.getElementById('quiz-result');
  resultEl.classList.add('show');

  document.getElementById('quiz-score-final').textContent =
    `${quizScorePts} pts`;
  document.getElementById('quiz-score-emoji').textContent =
    pct >= 0.88 ? '🏆' : pct >= 0.6 ? '👏' : '💪';

  // POST score to server + connect SSE
  await submitScore();
  startSSE(currentStop.id);
}

async function submitScore() {
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monument: currentStop.id,
        team:     teamName,
        email:    playerEmail,
        members:  teamMembers,
        score:    quizScorePts
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ranking) buildRankingTable(data.ranking);
    }
  } catch (e) {
    // Server not running — show only this team locally
    buildRankingTable([{ team: teamName, score: quizScorePts }]);
  }
}

/* SSE — live leaderboard updates */
function startSSE(monumentId) {
  if (sseSource) { sseSource.close(); sseSource = null; }
  try {
    sseSource = new EventSource(`/api/scores/stream?monument=${monumentId}`);
    sseSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const ranking = Array.isArray(payload) ? payload : (payload.ranking || []);
        if (ranking.length > 0) buildRankingTable(ranking);
      } catch (_) {}
    };
    sseSource.onerror = () => { sseSource.close(); sseSource = null; };
  } catch (_) {}
}

function buildRankingTable(ranking) {
  const tbody  = document.getElementById('ranking-body');
  tbody.innerHTML = '';
  const medals = ['🥇', '🥈', '🥉'];

  ranking.slice(0, 8).forEach((entry, i) => {
    const name  = entry.team || entry.name || '?';
    const score = entry.score ?? 0;
    const isMe  = name.toLowerCase() === (teamName || '').toLowerCase();

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank-pos">${medals[i] || (i + 1)}</td>
      <td>${name}</td>
      <td><strong>${score}</strong></td>`;
    if (isMe) tr.classList.add('me');
    tbody.appendChild(tr);
  });
}


/* ── WWF tab ────────────────────────────────────────────────────────── */
function buildWWFTab() {
  const stop = currentStop;
  if (!stop) return;
  document.getElementById('wwf-action-text').textContent = stop.wwfAction;
  document.getElementById('wwf-species-tag').textContent = stop.species;
}


/* ════════════════════════════════════════════════════════════════════
   CAPSULE TEMPORELLE
════════════════════════════════════════════════════════════════════ */
function showCapsule() {
  capsuleYears = 5;
  document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.dur-btn[data-years="5"]')?.classList.add('active');
  updateCapsulePreview();
  showScreen('screen-capsule');
}

function selectDuration(years, btn) {
  capsuleYears = years;
  document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateCapsulePreview();
}

function updateCapsulePreview() {
  const year = new Date().getFullYear() + capsuleYears;
  document.getElementById('capsule-year-display').textContent    = year;
  document.getElementById('capsule-duration-text').textContent   =
    `Dans ${capsuleYears} an${capsuleYears > 1 ? 's' : ''}`;
}

function sealCapsule() {
  const msg = document.getElementById('capsule-message').value.trim();
  if (!msg) { document.getElementById('capsule-message').focus(); return; }

  const capsules = JSON.parse(localStorage.getItem('pv_capsules') || '[]');
  capsules.push({
    stop:      currentStop.id,
    monument:  currentStop.monument,
    species:   currentStop.species,
    name:      playerName,
    message:   msg,
    years:     capsuleYears,
    openYear:  new Date().getFullYear() + capsuleYears,
    date:      Date.now()
  });
  localStorage.setItem('pv_capsules', JSON.stringify(capsules));

  const openYear = new Date().getFullYear() + capsuleYears;
  document.getElementById('sealed-year').textContent    = openYear;
  document.getElementById('sealed-species').textContent = currentStop.species;
  document.getElementById('sealed-emoji').textContent   = currentStop.emoji;
  showScreen('screen-sealed');
}

function continueToCapsuleEnd() { showSalomon(); }


/* ── Salomon ────────────────────────────────────────────────────────── */
function showSalomon() { showScreen('screen-salomon'); }

function goBackFromSalomon() {
  if (currentStop) showScreen('screen-stop');
  else showHome();
}


/* ── Contest ────────────────────────────────────────────────────────── */
function showContest() {
  document.getElementById('contest-name-display').textContent = playerName || 'toi';
  showScreen('screen-contest');
}

function submitContest() {
  const email   = document.getElementById('contest-email').value.trim();
  const consent = document.getElementById('contest-consent').checked;
  if (!email || !consent) {
    if (!email) document.getElementById('contest-email').focus();
    return;
  }
  const entries = JSON.parse(localStorage.getItem('pv_contest') || '[]');
  entries.push({ name: playerName, email, stop: currentStop?.id, date: Date.now() });
  localStorage.setItem('pv_contest', JSON.stringify(entries));
  showFinal();
}


/* ── Final screen ───────────────────────────────────────────────────── */
function showFinal() {
  document.getElementById('final-name').textContent    = playerName;
  document.getElementById('final-species').textContent = currentStop?.species || '';
  document.getElementById('final-emoji').textContent   = currentStop?.emoji   || '';
  document.getElementById('final-score').textContent   = `${quizScorePts} pts`;
  showScreen('screen-final');
}

function shareResult() {
  const text = `Mon équipe "${teamName}" vient de découvrir ${currentStop?.species} avec Panda'venture × WWF ! Score : ${quizScorePts} pts — toi aussi découvre Paris autrement !`;
  if (navigator.share) {
    navigator.share({ title: "Panda'venture", text, url: window.location.href }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text);
    alert('Résultat copié ! Partage-le autour de toi 🐾');
  }
}

function goToMap() { window.location.href = window.location.pathname; }
