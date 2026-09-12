const GameRoom = require('./GameRoom');
const BroadcastObserver = require('../observers/BroadcastObserver');

let instance = null;

// Singleton: un unico punto de acceso al registro de salas del servidor.
// Sustituye la variable global `let rooms = {}` de snake-antes/server.js.
class RoomManager {
  constructor() {
    if (instance) {
      return instance;
    }
    this.rooms = new Map();
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
    }
  }
}

module.exports = RoomManager;
