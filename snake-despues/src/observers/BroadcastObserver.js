// Observer concreto: traduce eventos del dominio (GameRoom) en mensajes WebSocket.
// GameRoom no sabe que existe WebSocket; solo notifica eventos.
class BroadcastObserver {
  constructor(room) {
    this.room = room;
  }

  update(event, payload) {
    this.room.players.forEach((player) => player.send({ type: event, ...payload }));
  }
}

module.exports = BroadcastObserver;
