const BOARD_SIZE = 30;
const CELL = 20;
const COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#facc15'];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreboardEl = document.getElementById('scoreboard');
const restartBtn = document.getElementById('restart-btn');
const startBtn = document.getElementById('start-btn');

let ws = null;

document.getElementById('join-btn').addEventListener('click', () => {
  const name = document.getElementById('name-input').value || 'jugador';
  const room = document.getElementById('room-input').value || 'sala1';

  ws = new WebSocket(`ws://${location.host}`);
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'join', name, room }));
    statusEl.textContent = 'Esperando otros jugadores... (o pulsa Empezar para jugar solo)';
    startBtn.style.display = 'inline-block';
  });
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'error') {
      statusEl.textContent = msg.message;
    } else if (msg.type === 'countdown') {
      startBtn.style.display = 'none';
      statusEl.textContent = 'Empieza en ' + msg.value + '...';
    } else if (msg.type === 'state') {
      render(msg);
    }
  });
});

startBtn.addEventListener('click', () => {
  if (ws) ws.send(JSON.stringify({ type: 'start' }));
  startBtn.style.display = 'none';
});

restartBtn.addEventListener('click', () => {
  if (ws) ws.send(JSON.stringify({ type: 'restart' }));
  restartBtn.style.display = 'none';
  startBtn.style.display = 'none';
});

function sendMove(dir) {
  if (ws) ws.send(JSON.stringify({ type: 'move', dir }));
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

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(state.food.x * CELL, state.food.y * CELL, CELL, CELL);

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
