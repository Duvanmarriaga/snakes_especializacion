const GameRoom = require('./GameRoom');
const BroadcastObserver = require('../observers/BroadcastObserver');
const { MAX_PLAYERS } = require('../config');

let instance = null;

class RoomManager {
  constructor() {
    if (instance) {
      return instance;
    }
    this.rooms = new Map();
    this.lobbyClients = new Set();
    instance = this;
  }

  static getInstance() {
    if (!instance) {
      instance = new RoomManager();
    }
    return instance;
  }

  getOrCreateRoom(code) {
    if (!this.rooms.has(code)) {
      const room = new GameRoom(code);
      room.addObserver(new BroadcastObserver(room));
      this.rooms.set(code, room);
    }
    return this.rooms.get(code);
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  removeRoomIfEmpty(code) {
    const room = this.rooms.get(code);
    if (room && room.isEmpty()) {
      room.stopGameLoop();
      this.rooms.delete(code);
      this.broadcastRooms();
    }
  }

  registerClient(ws) {
    this.lobbyClients.add(ws);
    ws.send(JSON.stringify({ type: 'rooms', rooms: this.listRooms() }));
  }

  unregisterClient(ws) {
    this.lobbyClients.delete(ws);
  }

  listRooms() {
    return Array.from(this.rooms.values()).map((room) => ({
      code: room.code,
      players: room.players.length,
      maxPlayers: MAX_PLAYERS,
      state: room.state.getName(),
    }));
  }

  broadcastRooms() {
    const rooms = this.listRooms();
    const payload = JSON.stringify({ type: 'rooms', rooms });
    this.lobbyClients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    });
  }
}

module.exports = RoomManager;
