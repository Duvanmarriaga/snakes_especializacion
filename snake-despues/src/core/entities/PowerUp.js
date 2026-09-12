const Collectible = require('./Collectible');

class PowerUp extends Collectible {
  // Rol "Product" del Factory Method: cada power-up concreto decide su propio
  // efecto al ser consumido, en vez de que GameRoom pregunte por su tipo.
  applyTo(snake) {
    throw new Error('applyTo debe ser implementado por la subclase');
  }
}

module.exports = PowerUp;
