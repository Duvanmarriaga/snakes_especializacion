const RoomState = require('./RoomState');

class PlayingState extends RoomState {
  constructor(room) {
    super(room);
    this.room.startGameLoop();
  }

  tick() {
    const aliveCount = this.room.runRound();
    if (this.room.players.length >= 2 && aliveCount <= 1) {
      this.room.stopGameLoop();
      const GameOverState = require('./GameOverState');
      this.room.setState(new GameOverState(this.room));
    }
  }

  getName() {
    return 'playing';
  }
}

module.exports = PlayingState;
