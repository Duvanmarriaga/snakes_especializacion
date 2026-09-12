class RoomState {
  constructor(room) {
    this.room = room;
  }

  onPlayerJoined() {}

  onStartRequested() {}

  onRestartRequested() {}

  tick() {}

  getName() {
    throw new Error('getName debe ser implementado por la subclase');
  }
}

module.exports = RoomState;
