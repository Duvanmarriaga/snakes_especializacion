const RoomState = require('./RoomState');
const { MIN_PLAYERS_TO_START } = require('../config');

class WaitingState extends RoomState {
  onPlayerJoined() {
    if (this.room.players.length >= MIN_PLAYERS_TO_START) {
      this.start();
    }
  }

  onStartRequested() {
    if (this.room.players.length >= 1) {
      this.start();
    }
  }

  start() {
    const CountdownState = require('./CountdownState');
    this.room.setState(new CountdownState(this.room));
  }

  getName() {
    return 'waiting';
  }
}

module.exports = WaitingState;
