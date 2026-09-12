const BOARD_SIZE = 30;
const CELL = 20;
const COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#facc15'];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreboardEl = document.getElementById('scoreboard');
const restartBtn = document.getElementById('restart-btn');
const startBtn = document.getElementById('start-btn');
const roomsListEl = document.getElementById('rooms-list');
const roomInput = document.getElementById('room-input');

let myId = null;
let joined = false;

const STATE_LABELS = {
  waiting: 'esperando jugadores',
  countdown: 'iniciando',
  playing: 'en juego',
  gameover: 'partida terminada',
};

const ws = new WebSocket(`ws://${location.host}`);

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'rooms') {
    renderRooms(msg.rooms);
  } else if (msg.type === 'error') {
    statusEl.textContent = msg.message;
  } else if (msg.type === 'countdown') {
    startBtn.style.display = 'none';
    statusEl.textContent = 'Empieza en ' + msg.value + '...';
  } else if (msg.type === 'state') {
    render(msg);
  }
});

function renderRooms(rooms) {
  if (!rooms.length) {
    roomsListEl.innerHTML = '<li class="room-empty">No hay salas activas. Crea una escribiendo un codigo.</li>';
    return;
  }
  roomsListEl.innerHTML = '';
  rooms.forEach((room) => {
    const li = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${room.code} — ${room.players}/${room.maxPlayers} jugadores (${STATE_LABELS[room.state] || room.state})`;
    const joinRoomBtn = document.createElement('button');
    joinRoomBtn.textContent = 'Unirse';
    joinRoomBtn.disabled = room.players >= room.maxPlayers || joined;
    joinRoomBtn.addEventListener('click', () => {
      roomInput.value = room.code;
      doJoin();
    });
    li.appendChild(label);
    li.appendChild(joinRoomBtn);
    roomsListEl.appendChild(li);
  });
}

function doJoin() {
  if (joined) return;
  const name = document.getElementById('name-input').value || 'jugador';
  const room = roomInput.value || 'sala1';

  const send = () => {
    joined = true;
    ws.send(JSON.stringify({ type: 'join', name, room }));
    statusEl.textContent = 'Esperando otros jugadores... (o pulsa Empezar para jugar solo)';
    startBtn.style.display = 'inline-block';
  };

  if (ws.readyState === WebSocket.OPEN) {
    send();
  } else {
    ws.addEventListener('open', send, { once: true });
  }
}

document.getElementById('join-btn').addEventListener('click', doJoin);

startBtn.addEventListener('click', () => {
  ws.send(JSON.stringify({ type: 'start' }));
  startBtn.style.display = 'none';
});

restartBtn.addEventListener('click', () => {
  ws.send(JSON.stringify({ type: 'restart' }));
  restartBtn.style.display = 'none';
  startBtn.style.display = 'none';
});

function sendMove(dir) {
  if (joined) ws.send(JSON.stringify({ type: 'move', dir }));
}

window.addEventListener('keydown', (e) => {
  const map = {
    ArrowUp: 'up', w: 'up',
    ArrowDown: 'down', s: 'down',
    ArrowLeft: 'left', a: 'left',
    ArrowRight: 'right', d: 'right',
  };
  const dir = map[e.key];
  if (dir) sendMove(dir);
});

const dpadButtons = {
  up: document.getElementById('btn-up'),
  down: document.getElementById('btn-down'),
  left: document.getElementById('btn-left'),
  right: document.getElementById('btn-right'),
};
Object.entries(dpadButtons).forEach(([dir, btn]) => {
  if (!btn) return;
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    sendMove(dir);
  }, { passive: false });
  btn.addEventListener('click', () => sendMove(dir));
});

let touchStartX = 0;
let touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });
canvas.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    sendMove(dx > 0 ? 'right' : 'left');
  } else {
    sendMove(dy > 0 ? 'down' : 'up');
  }
}, { passive: true });

function render(state) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#78716c';
  (state.obstacles || []).forEach((o) => {
    ctx.fillRect(o.x * CELL, o.y * CELL, CELL - 1, CELL - 1);
  });

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(state.food.x * CELL, state.food.y * CELL, CELL, CELL);

  if (state.powerup) {
    ctx.fillStyle = state.powerup.kind === 'speed' ? '#38bdf8' : '#a3e635';
    ctx.fillRect(state.powerup.x * CELL, state.powerup.y * CELL, CELL, CELL);
  }

  state.players.forEach((p, index) => {
    ctx.fillStyle = p.alive ? COLORS[index % COLORS.length] : '#555';
    p.body.forEach((seg) => {
      ctx.fillRect(seg.x * CELL, seg.y * CELL, CELL - 1, CELL - 1);
    });
  });

  scoreboardEl.innerHTML = state.players
    .map((p, index) => `<div style="color:${COLORS[index % COLORS.length]}">${p.name}: ${p.score}${p.alive ? '' : ' (eliminado)'}</div>`)
    .join('');

  if (state.state === 'gameover') {
    statusEl.textContent = 'Partida terminada';
    restartBtn.style.display = 'inline-block';
  } else if (state.state === 'playing') {
    statusEl.textContent = 'Jugando';
  }
}
