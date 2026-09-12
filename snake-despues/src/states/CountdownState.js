const RoomState = require('./RoomState');
const { COUNTDOWN_SECONDS } = require('../config');

class CountdownState extends RoomState {
  constructor(room) {
    super(room);
    this.remaining = COUNTDOWN_SECONDS;
    this.room.notify('countdown', { value: this.remaining });
    this.timer = setInterval(() => this.tickCountdown(), 1000);
  }

  tickCountdown() {
    this.remaining--;
    this.room.notify('countdown', { value: this.remaining });
    if (this.remaining <= 0) {
      clearInterval(this.timer);
      const PlayingState = require('./PlayingState');
      this.room.setState(new PlayingState(this.room));
    }
  }

  getName() {
    return 'countdown';
  }
}

module.exports = CountdownState;
