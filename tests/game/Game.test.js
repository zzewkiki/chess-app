const Game = require('../../src/game/Game');

describe('Game - Lógica Integrada del Juego', () => {
    let game;
    const mockSocketId1 = 'socket-player-1';
    const mockSocketId2 = 'socket-player-2';

    beforeEach(() => {
        const timeControl = { minutes: 5, increment: 0 };
        game = new Game('test-game-id', timeControl);
        game.addPlayer(mockSocketId1, 'white');
        game.addPlayer(mockSocketId2, 'black');
    });

    afterEach(() => {
        game.stopTimer();
    });

    describe('Gestión de Jugadores', () => {
        test('debe agregar jugadores correctamente', () => {
            // Assert
            expect(game.players).toHaveLength(2);
            expect(game.getPlayerColor(mockSocketId1)).toBe('white');
            expect(game.getPlayerColor(mockSocketId2)).toBe('black');
        });

        test('debe detectar cuando el juego está lleno', () => {
            // Assert
            expect(game.isFull()).toBe(true);
        });

        test('debe retornar null para socketId desconocido', () => {
            // Act & Assert
            expect(game.getPlayerColor('unknown-socket')).toBeNull();
        });
    });

    describe('Ejecución de Movimientos', () => {
        test('debe permitir movimiento legal de peón blanco', () => {
            // Act
            const result = game.makeMove(
                { row: 6, col: 4 },
                { row: 5, col: 4 },
                mockSocketId1
            );

            // Assert
            expect(result.success).toBe(true);
            expect(result.board[5][4]).toBe('P');
            expect(result.board[6][4]).toBe('.');
            expect(result.currentTurn).toBe('black');
        });

        test('debe rechazar movimiento en turno incorrecto', () => {
            // Act: negro intenta mover en turno de blancas
            const result = game.makeMove(
                { row: 1, col: 4 },
                { row: 2, col: 4 },
                mockSocketId2
            );

            // Assert
            expect(result.success).toBe(false);
            expect(result.reason).toBe('Not your turn');
        });

        test('debe rechazar movimiento de pieza enemiga', () => {
            // Act: blancas intentan mover pieza negra
            const result = game.makeMove(
                { row: 1, col: 4 },
                { row: 2, col: 4 },
                mockSocketId1
            );

            // Assert
            expect(result.success).toBe(false);
            expect(result.reason).toBe('Not your piece');
        });

        test('debe alternar turnos correctamente', () => {
            // Act
            game.makeMove({ row: 6, col: 4 }, { row: 5, col: 4 }, mockSocketId1);
            game.makeMove({ row: 1, col: 4 }, { row: 2, col: 4 }, mockSocketId2);

            // Assert
            expect(game.currentTurn).toBe('white');
        });

        test('debe rechazar movimiento si casilla origen está vacía', () => {
            // Act
            const result = game.makeMove(
                { row: 4, col: 4 },
                { row: 3, col: 4 },
                mockSocketId1
            );

            // Assert
            expect(result.success).toBe(false);
            expect(result.reason).toBe('No piece at source');
        });
    });

    describe('Detección de Jaque', () => {
        test('debe detectar y reportar jaque', () => {
            // Arrange: configurar posición de jaque
            // Mate del Pastor simplificado
            game.makeMove({ row: 6, col: 4 }, { row: 4, col: 4 }, mockSocketId1); // e4
            game.makeMove({ row: 1, col: 4 }, { row: 3, col: 4 }, mockSocketId2); // e5
            game.makeMove({ row: 7, col: 5 }, { row: 4, col: 2 }, mockSocketId1); // Bc4
            game.makeMove({ row: 0, col: 1 }, { row: 2, col: 2 }, mockSocketId2); // Nc6
            game.makeMove({ row: 7, col: 3 }, { row: 3, col: 7 }, mockSocketId1); // Qh5
            game.makeMove({ row: 0, col: 6 }, { row: 2, col: 5 }, mockSocketId2); // Nf6

            // Act
            const result = game.makeMove(
                { row: 3, col: 7 },
                { row: 1, col: 5 },
                mockSocketId1
            ); // Qxf7+ (jaque)

            // Assert
            expect(result.success).toBe(true);
            expect(result.isCheck).toBe(true);
        });
    });

    describe('Fin de Juego', () => {
        test('debe detectar jaque mate', () => {
            // Arrange: mate del loco (fool's mate)
            game.makeMove({ row: 6, col: 5 }, { row: 5, col: 5 }, mockSocketId1); // f3
            game.makeMove({ row: 1, col: 4 }, { row: 3, col: 4 }, mockSocketId2); // e5
            game.makeMove({ row: 6, col: 6 }, { row: 4, col: 6 }, mockSocketId1); // g4

            // Act
            const result = game.makeMove(
                { row: 0, col: 3 },
                { row: 4, col: 7 },
                mockSocketId2
            ); // Qh4# (mate)

            // Assert
            expect(result.success).toBe(true);
            expect(result.gameStatus).toBeDefined();
            expect(result.gameStatus.reason).toBe('checkmate');
            expect(result.gameStatus.winner).toBe('black');
            expect(game.gameOver).toBe(true);
        });

        test('no debe permitir movimientos después de fin de juego', () => {
            // Arrange: terminar juego
            game.endGame('white', 'timeout');

            // Act
            const result = game.makeMove(
                { row: 6, col: 4 },
                { row: 5, col: 4 },
                mockSocketId1
            );

            // Assert
            expect(result.success).toBe(false);
            expect(result.reason).toBe('Game is over');
        });
    });

    describe('Integración con Reloj', () => {
        test('debe actualizar tiempos después de movimiento', () => {
            // Arrange
            const initialWhiteTime = game.clock.getWhiteTime();

            // Simular tiempo transcurrido
            game.clock.lastMoveTime = Date.now() - 2000; // 2 segundos atrás

            // Act
            const result = game.makeMove(
                { row: 6, col: 4 },
                { row: 5, col: 4 },
                mockSocketId1
            );

            // Assert
            expect(result.success).toBe(true);
            expect(result.whiteTime).toBeLessThan(initialWhiteTime);
        });

        test('debe iniciar el reloj correctamente', (done) => {
            // Arrange
            const initialTime = game.clock.getWhiteTime();

            // Act
            game.startTimer();

            // Assert
            setTimeout(() => {
                game.stopTimer();
                expect(game.clock.getWhiteTime()).toBeLessThan(initialTime);
                done();
            }, 250);
        });

        test('debe terminar juego por timeout', (done) => {
            // Arrange
            game.clock.setTime('white', 150);

            // Act
            game.startTimer((color, reason) => {
                // Assert
                expect(game.gameOver).toBe(true);
                expect(game.winner).toBe('black');
                done();
            });
        });
    });

    describe('Estado del Juego', () => {
        test('debe retornar estado completo del juego', () => {
            // Act
            const state = game.getState();

            // Assert
            expect(state).toHaveProperty('board');
            expect(state).toHaveProperty('currentTurn');
            expect(state).toHaveProperty('whiteTime');
            expect(state).toHaveProperty('blackTime');
            expect(state).toHaveProperty('gameOver');
            expect(state).toHaveProperty('winner');
        });

        test('debe mantener historial de movimientos', () => {
            // Act
            game.makeMove({ row: 6, col: 4 }, { row: 5, col: 4 }, mockSocketId1);
            game.makeMove({ row: 1, col: 4 }, { row: 2, col: 4 }, mockSocketId2);

            // Assert
            expect(game.moveHistory).toHaveLength(2);
            expect(game.moveHistory[0].piece).toBe('P');
            expect(game.moveHistory[1].piece).toBe('p');
        });
    });
});