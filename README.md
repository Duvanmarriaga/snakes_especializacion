# Snake multijugador — Proyecto integrador de Patrones de Diseño

Dos versiones del mismo juego (Snake multijugador en tiempo real, Node.js + WebSocket nativo) para el proyecto integrador de la especialización: `snake-antes/` (sin arquitectura, "antes") y `snake-despues/` (refactorizado con 5 patrones GoF, "después").

## `snake-antes/` — sin arquitectura

Un único archivo (`server.js`) funcional pero con smells reales y citables por línea (estado global mutable, cadena de `if/else` para despachar mensajes, lógica duplicada, números mágicos, y un game loop que mezcla física, colisiones, spawn de entidades y transporte WebSocket). Ver el diagnóstico completo en [`snake-despues/docs/diagnostico.md`](snake-despues/docs/diagnostico.md).

```bash
cd snake-antes
npm install
npm start          # sirve en http://localhost:3001 (o PORT=xxxx npm start)
```

## `snake-despues/` — arquitectura en capas + 5 patrones GoF

Mismo juego, mismo protocolo WebSocket, refactorizado en `src/` con:

| Patrón | Clase(s) | Qué resuelve |
|---|---|---|
| **Singleton** | `RoomManager` | Reemplaza la variable global `rooms` por un único registro de salas con API explícita. |
| **Factory Method** | `EntityFactory` → `FoodFactory`, `SpeedPowerUpFactory`, `GrowPowerUpFactory` | Crea entidades del tablero (comida, power-ups) sin `if/else` de tipos, y cada producto decide su propio efecto (`applyTo`). |
| **Strategy** | `CollisionStrategy` → `ClassicCollisionStrategy`, `WrapAroundCollisionStrategy` | Aísla la regla de colisión con el borde del tablero para poder añadir modos de juego sin tocar `GameRoom`. |
| **State** | `RoomState` → `WaitingState`, `CountdownState`, `PlayingState`, `GameOverState` | Reemplaza el campo `state: string` y la cuenta regresiva duplicada por transiciones explícitas por fase. |
| **Observer** | `GameRoom` (subject) + `BroadcastObserver` | Desacopla la lógica del juego del envío de mensajes WebSocket. |

Justificación detallada de cada patrón (por qué ese y no una alternativa) en [`snake-despues/docs/patrones/`](snake-despues/docs/patrones/).

```bash
cd snake-despues
npm install
npm start          # sirve en http://localhost:3002 (o PORT=xxxx npm start)
npm test           # node:test — un caso por patrón, aislado y sin WebSocket real
```

## Cómo jugar (ambas versiones)

1. Levanta el servidor correspondiente (`npm start`).
2. Abre `http://localhost:<puerto>` en dos o más pestañas/navegadores.
3. En cada pestaña, escribe un nombre y el mismo código de sala, y pulsa "Unirse".
4. Con 2+ jugadores en la sala arranca la cuenta regresiva y luego la partida. Controles: flechas o WASD.
5. Al terminar la partida (queda una sola serpiente viva), cualquier jugador puede pulsar "Reiniciar partida".

El despliegue en AWS (VPC + dominio propio) queda fuera del alcance de este repositorio; ambos proyectos corren de forma idéntica en local mediante `npm start`.
