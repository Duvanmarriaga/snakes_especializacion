const EntityFactory = require('./EntityFactory');
const Obstacle = require('../core/entities/Obstacle');

class ObstacleFactory extends EntityFactory {
  createEntity(position) {
    return new Obstacle(position.x, position.y);
  }
}

module.exports = ObstacleFactory;
