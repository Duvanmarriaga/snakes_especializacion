const EntityFactory = require('./EntityFactory');
const SpeedPowerUp = require('../core/entities/SpeedPowerUp');

class SpeedPowerUpFactory extends EntityFactory {
  createEntity(position) {
    return new SpeedPowerUp(position.x, position.y);
  }
}

module.exports = SpeedPowerUpFactory;
