const Collectible = require('./Collectible');

class PowerUp extends Collectible {
  applyTo(snake) {
    throw new Error('applyTo debe ser implementado por la subclase');
  }
}

module.exports = PowerUp;
