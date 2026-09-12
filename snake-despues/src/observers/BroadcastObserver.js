class BroadcastObserver {
  constructor(room) {
    this.room = room;
  }

  update(event, payload) {
    this.room.players.forEach((player) => player.send({ type: event, ...payload }));
  }
}

module.exports = BroadcastObserver;
