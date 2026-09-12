const RoomState = require('./RoomState');

class GameOverState extends RoomState {
  onRestartRequested() {
    this.room.resetPlayers();
    const WaitingState = require('./WaitingState');
    this.room.setState(new WaitingState(this.room));
    this.room.state.onPlayerJoined();
  }

  getName() {
    return 'gameover';
  }
}

module.exports = GameOverState;
