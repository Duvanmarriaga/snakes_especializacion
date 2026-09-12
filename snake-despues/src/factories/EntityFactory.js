// Creator abstracto del Factory Method.
class EntityFactory {
  createEntity(position) {
    throw new Error('createEntity debe ser implementado por la subclase');
  }
}

module.exports = EntityFactory;
