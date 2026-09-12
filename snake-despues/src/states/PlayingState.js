const RoomState = require('./RoomState');

class PlayingState extends RoomState {
  constructor(room) {
    super(room);
    this.room.startGameLoop();
  }

  tick() {
    const aliveCount = this.room.runRound();
    const soloDefeated = this.room.players.length === 1 && aliveCount === 0;
    const lastOneStanding = this.room.players.length >= 2 && aliveCount <= 1;
    if (soloDefeated || lastOneStanding) {
      this.room.stopGameLoop();
      const GameOverState = require('./GameOverState');
      this.room.setState(new GameOverState(this.room));
      this.room.notify('state', this.room.getSnapshot());
    }
  }

  getName() {
    return 'playing';
  }
}

module.exports = PlayingState;
