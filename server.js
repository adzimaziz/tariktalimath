// Pelayan Tarik Tali Matematik: fail statik + WebSocket untuk mod online.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const TT = require('./public/shared.js');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Tidak dijumpai'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

function code() {
  let c;
  do { c = String(Math.floor(1000 + Math.random() * 9000)); } while (rooms.has(c));
  return c;
}
function send(ws, msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function broadcast(room, msg) { room.players.forEach(p => p && send(p.ws, msg)); }

function lobby(room) {
  broadcast(room, {
    t: 'lobby', code: room.code, level: room.level,
    names: room.players.map(p => (p ? p.name : null)),
    ready: room.players.map(p => (p ? p.ready : false)),
  });
}

function startGame(room) {
  clearTimers(room);
  room.phase = 'countdown';
  room.pos = 0;
  room.scores = [0, 0];
  room.lockUntil = [0, 0];
  broadcast(room, { t: 'countdown' });
  room.timers.push(setTimeout(() => {
    room.phase = 'play';
    room.endsAt = Date.now() + TT.GAME_SECONDS * 1000;
    room.q = [TT.makeQuestion(room.level), TT.makeQuestion(room.level)];
    room.players.forEach((p, i) => send(p.ws, { t: 'start', endsIn: TT.GAME_SECONDS * 1000, q: room.q[i].text }));
    broadcastState(room);
    room.timers.push(setTimeout(() => endGame(room), TT.GAME_SECONDS * 1000));
  }, 4000));
}

function broadcastState(room) { broadcast(room, { t: 'state', pos: room.pos, scores: room.scores }); }

function endGame(room) {
  if (room.phase !== 'play') return;
  clearTimers(room);
  room.phase = 'over';
  room.players.forEach(p => p && (p.ready = false));
  broadcast(room, { t: 'over', winner: TT.winnerFromPos(room.pos), pos: room.pos, scores: room.scores });
}

function clearTimers(room) { (room.timers || []).forEach(clearTimeout); room.timers = []; }

function handleAnswer(room, side, value) {
  if (room.phase !== 'play') return;
  const now = Date.now();
  if (now < room.lockUntil[side]) return;
  const ok = Number(value) === room.q[side].answer;
  if (ok) {
    room.scores[side]++;
    room.pos += side === 0 ? -1 : 1;
    room.q[side] = TT.makeQuestion(room.level);
    send(room.players[side].ws, { t: 'result', ok: true, q: room.q[side].text });
    broadcastState(room);
    if (Math.abs(room.pos) >= TT.WIN_STEPS) endGame(room);
  } else {
    room.lockUntil[side] = now + TT.WRONG_LOCK_MS;
    send(room.players[side].ws, { t: 'result', ok: false, lock: TT.WRONG_LOCK_MS });
  }
}

wss.on('connection', ws => {
  let room = null, side = -1;

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const name = String(m.name || '').slice(0, 14) || null;

    if (m.t === 'create') {
      room = { code: code(), players: [null, null], level: TT.LEVELS[m.level] ? m.level : 'darab', phase: 'lobby', timers: [] };
      rooms.set(room.code, room);
      side = 0;
      room.players[0] = { ws, name: name || 'Pemain 1', ready: false };
      send(ws, { t: 'joined', side, code: room.code });
      lobby(room);
    } else if (m.t === 'join') {
      const r = rooms.get(String(m.code || '').trim());
      if (!r) return send(ws, { t: 'error', msg: 'Bilik tidak dijumpai.' });
      const free = r.players.findIndex(p => !p);
      if (free < 0) return send(ws, { t: 'error', msg: 'Bilik sudah penuh.' });
      room = r; side = free;
      room.players[side] = { ws, name: name || `Pemain ${side + 1}`, ready: false };
      send(ws, { t: 'joined', side, code: room.code });
      lobby(room);
    } else if (!room) {
      return;
    } else if (m.t === 'ready') {
      if (room.phase === 'play' || room.phase === 'countdown') return;
      room.players[side].ready = true;
      room.phase = 'lobby';
      lobby(room);
      if (room.players.every(p => p && p.ready)) startGame(room);
    } else if (m.t === 'level' && side === 0 && TT.LEVELS[m.level] && room.phase !== 'play') {
      room.level = m.level;
      lobby(room);
    } else if (m.t === 'answer') {
      handleAnswer(room, side, m.value);
    }
  });

  ws.on('close', () => {
    if (!room) return;
    room.players[side] = null;
    clearTimers(room);
    if (room.players.every(p => !p)) { rooms.delete(room.code); return; }
    room.phase = 'lobby';
    room.players.forEach(p => p && (p.ready = false));
    broadcast(room, { t: 'left' });
    lobby(room);
  });
});

server.listen(PORT, () => console.log(`Tarik Tali Matematik di http://localhost:${PORT}`));
