const EntityFactory = require('./EntityFactory');
const Food = require('../core/entities/Food');

class FoodFactory extends EntityFactory {
  createEntity(position) {
    return new Food(position.x, position.y);
  }
}

module.exports = FoodFactory;
