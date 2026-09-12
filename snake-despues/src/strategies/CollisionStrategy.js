class CollisionStrategy {
  // Devuelve la cabeza resultante tras chocar con el borde, o null si eso mata a la serpiente.
  resolveWallCollision(head, boardSize) {
    throw new Error('resolveWallCollision debe ser implementado por la subclase');
  }
}

module.exports = CollisionStrategy;
