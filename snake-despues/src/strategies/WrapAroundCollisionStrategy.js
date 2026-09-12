const CollisionStrategy = require('./CollisionStrategy');

class WrapAroundCollisionStrategy extends CollisionStrategy {
  resolveWallCollision(head, boardSize) {
    return {
      x: (head.x + boardSize) % boardSize,
      y: (head.y + boardSize) % boardSize,
    };
  }
}

module.exports = WrapAroundCollisionStrategy;
