# State — `RoomState` (Waiting / Countdown / Playing / GameOver)

## Problema que resuelve

En `snake-antes/server.js`, la fase de la partida se controla con un campo de texto (`room.state = 'waiting' | 'countdown' | 'playing' | 'gameover'`) revisado con comparaciones sueltas, y la transición de una fase a otra está **duplicada literalmente** entre `join` (líneas 77-91), `start` (líneas 99-113, el mensaje agregado para permitir jugar de a una persona) y `restart` (líneas 153-167): el mismo bloque de cuenta regresiva copiado y pegado tres veces. Nada impide, por ejemplo, llamar `startGameLoop` dos veces sobre la misma sala si dos eventos coinciden.

## Estructura aplicada

```mermaid
stateDiagram-v2
    [*] --> WaitingState
    WaitingState --> CountdownState : onPlayerJoined() con >= MIN_PLAYERS_TO_START
    WaitingState --> CountdownState : onStartRequested() con >= 1 jugador (modo un jugador)
    CountdownState --> PlayingState : cuenta regresiva llega a 0
    PlayingState --> GameOverState : 1 jugador y 0 vivas, o 2+ jugadores y <= 1 viva
    GameOverState --> WaitingState : onRestartRequested()
```

```mermaid
classDiagram
    class RoomState {
        <<abstract>>
        #room: GameRoom
        +onPlayerJoined()
        +onStartRequested()
        +onRestartRequested()
        +tick()
        +getName() string
    }
    class WaitingState
    class CountdownState {
        -remaining: number
        -timer
    }
    class PlayingState
    class GameOverState
    class GameRoom {
        -state: RoomState
        +setState(state)
    }

    RoomState <|-- WaitingState
    RoomState <|-- CountdownState
    RoomState <|-- PlayingState
    RoomState <|-- GameOverState
    GameRoom o-- RoomState : delega en
```

`GameRoom` (el *contexto*) nunca pregunta "¿en qué fase estoy?" con un `if`: delega `onPlayerJoined()`, `onStartRequested()`, `onRestartRequested()` y `tick()` al objeto `state` actual, y cada estado concreto decide a qué otro estado transicionar llamando `room.setState(new SiguienteState(room))`. `onStartRequested()` es lo que habilita el modo un jugador: `WaitingState` la ignora si no hay al menos un jugador, pero no exige el mínimo de `MIN_PLAYERS_TO_START` que sí exige el arranque automático por `onPlayerJoined()`.

## Por qué State y no otra alternativa

- **Alternativa descartada — mantener el campo `state: string` con un `switch` en cada método (lo que ya hacía el "antes"):** cada nuevo comportamiento por fase agrega una rama más al mismo `switch`, y la duplicación de la cuenta regresiva entre `join` y `restart` es evidencia directa de que la lógica no está en un solo lugar.
- **Alternativa descartada — usar solo banderas booleanas (`isWaiting`, `isPlaying`, `isCountingDown`):** con 4 fases mutuamente excluyentes, las combinaciones inválidas de banderas (`isWaiting && isPlaying`) se vuelven posibles por error; un `string`/`enum` ya es mejor, pero sigue centralizando el comportamiento fuera de la fase misma.
- **Por qué State:** el comportamiento de `addPlayer`, `restart` y `tick` cambia genuinamente según la fase de la sala, y cada fase tiene su propia lógica de transición (la cuenta regresiva solo existe dentro de `CountdownState`). Modelar cada fase como una clase elimina la duplicación entre `join`/`restart` y hace imposible, por construcción, ejecutar `tick()` de forma significativa fuera de `PlayingState`.
