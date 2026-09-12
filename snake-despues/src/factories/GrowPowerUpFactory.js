const EntityFactory = require('./EntityFactory');
const GrowPowerUp = require('../core/entities/GrowPowerUp');

class GrowPowerUpFactory extends EntityFactory {
  createEntity(position) {
    return new GrowPowerUp(position.x, position.y);
  }
}

module.exports = GrowPowerUpFactory;
