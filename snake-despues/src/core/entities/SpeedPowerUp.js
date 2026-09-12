const PowerUp = require('./PowerUp');

class SpeedPowerUp extends PowerUp {
  constructor(x, y) {
    super(x, y, 'speed', 5);
  }

  applyTo() {
    return false;
  }
}

module.exports = SpeedPowerUp;
