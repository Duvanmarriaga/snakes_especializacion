const RoomManager = require('../core/RoomManager');
const Player = require('../core/Player');

let nextPlayerId = 1;

function handleConnection(ws) {
  const roomManager = RoomManager.getInstance();
  roomManager.registerClient(ws);

  ws.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw);
    } catch (err) {
      return;
    }
    dispatch(ws, message);
  });

  ws.on('close', () => {
    roomManager.unregisterClient(ws);
    if (!ws.roomCode) return;
    const room = roomManager.getRoom(ws.roomCode);
    if (!room) return;
    room.removePlayer(ws.playerId);
    roomManager.removeRoomIfEmpty(ws.roomCode);
  });
}

const HANDLERS = { join: handleJoin, move: handleMove, start: handleStart, restart: handleRestart };

function dispatch(ws, message) {
  const handler = HANDLERS[message.type];
  if (handler) handler(ws, message);
}

function handleJoin(ws, message) {
  const roomManager = RoomManager.getInstance();
  const code = message.room || 'default';
  const room = roomManager.getOrCreateRoom(code);

  if (room.isFull()) {
    ws.send(JSON.stringify({ type: 'error', message: 'sala llena' }));
    return;
  }

  const playerId = nextPlayerId++;
  const start = { x: 3 + room.players.length * 5, y: 3 + room.players.length * 5 };
  const player = new Player(playerId, message.name || `jugador${playerId}`, ws, start);

  ws.playerId = playerId;
  ws.roomCode = code;
  room.addPlayer(player);
}

function handleMove(ws, message) {
  if (!ws.roomCode) return;
  const room = RoomManager.getInstance().getRoom(ws.roomCode);
  if (!room) return;
  room.handleDirection(ws.playerId, message.dir);
}

function handleStart(ws) {
  if (!ws.roomCode) return;
  const room = RoomManager.getInstance().getRoom(ws.roomCode);
  if (!room) return;
  room.requestStart();
}

function handleRestart(ws) {
  if (!ws.roomCode) return;
  const room = RoomManager.getInstance().getRoom(ws.roomCode);
  if (!room) return;
  room.requestRestart();
}

module.exports = { handleConnection };
