const CollisionStrategy = require('./CollisionStrategy');

class ClassicCollisionStrategy extends CollisionStrategy {
  resolveWallCollision(head, boardSize) {
    if (head.x < 0 || head.x >= boardSize || head.y < 0 || head.y >= boardSize) {
      return null;
    }
    return head;
  }
}

module.exports = ClassicCollisionStrategy;
