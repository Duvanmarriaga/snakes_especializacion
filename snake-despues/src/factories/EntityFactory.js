class EntityFactory {
  createEntity(position) {
    throw new Error('createEntity debe ser implementado por la subclase');
  }
}

module.exports = EntityFactory;
