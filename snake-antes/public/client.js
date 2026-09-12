const BOARD_SIZE = 30;
const CELL = 20;
const COLORS = ['#4ade80', '#60a5fa', '#f472b6', '#facc15'];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const scoreboardEl = document.getElementById('scoreboard');
const restartBtn = document.getElementById('restart-btn');

const AUTOMATA = true;
let last_dir = 'up'

let ws = null;
let myId = null;

document.getElementById('join-btn').addEventListener('click', () => {
  const name = document.getElementById('name-input').value || 'jugador';
  const room = document.getElementById('room-input').value || 'sala1';

  ws = new WebSocket(`ws://${location.host}`);
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'join', name, room }));
    statusEl.textContent = 'Esperando otros jugadores...';
  });
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'error') {
      statusEl.textContent = msg.message;
    } else if (msg.type === 'countdown') {
      statusEl.textContent = 'Empieza en ' + msg.value + '...';
    } else if (msg.type === 'state') {
      render(msg);
    }
  });
});

document.getElementById('espectar').addEventListener('click', () => {
  const room = document.getElementById('room-input').value || 'sala1';

  ws = new WebSocket(`ws://${location.host}`);
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'spectate', room }));
    statusEl.textContent = 'Espectando la sala...';
  });
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'error') {
      statusEl.textContent = msg.message;
    } else if (msg.type === 'state') {
      render(msg);
    }
  });
});

restartBtn.addEventListener('click', () => {
  if (ws) ws.send(JSON.stringify({ type: 'restart' }));
  restartBtn.style.display = 'none';
});

window.addEventListener('keypress', (e) => {
  if (!ws) return;
  const map = {
    ArrowUp: 'up', w: 'up',
    ArrowDown: 'down', s: 'down',
    ArrowLeft: 'left', a: 'left',
    ArrowRight: 'right', d: 'right',
  };
  const dir = map[e.key];
  if (dir) ws.send(JSON.stringify({ type: 'move', dir }));
});

function render(state) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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
async function startAutomata() {
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 200));
    if (!ws) continue;
    let dir = null;
    if (last_dir === 'up') dir = 'right';
    else if (last_dir === 'right') dir = 'down';
    else if (last_dir === 'down') dir = 'left';
    else if (last_dir === 'left') dir = 'up';
    last_dir = dir
    ws.send(JSON.stringify({ type: 'move', dir }));

  }
}


if (AUTOMATA) {
  startAutomata();
}