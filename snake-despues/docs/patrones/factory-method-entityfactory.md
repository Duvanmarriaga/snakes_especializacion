# Factory Method — `EntityFactory` / `FoodFactory` / `SpeedPowerUpFactory` / `GrowPowerUpFactory` / `ObstacleFactory`

## Problema que resuelve

En `snake-antes/server.js`, la comida, los power-ups y ahora los obstáculos se crean como objetos literales repetidos e inconsistentes: `{ x: fx, y: fy }` para la comida (líneas 305-317), `{ x: px, y: py, kind: ... }` para el power-up (líneas 333-347) y `{ x: ox, y: oy }` para cada obstáculo (líneas 216-236, función `generateObstacles`), cada uno con su propio bucle de "buscar posición libre" copiado y pegado. Agregar los obstáculos para el nuevo modo de juego fue, literalmente, escribir una cuarta variante del mismo bucle en vez de reutilizar nada. Además hay que tocar el `if/else` que decide qué efecto aplicar el power-up (`server.js:319-326`).

En `snake-despues`, en cambio, agregar obstáculos fue: una clase `Obstacle`, una `ObstacleFactory`, y una llamada a `this.randomFreePosition(...)` ya existente — cero bucles nuevos de "buscar posición libre".

## Estructura aplicada

```mermaid
classDiagram
    class EntityFactory {
        <<abstract>>
        +createEntity(position) Collectible
    }
    class FoodFactory {
        +createEntity(position) Food
    }
    class SpeedPowerUpFactory {
        +createEntity(position) SpeedPowerUp
    }
    class GrowPowerUpFactory {
        +createEntity(position) GrowPowerUp
    }
    class ObstacleFactory {
        +createEntity(position) Obstacle
    }
    class Collectible {
        +x, y, kind, value
    }
    class Food
    class PowerUp {
        <<abstract>>
        +applyTo(snake) boolean
    }
    class SpeedPowerUp
    class GrowPowerUp
    class Obstacle {
        +x, y, kind
    }

    EntityFactory <|-- FoodFactory
    EntityFactory <|-- SpeedPowerUpFactory
    EntityFactory <|-- GrowPowerUpFactory
    EntityFactory <|-- ObstacleFactory
    Collectible <|-- Food
    Collectible <|-- PowerUp
    PowerUp <|-- SpeedPowerUp
    PowerUp <|-- GrowPowerUp
    FoodFactory ..> Food : crea
    SpeedPowerUpFactory ..> SpeedPowerUp : crea
    GrowPowerUpFactory ..> GrowPowerUp : crea
    ObstacleFactory ..> Obstacle : crea
```

`EntityFactory` es el *Creator* abstracto (`createEntity(position)`); cada factory concreta decide qué *Product* concreto instanciar. `GameRoom` (`src/core/GameRoom.js`) nunca pregunta "¿qué tipo de power-up es este?" con un `if/else`: cada `PowerUp` implementa su propio `applyTo(snake)`, así que aplicar el efecto es simplemente `this.powerUp.applyTo(player.snake)`.

## Por qué Factory Method y no otra alternativa

- **Alternativa descartada — una función `createEntity(kind, position)` con un `switch` interno:** es justo lo que penaliza la rúbrica ("un Factory Method que sigue usando `if/elif` internamente"); mover el `switch` a una función no elimina el problema de fondo, solo lo reubica.
- **Alternativa descartada — Abstract Factory:** tendría sentido si existieran *familias* de entidades relacionadas (p. ej. un modo de juego "clásico" vs. uno "caótico" con familias completas de power-ups distintos). Aquí solo hay productos individuales sin familias, así que Abstract Factory sería una capa de más sin beneficio.
- **Por qué Factory Method:** el problema real es "crear el producto correcto sin que el llamador conozca la clase concreta ni el efecto que produce", que es exactamente lo que resuelve delegar la creación a subclases (`FoodFactory`, `SpeedPowerUpFactory`, `GrowPowerUpFactory`, `ObstacleFactory`) y el comportamiento a los propios productos (`applyTo` en los power-ups). Agregar un power-up nuevo, o —como pasó al implementar los obstáculos— una entidad completamente distinta con otra semántica (un obstáculo no se consume, solo bloquea), es agregar una clase y una factory, sin tocar `GameRoom` más que en el punto donde se invoca `createEntity`.
