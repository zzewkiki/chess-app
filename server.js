const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const Game = require('./src/game/Game');

app.use(express.static('public'));

// Estructura para almacenar las partidas activas
const games = new Map();

// Socket.io eventos
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createGame', ({ timeControl }) => {
        const gameId = generateGameId();
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

        console.log(`Partida creada: ${gameId}`);
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

        const state = game.getState();
        io.to(gameId).emit('gameStart', {
            board: state.board,
            currentTurn: state.currentTurn,
            whiteTime: state.whiteTime,
            blackTime: state.blackTime
        });

        game.startTimer((color, reason) => {
            const winner = color === 'white' ? 'black' : 'white';
            io.to(gameId).emit('gameOver', { winner, reason });
        });

        // Emitir actualizaciones de tiempo periódicamente
        const timeUpdateInterval = setInterval(() => {
            if (game.gameOver) {
                clearInterval(timeUpdateInterval);
                return;
            }

            io.to(gameId).emit('timeUpdate', {
                whiteTime: game.clock.getWhiteTime(),
                blackTime: game.clock.getBlackTime()
            });
        }, 100);

        // Guardar el intervalo en el juego para limpiarlo después
        game.timeUpdateInterval = timeUpdateInterval;

        console.log(`Jugador unido a partida: ${gameId}`);
    });

    socket.on('makeMove', ({ gameId, from, to, promotion }) => {
        const game = games.get(gameId);

        if (!game) {
            socket.emit('error', { message: 'Game not found' });
            return;
        }

        const result = game.makeMove(from, to, socket.id, promotion);

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

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);

        games.forEach((game, gameId) => {
            if (game.players.some(p => p.socketId === socket.id)) {
                game.stopTimer();

                // Limpiar intervalo de actualización de tiempo
                if (game.timeUpdateInterval) {
                    clearInterval(game.timeUpdateInterval);
                }

                io.to(gameId).emit('playerDisconnected');
                games.delete(gameId);
            }
        });
    });
});

function generateGameId() {
    return Math.random().toString(36).substr(2, 9);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});