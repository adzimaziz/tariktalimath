/* global TT */
(() => {
  const $ = id => document.getElementById(id);
  const screens = ['menu', 'lobby', 'game'];
  function show(id) { screens.forEach(s => $(s).classList.toggle('active', s === id)); }

  // ---------- Bunyi ringkas (WebAudio) ----------
  let actx = null;
  function beep(freq, dur = 0.1, type = 'sine', vol = 0.15) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      o.connect(g).connect(actx.destination);
      o.start(); o.stop(actx.currentTime + dur);
    } catch (e) { /* tiada audio */ }
  }
  const sfx = {
    key: () => beep(600, 0.04, 'square', 0.05),
    ok: () => { beep(660, 0.08); setTimeout(() => beep(990, 0.12), 70); },
    bad: () => beep(140, 0.25, 'sawtooth', 0.12),
    tick: () => beep(440, 0.12, 'triangle'),
    go: () => beep(880, 0.35, 'triangle'),
    win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.18, 'triangle'), i * 130)),
  };

  // ---------- Watak (SVG asli) ----------
  function charSVG(shirt, shirtDark, hair) {
    return `<svg viewBox="0 0 60 86" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <rect x="16" y="70" width="10" height="14" fill="#2d3550"/><rect x="32" y="70" width="10" height="14" fill="#2d3550"/>
      <rect x="14" y="82" width="13" height="4" fill="#111"/><rect x="31" y="82" width="13" height="4" fill="#111"/>
      <rect x="14" y="40" width="30" height="32" rx="2" fill="${shirt}"/>
      <rect x="14" y="64" width="30" height="8" fill="${shirtDark}"/>
      <rect x="38" y="44" width="20" height="8" fill="${shirt}"/>
      <rect x="54" y="43" width="6" height="10" fill="#f2c39b"/>
      <rect x="12" y="8" width="34" height="32" rx="3" fill="#f2c39b"/>
      <rect x="10" y="4" width="38" height="10" fill="${hair}"/><rect x="10" y="4" width="8" height="22" fill="${hair}"/>
      <rect x="30" y="20" width="5" height="6" fill="#1d2b45"/><rect x="40" y="20" width="5" height="6" fill="#1d2b45"/>
      <rect x="34" y="31" width="10" height="3" fill="#b5523b"/>
      <rect x="20" y="26" width="5" height="3" fill="#f0a08a"/>
    </svg>`;
  }
  $('c0').innerHTML = charSVG('#e2463f', '#b52f29', '#3b2416');
  $('c1').innerHTML = charSVG('#2f6fe0', '#2153b0', '#1b1b1b');

  // ---------- Pilihan jenis soalan ----------
  for (const sel of [$('level'), $('lobbyLevel')]) {
    for (const [k, v] of Object.entries(TT.LEVELS)) sel.add(new Option(v, k));
    sel.value = 'darab';
  }

  // ---------- Keadaan ----------
  let mode = null;           // 'local' | 'online'
  let mySides = [];          // sisi yang dikawal peranti ini
  let names = ['Pemain 1', 'Pemain 2'];
  let conn = null;           // { send(msg), close() }
  let input = ['', ''];
  let playing = false;
  let endsAt = 0, timerId = null;

  // ---------- Panel papan kekunci ----------
  function buildPanels() {
    for (const s of [0, 1]) {
      const panel = $('panel' + s);
      panel.className = `panel p${s + 1}`;
      panel.innerHTML = '';
      if (!mySides.includes(s)) {
        panel.classList.add('waiting');
        panel.innerHTML = `<div class="pname">${esc(names[s])}</div><div class="big" id="oppScore${s}">0</div><div>jawapan betul</div>`;
        continue;
      }
      panel.appendChild($('panelTpl').content.cloneNode(true));
      panel.querySelector('.pname').textContent = names[s];
      panel.querySelectorAll('.keypad button').forEach(b => {
        // pointerdown → sentuhan serentak dua pemain berfungsi di smartboard
        b.addEventListener('pointerdown', e => {
          e.preventDefault();
          b.classList.add('pressed');
          setTimeout(() => b.classList.remove('pressed'), 90);
          press(s, b.dataset.k);
        });
      });
    }
    $('game').querySelector('.board').classList.toggle('online', mode === 'online');
    $('game').querySelector('.board').classList.toggle('local', mode === 'local');
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }

  function panelEl(s, sel) { return $('panel' + s).querySelector(sel); }
  function setQuestion(s, text) { const q = panelEl(s, '.question'); if (q) q.textContent = text; }
  function setDisplay(s) { const d = panelEl(s, '.display'); if (d) d.textContent = input[s]; }

  function press(s, k) {
    if (!playing || $('panel' + s).classList.contains('locked')) return;
    if (k === 'C') { input[s] = ''; sfx.key(); }
    else if (k === 'OK') {
      if (input[s] === '') return;
      conn.send({ t: 'answer', side: s, value: Number(input[s]) });
    } else if (input[s].length < 4) { input[s] += k; sfx.key(); }
    setDisplay(s);
  }

  // Papan kekunci fizikal: mod online → sisi sendiri; mod satu skrin → Pemain 2 (Pemain 1 guna skrin)
  document.addEventListener('keydown', e => {
    if (!playing || !$('game').classList.contains('active')) return;
    const s = mode === 'online' ? mySides[0] : 1;
    if (/^[0-9]$/.test(e.key)) press(s, e.key);
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Escape') press(s, 'C');
    else if (e.key === 'Enter') press(s, 'OK');
  });

  // ---------- Paparan permainan ----------
  function setPos(pos) {
    const zone = document.querySelector('.field-zone').clientWidth;
    const step = (zone * 0.3) / TT.WIN_STEPS;
    $('tug').style.transform = `translateX(calc(-50% + ${pos * step}px))`;
  }
  function pullAnim(s) {
    const c = $('c' + s);
    c.classList.add('pull');
    setTimeout(() => c.classList.remove('pull'), 300);
  }
  let lastPos = 0;
  function applyState(m) {
    if (m.pos !== lastPos) pullAnim(m.pos < lastPos ? 0 : 1);
    lastPos = m.pos;
    setPos(m.pos);
    [0, 1].forEach(s => {
      $('s' + s).textContent = m.scores[s];
      const o = $('oppScore' + s); if (o) o.textContent = m.scores[s];
    });
  }
  function startTimer(ms) {
    endsAt = Date.now() + ms;
    clearInterval(timerId);
    const tick = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      $('timer').textContent = left;
      $('timer').classList.toggle('low', left <= 10);
      if (left === 0) clearInterval(timerId);
    };
    tick();
    timerId = setInterval(tick, 250);
  }

  let cdTimers = [];
  function countdown() {
    cdTimers.forEach(clearTimeout);
    $('result').classList.remove('show');
    show('game');
    input = ['', '']; [0, 1].forEach(setDisplay);
    [0, 1].forEach(s => setQuestion(s, '…'));
    applyState({ pos: 0, scores: [0, 0] });
    $('timer').textContent = TT.GAME_SECONDS;
    $('timer').classList.remove('low');
    $('countdown').classList.add('show');
    ['3', '2', '1', 'Mula!'].forEach((t, i) => cdTimers.push(setTimeout(() => {
      const el = $('cdText');
      el.textContent = t;
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      i < 3 ? sfx.tick() : sfx.go();
    }, i * 1000)));
    cdTimers.push(setTimeout(() => $('countdown').classList.remove('show'), 4000));
  }

  function onMessage(m) {
    switch (m.t) {
      case 'countdown': countdown(); break;
      case 'start':
        playing = true;
        $('countdown').classList.remove('show');
        if (m.qs) m.qs.forEach((q, s) => setQuestion(s, q)); else setQuestion(mySides[0], m.q);
        startTimer(m.endsIn);
        break;
      case 'state': applyState(m); break;
      case 'result': {
        const s = m.side ?? mySides[0];
        const panel = $('panel' + s);
        input[s] = '';
        if (m.ok) {
          sfx.ok();
          setQuestion(s, m.q);
          panel.classList.add('ok');
          setTimeout(() => { panel.classList.remove('ok'); setDisplay(s); }, 150);
        } else {
          sfx.bad();
          panel.classList.add('bad', 'locked');
          setTimeout(() => { panel.classList.remove('bad', 'locked'); setDisplay(s); }, m.lock);
        }
        break;
      }
      case 'over': {
        playing = false;
        clearInterval(timerId);
        applyState(m);
        const w = m.winner;
        $('resTitle').textContent = w < 0 ? 'Seri!' : `${names[w]} Menang!`;
        $('resTitle').style.color = w === 0 ? 'var(--p1)' : w === 1 ? 'var(--p2)' : 'var(--ink)';
        $('resScore').textContent = `${names[0]} ${m.scores[0]} – ${m.scores[1]} ${names[1]}`;
        $('btnAgain').disabled = false;
        $('btnAgain').textContent = 'Main Lagi';
        setTimeout(() => { $('result').classList.add('show'); sfx.win(); }, 400);
        break;
      }
      // --- mesej khas online ---
      case 'joined':
        mySides = [m.side];
        $('lobbyMsg').textContent = '';
        show('lobby');
        break;
      case 'lobby':
        names = m.names.map((n, i) => n || `Pemain ${i + 1}`);
        $('lobbyCode').textContent = m.code;
        $('lp1').textContent = m.names[0] || 'Menunggu…';
        $('lp2').textContent = m.names[1] || 'Menunggu…';
        $('lr1').textContent = m.ready[0] ? '✔ Sedia' : '';
        $('lr2').textContent = m.ready[1] ? '✔ Sedia' : '';
        $('lobbyLevel').value = m.level;
        $('lobbyLevel').disabled = mySides[0] !== 0;
        $('btnReady').disabled = !!m.ready[mySides[0]];
        $('btnReady').textContent = m.ready[mySides[0]] ? 'Menunggu lawan…' : 'Sedia!';
        $('gn0').textContent = names[0]; $('gn1').textContent = names[1];
        if (!$('game').classList.contains('active') || !playing) buildPanels();
        break;
      case 'left':
        playing = false;
        clearInterval(timerId);
        cdTimers.forEach(clearTimeout);
        $('countdown').classList.remove('show');
        $('result').classList.remove('show');
        show('lobby');
        $('lobbyMsg').textContent = 'Lawan telah keluar. Menunggu pemain baharu…';
        break;
      case 'error':
        $('menuErr').textContent = m.msg;
        break;
    }
  }

  // ---------- Enjin mod satu skrin (meniru pelayan) ----------
  function localEngine(level) {
    let pos = 0, scores = [0, 0], q = [], lockUntil = [0, 0], phase = 'idle', timers = [];
    const emit = m => setTimeout(() => onMessage(m), 0);
    function clear() { timers.forEach(clearTimeout); timers = []; }
    function end() {
      if (phase !== 'play') return;
      clear(); phase = 'over';
      emit({ t: 'over', winner: TT.winnerFromPos(pos), pos, scores: [...scores] });
    }
    function start() {
      clear();
      pos = 0; scores = [0, 0]; lockUntil = [0, 0]; phase = 'countdown';
      emit({ t: 'countdown' });
      timers.push(setTimeout(() => {
        phase = 'play';
        q = [TT.makeQuestion(level), TT.makeQuestion(level)];
        emit({ t: 'start', endsIn: TT.GAME_SECONDS * 1000, qs: q.map(x => x.text) });
        timers.push(setTimeout(end, TT.GAME_SECONDS * 1000));
      }, 4000));
    }
    return {
      send(m) {
        if (m.t === 'ready') start();
        if (m.t !== 'answer' || phase !== 'play') return;
        const s = m.side, now = Date.now();
        if (now < lockUntil[s]) return;
        if (m.value === q[s].answer) {
          scores[s]++; pos += s === 0 ? -1 : 1;
          q[s] = TT.makeQuestion(level);
          emit({ t: 'result', side: s, ok: true, q: q[s].text });
          emit({ t: 'state', pos, scores: [...scores] });
          if (Math.abs(pos) >= TT.WIN_STEPS) end();
        } else {
          lockUntil[s] = now + TT.WRONG_LOCK_MS;
          emit({ t: 'result', side: s, ok: false, lock: TT.WRONG_LOCK_MS });
        }
      },
      close() { clear(); phase = 'idle'; },
    };
  }

  // ---------- Sambungan online ----------
  function onlineConn(first) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    let ws;
    try { ws = new WebSocket(`${proto}://${location.host}`); } catch (e) { ws = null; }
    if (!ws || location.protocol === 'file:') {
      $('menuErr').textContent = 'Mod online perlukan pelayan (jalankan: npm start).';
      return null;
    }
    let closedByUs = false;
    ws.onopen = () => ws.send(JSON.stringify(first));
    ws.onmessage = e => onMessage(JSON.parse(e.data));
    ws.onerror = () => { $('menuErr').textContent = 'Tidak dapat sambung ke pelayan.'; };
    ws.onclose = () => {
      if (closedByUs) return;
      playing = false;
      $('result').classList.remove('show');
      $('countdown').classList.remove('show');
      show('menu');
      $('menuErr').textContent = 'Sambungan terputus.';
    };
    return {
      send(m) { if (ws.readyState === 1) ws.send(JSON.stringify(m)); },
      close() { closedByUs = true; ws.close(); },
    };
  }

  function toMenu() {
    if (conn) conn.close();
    conn = null; playing = false; mode = null;
    clearInterval(timerId); cdTimers.forEach(clearTimeout);
    $('result').classList.remove('show'); $('countdown').classList.remove('show');
    show('menu');
  }

  // ---------- Butang ----------
  $('btnLocal').onclick = () => {
    $('menuErr').textContent = '';
    mode = 'local'; mySides = [0, 1];
    names = [$('n1').value.trim() || 'Pemain 1', $('n2').value.trim() || 'Pemain 2'];
    $('gn0').textContent = names[0]; $('gn1').textContent = names[1];
    conn = localEngine($('level').value);
    buildPanels();
    conn.send({ t: 'ready' });
  };
  if ($('btnCreate')) { // tiada dalam versi HTML offline
    $('btnCreate').onclick = () => {
      $('menuErr').textContent = '';
      mode = 'online';
      conn = onlineConn({ t: 'create', name: $('nOnline').value.trim(), level: $('level').value });
    };
    $('btnJoin').onclick = () => {
      $('menuErr').textContent = '';
      const code = $('roomCode').value.trim();
      if (!/^\d{4}$/.test(code)) { $('menuErr').textContent = 'Masukkan kod 4 digit.'; return; }
      mode = 'online';
      conn = onlineConn({ t: 'join', code, name: $('nOnline').value.trim() });
    };
    $('roomCode').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnJoin').click(); });
  }
  $('btnReady').onclick = () => conn && conn.send({ t: 'ready' });
  $('lobbyLevel').onchange = () => conn && conn.send({ t: 'level', level: $('lobbyLevel').value });
  $('btnLeave').onclick = toMenu;
  $('btnQuit').onclick = () => { if (confirm('Keluar dari permainan?')) toMenu(); };
  $('btnMenu').onclick = toMenu;
  $('btnAgain').onclick = () => {
    if (mode === 'local') conn.send({ t: 'ready' });
    else {
      conn.send({ t: 'ready' });
      $('result').classList.remove('show');
      show('lobby');
    }
  };

  // Kod bilik dalam URL: ?bilik=1234
  const urlCode = new URLSearchParams(location.search).get('bilik');
  if (urlCode && $('roomCode')) $('roomCode').value = urlCode;

  window.addEventListener('resize', () => setPos(lastPos));
})();
