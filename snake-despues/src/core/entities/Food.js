const Collectible = require('./Collectible');

class Food extends Collectible {
  constructor(x, y) {
    super(x, y, 'food', 10);
  }
}

module.exports = Food;
