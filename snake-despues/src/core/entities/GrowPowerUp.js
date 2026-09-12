const PowerUp = require('./PowerUp');

class GrowPowerUp extends PowerUp {
  constructor(x, y) {
    super(x, y, 'grow', 5);
    this.extraSegments = 2;
  }

  applyTo(snake) {
    const tail = snake.body[snake.body.length - 1];
    for (let i = 0; i < this.extraSegments; i++) {
      snake.body.push({ x: tail.x, y: tail.y });
    }
    return true;
  }
}

module.exports = GrowPowerUp;
