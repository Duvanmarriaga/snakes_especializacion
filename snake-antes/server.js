// server.js - Snake multijugador (version "ANTES": sin arquitectura, un solo archivo)
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3001;

let rooms = {};
let nextPlayerId = 1;

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'public', filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    if (filePath.endsWith('.html')) res.writeHead(200, { 'Content-Type': 'text/html' });
    else if (filePath.endsWith('.js')) res.writeHead(200, { 'Content-Type': 'application/javascript' });
    else if (filePath.endsWith('.css')) res.writeHead(200, { 'Content-Type': 'text/css' });
    else res.writeHead(200);
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }

    if (msg.type === 'join') {
      let code = msg.room || 'default';
      if (!rooms[code]) {
        rooms[code] = {
          code: code,
          players: [],
          food: { x: 5, y: 5 },
          powerup: null,
          state: 'waiting',
          countdown: 3,
          interval: null,
        };
      }
      let room = rooms[code];
      if (room.players.length >= 4) {
        ws.send(JSON.stringify({ type: 'error', message: 'sala llena' }));
        return;
      }
      let startX = 3 + room.players.length * 5;
      let startY = 3 + room.players.length * 5;
      let player = {
        id: nextPlayerId++,
        ws: ws,
        name: msg.name || 'jugador' + nextPlayerId,
        room: code,
        body: [
          { x: startX, y: startY },
          { x: startX - 1, y: startY },
          { x: startX - 2, y: startY },
        ],
        dir: 'right',
        pendingDir: 'right',
        alive: true,
        score: 0,
      };
      ws.playerId = player.id;
      ws.room = code;
      room.players.push(player);

      if (room.players.length >= 2 && room.state === 'waiting') {
        room.state = 'countdown';
        room.countdown = 3;
        let countdownTimer = setInterval(() => {
          room.countdown--;
          for (let i = 0; i < room.players.length; i++) {
            room.players[i].ws.send(JSON.stringify({ type: 'countdown', value: room.countdown }));
          }
          if (room.countdown <= 0) {
            clearInterval(countdownTimer);
            room.state = 'playing';
            startGameLoop(code);
          }
        }, 1000);
      }
      return;
    }

    if (msg.type === 'spectate') {
      let code = msg.room || 'default';
      if (!rooms[code]) {
        ws.send(JSON.stringify({ type: 'error', message: 'sala no existe' }));
        return;
      }
      ws.room = code;
      let room = rooms[code];
      let state = {
        type: 'state',
        state: room.state,
        food: room.food,
        powerup: room.powerup,
        players: room.players.map(function (p) {
          return { id: p.id, name: p.name, body: p.body, alive: p.alive, score: p.score };
        }),
      };
      ws.send(JSON.stringify(state));
      return;
    }

    if (msg.type === 'move') {
      let code = ws.room;
      let room = rooms[code];
      if (!room) return;
      for (let i = 0; i < room.players.length; i++) {
        if (room.players[i].id === ws.playerId) {
          let p = room.players[i];
          if (msg.dir === 'up' && p.dir !== 'down') p.pendingDir = 'up';
          else if (msg.dir === 'down' && p.dir !== 'up') p.pendingDir = 'down';
          else if (msg.dir === 'left' && p.dir !== 'right') p.pendingDir = 'left';
          else if (msg.dir === 'right' && p.dir !== 'left') p.pendingDir = 'right';
        }
      }
      return;
    }

    if (msg.type === 'restart') {
      let code = ws.room;
      let room = rooms[code];
      if (!room) return;
      room.state = 'waiting';
      room.food = { x: 5, y: 5 };
      room.powerup = null;
      for (let i = 0; i < room.players.length; i++) {
        let p = room.players[i];
        let startX = 3 + i * 5;
        let startY = 3 + i * 5;
        p.body = [
          { x: startX, y: startY },
          { x: startX - 1, y: startY },
          { x: startX - 2, y: startY },
        ];
        p.dir = 'right';
        p.pendingDir = 'right';
        p.alive = true;
        p.score = 0;
      }
      if (room.players.length >= 2) {
        room.state = 'countdown';
        room.countdown = 3;
        let countdownTimer = setInterval(() => {
          room.countdown--;
          for (let i = 0; i < room.players.length; i++) {
            room.players[i].ws.send(JSON.stringify({ type: 'countdown', value: room.countdown }));
          }
          if (room.countdown <= 0) {
            clearInterval(countdownTimer);
            room.state = 'playing';
            startGameLoop(code);
          }
        }, 1000);
      }
      return;
    }
  });

  ws.on('close', () => {
    let code = ws.room;
    if (!code || !rooms[code]) return;
    let room = rooms[code];
    for (let i = 0; i < room.players.length; i++) {
      if (room.players[i].id === ws.playerId) {
        room.players.splice(i, 1);
        break;
      }
    }
    if (room.players.length === 0) {
      if (room.interval) clearInterval(room.interval);
      delete rooms[code];
    }
  });
});

function startGameLoop(code) {
  let room = rooms[code];
  if (!room) return;
  room.interval = setInterval(() => {
    let room = rooms[code];
    if (!room) return;

    for (let i = 0; i < room.players.length; i++) {
      let p = room.players[i];
      if (!p.alive) continue;
      p.dir = p.pendingDir;
      let head = p.body[0];
      let newHead = { x: head.x, y: head.y };
      if (p.dir === 'up') newHead.y = head.y - 1;
      else if (p.dir === 'down') newHead.y = head.y + 1;
      else if (p.dir === 'left') newHead.x = head.x - 1;
      else if (p.dir === 'right') newHead.x = head.x + 1;

      if (newHead.x < 0 || newHead.x >= 30 || newHead.y < 0 || newHead.y >= 30) {
        p.alive = false;
        continue;
      }

      let hitSelf = false;
      for (let j = 0; j < p.body.length; j++) {
        if (p.body[j].x === newHead.x && p.body[j].y === newHead.y) {
          hitSelf = true;
          break;
        }
      }
      if (hitSelf) {
        p.alive = false;
        continue;
      }

      let hitOther = false;
      for (let k = 0; k < room.players.length; k++) {
        if (room.players[k].id === p.id) continue;
        if (!room.players[k].alive) continue;
        for (let j = 0; j < room.players[k].body.length; j++) {
          if (room.players[k].body[j].x === newHead.x && room.players[k].body[j].y === newHead.y) {
            hitOther = true;
            break;
          }
        }
      }
      if (hitOther) {
        p.alive = false;
        continue;
      }

      p.body.unshift(newHead);

      if (newHead.x === room.food.x && newHead.y === room.food.y) {
        p.score += 10;
        let fx, fy, ok;
        do {
          ok = true;
          fx = Math.floor(Math.random() * 30);
          fy = Math.floor(Math.random() * 30);
          for (let z = 0; z < p.body.length; z++) {
            if (p.body[z].x === fx && p.body[z].y === fy) ok = false;
          }
        } while (!ok);
        room.food = { x: fx, y: fy };
      } else if (room.powerup && newHead.x === room.powerup.x && newHead.y === room.powerup.y) {
        if (room.powerup.kind === 'speed') {
          p.score += 5;
        } else if (room.powerup.kind === 'grow') {
          p.body.push({ x: p.body[p.body.length - 1].x, y: p.body[p.body.length - 1].y });
          p.body.push({ x: p.body[p.body.length - 1].x, y: p.body[p.body.length - 1].y });
          p.score += 5;
        }
        room.powerup = null;
      } else {
        p.body.pop();
      }
    }

    if (!room.powerup && Math.random() < 0.02) {
      let px, py, ok2;
      do {
        ok2 = true;
        px = Math.floor(Math.random() * 30);
        py = Math.floor(Math.random() * 30);
        for (let i = 0; i < room.players.length; i++) {
          for (let z = 0; z < room.players[i].body.length; z++) {
            if (room.players[i].body[z].x === px && room.players[i].body[z].y === py) ok2 = false;
          }
        }
      } while (!ok2);
      room.powerup = { x: px, y: py, kind: Math.random() < 0.5 ? 'speed' : 'grow' };
    }

    let aliveCount = 0;
    for (let i = 0; i < room.players.length; i++) {
      if (room.players[i].alive) aliveCount++;
    }
    if (room.players.length >= 2 && aliveCount <= 1) {
      room.state = 'gameover';
      clearInterval(room.interval);
    }

    let state = {
      type: 'state',
      state: room.state,
      food: room.food,
      powerup: room.powerup,
      players: room.players.map(function (p) {
        return { id: p.id, name: p.name, body: p.body, alive: p.alive, score: p.score };
      }),
    };
    for (let i = 0; i < room.players.length; i++) {
      room.players[i].ws.send(JSON.stringify(state));
    }
  }, 150);
}

server.listen(PORT, () => {
  console.log('snake-antes escuchando en puerto ' + PORT);
});
