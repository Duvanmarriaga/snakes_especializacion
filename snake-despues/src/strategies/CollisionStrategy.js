class CollisionStrategy {
  resolveWallCollision(head, boardSize) {
    throw new Error('resolveWallCollision debe ser implementado por la subclase');
  }
}

module.exports = CollisionStrategy;
