const request = require('supertest');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const Game = require('../src/game/Game');

describe('Server - Eventos de Socket.io', () => {
    let io, serverSocket, clientSocket1, clientSocket2, httpServer;

    beforeAll((done) => {
        // Crear servidor HTTP y Socket.io para testing
        httpServer = createServer();
        io = new Server(httpServer);

        httpServer.listen(() => {
            const port = httpServer.address().port;

            // Conectar primer cliente
            clientSocket1 = new Client(`http://localhost:${port}`);

            // Cuando se conecta el primer cliente
            clientSocket1.on('connect', () => {
                // Conectar segundo cliente
                clientSocket2 = new Client(`http://localhost:${port}`);

                clientSocket2.on('connect', () => {
                    done();
                });
            });
        });

        // Simular comportamiento del servidor
        io.on('connection', (socket) => {
            serverSocket = socket;

            // Mock del mapa de juegos
            const games = new Map();

            socket.on('createGame', ({ timeControl }) => {
                const gameId = 'test-game-id';
                const game = new Game(gameId, timeControl);
                game.addPlayer(socket.id, 'white');
                games.set(gameId, game);

                socket.join(gameId);
                socket.emit('gameCreated', {
                    gameId,
                    color: 'white',
                    board: game.board,
                    timeControl: game.timeControl
                });
            });

            socket.on('joinGame', ({ gameId }) => {
                const game = games.get(gameId);

                if (!game) {
                    socket.emit('error', { message: 'Game not found' });
                    return;
                }

                if (game.isFull()) {
                    socket.emit('error', { message: 'Game is full' });
                    return;
                }

                game.addPlayer(socket.id, 'black');
                socket.join(gameId);

                socket.emit('gameJoined', {
                    gameId,
                    color: 'black',
                    board: game.board,
                    timeControl: game.timeControl
                });

                io.to(gameId).emit('gameStart', {
                    board: game.board,
                    currentTurn: game.currentTurn,
                    whiteTime: game.clock.getWhiteTime(),
                    blackTime: game.clock.getBlackTime()
                });
            });

            socket.on('makeMove', ({ gameId, from, to }) => {
                const game = games.get(gameId);

                if (!game) {
                    socket.emit('error', { message: 'Game not found' });
                    return;
                }

                const result = game.makeMove(from, to, socket.id);

                if (result.success) {
                    io.to(gameId).emit('moveMade', {
                        board: result.board,
                        from,
                        to,
                        currentTurn: result.currentTurn,
                        whiteTime: result.whiteTime,
                        blackTime: result.blackTime,
                        isCheck: result.isCheck
                    });

                    if (result.gameStatus) {
                        io.to(gameId).emit('gameOver', result.gameStatus);
                    }
                } else {
                    socket.emit('invalidMove', { reason: result.reason });
                }
            });
        });
    });

    afterAll(() => {
        io.close();
        clientSocket1.close();
        clientSocket2.close();
        httpServer.close();
    });

    describe('Creación de Partida', () => {
        test('debe crear una partida y asignar color blanco', (done) => {
            // Arrange
            const timeControl = { minutes: 5, increment: 0 };

            // Act
            clientSocket1.emit('createGame', { timeControl });

            // Assert
            clientSocket1.on('gameCreated', (data) => {
                expect(data.gameId).toBe('test-game-id');
                expect(data.color).toBe('white');
                expect(data.board).toBeDefined();
                expect(data.timeControl).toEqual(timeControl);
                done();
            });
        });
    });

    describe('Unirse a Partida', () => {
        test('debe permitir unirse a partida existente', (done) => {
            // Arrange
            const timeControl = { minutes: 5, increment: 0 };

            clientSocket1.emit('createGame', { timeControl });

            clientSocket1.once('gameCreated', (data) => {
                const gameId = data.gameId;

                // Act
                clientSocket2.emit('joinGame', { gameId });

                // Assert
                clientSocket2.once('gameJoined', (joinData) => {
                    expect(joinData.gameId).toBe(gameId);
                    expect(joinData.color).toBe('black');
                    done();
                });
            });
        });

        test('debe emitir gameStart cuando se une el segundo jugador', (done) => {
            // Arrange
            const timeControl = { minutes: 3, increment: 2 };

            clientSocket1.emit('createGame', { timeControl });

            clientSocket1.once('gameCreated', (data) => {
                const gameId = data.gameId;

                // Assert - escuchar gameStart en ambos clientes
                let gameStartCount = 0;
                const checkDone = () => {
                    gameStartCount++;
                    if (gameStartCount === 2) done();
                };

                clientSocket1.once('gameStart', (startData) => {
                    expect(startData.board).toBeDefined();
                    expect(startData.currentTurn).toBe('white');
                    checkDone();
                });

                clientSocket2.once('gameStart', (startData) => {
                    expect(startData.board).toBeDefined();
                    expect(startData.currentTurn).toBe('white');
                    checkDone();
                });

                // Act
                clientSocket2.emit('joinGame', { gameId });
            });
        });

        test('debe retornar error si la partida no existe', (done) => {
            // Act
            clientSocket1.emit('joinGame', { gameId: 'non-existent-game' });

            // Assert
            clientSocket1.once('error', (data) => {
                expect(data.message).toBe('Game not found');
                done();
            });
        });
    });

    describe('Ejecución de Movimientos', () => {
        test('debe transmitir movimiento válido a ambos jugadores', (done) => {
            // Arrange
            const timeControl = { minutes: 5, increment: 0 };

            clientSocket1.emit('createGame', { timeControl });

            clientSocket1.once('gameCreated', (data) => {
                const gameId = data.gameId;

                clientSocket2.emit('joinGame', { gameId });

                clientSocket2.once('gameJoined', () => {
                    // Assert
                    let moveCount = 0;
                    const checkDone = () => {
                        moveCount++;
                        if (moveCount === 2) done();
                    };

                    clientSocket1.once('moveMade', (moveData) => {
                        expect(moveData.board[5][4]).toBe('P');
                        expect(moveData.currentTurn).toBe('black');
                        checkDone();
                    });

                    clientSocket2.once('moveMade', (moveData) => {
                        expect(moveData.board[5][4]).toBe('P');
                        expect(moveData.currentTurn).toBe('black');
                        checkDone();
                    });

                    // Act
                    clientSocket1.emit('makeMove', {
                        gameId,
                        from: { row: 6, col: 4 },
                        to: { row: 5, col: 4 }
                    });
                });
            });
        });

        test('debe retornar error para movimiento inválido', (done) => {
            // Arrange
            const timeControl = { minutes: 5, increment: 0 };

            clientSocket1.emit('createGame', { timeControl });

            clientSocket1.once('gameCreated', (data) => {
                const gameId = data.gameId;

                clientSocket2.emit('joinGame', { gameId });

                clientSocket2.once('gameJoined', () => {
                    // Act: intento de mover pieza enemiga
                    clientSocket1.emit('makeMove', {
                        gameId,
                        from: { row: 1, col: 4 },
                        to: { row: 2, col: 4 }
                    });

                    // Assert
                    clientSocket1.once('invalidMove', (data) => {
                        expect(data.reason).toBe('Not your piece');
                        done();
                    });
                });
            });
        });
    });
});