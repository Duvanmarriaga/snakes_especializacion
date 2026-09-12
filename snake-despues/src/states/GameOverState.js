const RoomState = require('./RoomState');

class GameOverState extends RoomState {
  onRestartRequested() {
    this.room.resetPlayers();
    const WaitingState = require('./WaitingState');
    this.room.setState(new WaitingState(this.room));
    // Re-evalua de inmediato: si ya hay suficientes jugadores, pasa a Countdown sin esperar un nuevo "join".
    this.room.state.onPlayerJoined();
  }

  getName() {
    return 'gameover';
  }
}

module.exports = GameOverState;
