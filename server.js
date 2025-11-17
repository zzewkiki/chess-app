const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.use(express.static('public'));

// Estructura para almacenar las partidas activas
const games = new Map();

// Clase para manejar una partida
class Game {
    constructor(gameId, timeControl) {
        this.id = gameId;
        this.players = [];
        this.board = this.initializeBoard();
        this.currentTurn = 'white';
        this.moveHistory = [];
        this.timeControl = timeControl; // formato: { minutes, increment }
        this.whiteTime = timeControl.minutes * 60 * 1000; // en milisegundos
        this.blackTime = timeControl.minutes * 60 * 1000;
        this.lastMoveTime = null;
        this.timerInterval = null;
        this.gameOver = false;
        this.winner = null;
    }

    initializeBoard() {
        return [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
    }

    addPlayer(socketId, color) {
        this.players.push({ socketId, color });
    }

    isFull() {
        return this.players.length === 2;
    }

    getPlayerColor(socketId) {
        const player = this.players.find(p => p.socketId === socketId);
        return player ? player.color : null;
    }

    makeMove(from, to, socketId) {
        if (this.gameOver) return { success: false, reason: 'Game is over' };

        const playerColor = this.getPlayerColor(socketId);
        if (playerColor !== this.currentTurn) {
            return { success: false, reason: 'Not your turn' };
        }

        const piece = this.board[from.row][from.col];
        if (piece === '.') {
            return { success: false, reason: 'No piece at source' };
        }

        const isWhitePiece = piece === piece.toUpperCase();
        if ((isWhitePiece && playerColor !== 'white') || (!isWhitePiece && playerColor !== 'black')) {
            return { success: false, reason: 'Not your piece' };
        }

        // Validar movimiento básico (aquí se puede expandir con lógica completa de ajedrez)
        if (!this.isValidMove(from, to, piece)) {
            return { success: false, reason: 'Invalid move' };
        }

        // Realizar el movimiento
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = '.';

        // Actualizar tiempo
        if (this.lastMoveTime) {
            const elapsed = Date.now() - this.lastMoveTime;
            if (this.currentTurn === 'white') {
                this.whiteTime -= elapsed;
                this.whiteTime += this.timeControl.increment * 1000; // añadir incremento
            } else {
                this.blackTime -= elapsed;
                this.blackTime += this.timeControl.increment * 1000;
            }
        }

        this.lastMoveTime = Date.now();

        // Cambiar turno
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

        // Guardar en historial
        this.moveHistory.push({ from, to, piece, timestamp: Date.now() });

        return {
            success: true,
            board: this.board,
            currentTurn: this.currentTurn,
            whiteTime: this.whiteTime,
            blackTime: this.blackTime
        };
    }

    isValidMove(from, to, piece) {
        // Validación básica: no puede moverse a la misma posición
        if (from.row === to.row && from.col === to.col) return false;

        // No puede capturar su propia pieza
        const targetPiece = this.board[to.row][to.col];
        if (targetPiece !== '.') {
            const isPieceWhite = piece === piece.toUpperCase();
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            if (isPieceWhite === isTargetWhite) return false;
        }

        // Validación básica de movimientos por pieza
        const pieceType = piece.toLowerCase();
        switch (pieceType) {
            case 'p': return this.isValidPawnMove(from, to, piece);
            case 'r': return this.isValidRookMove(from, to);
            case 'n': return this.isValidKnightMove(from, to);
            case 'b': return this.isValidBishopMove(from, to);
            case 'q': return this.isValidQueenMove(from, to);
            case 'k': return this.isValidKingMove(from, to);
            default: return false;
        }
    }

    isValidPawnMove(from, to, piece) {
        const direction = piece === piece.toUpperCase() ? -1 : 1;
        const startRow = piece === piece.toUpperCase() ? 6 : 1;
        const rowDiff = to.row - from.row;
        const colDiff = Math.abs(to.col - from.col);

        // Movimiento hacia adelante
        if (colDiff === 0 && this.board[to.row][to.col] === '.') {
            if (rowDiff === direction) return true;
            if (from.row === startRow && rowDiff === 2 * direction &&
                this.board[from.row + direction][from.col] === '.') return true;
        }

        // Captura diagonal
        if (colDiff === 1 && rowDiff === direction && this.board[to.row][to.col] !== '.') {
            return true;
        }

        return false;
    }

    isValidRookMove(from, to) {
        if (from.row !== to.row && from.col !== to.col) return false;
        return this.isPathClear(from, to);
    }

    isValidKnightMove(from, to) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    isValidBishopMove(from, to) {
        if (Math.abs(to.row - from.row) !== Math.abs(to.col - from.col)) return false;
        return this.isPathClear(from, to);
    }

    isValidQueenMove(from, to) {
        return this.isValidRookMove(from, to) || this.isValidBishopMove(from, to);
    }

    isValidKingMove(from, to) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        return rowDiff <= 1 && colDiff <= 1;
    }

    isPathClear(from, to) {
        const rowStep = Math.sign(to.row - from.row);
        const colStep = Math.sign(to.col - from.col);
        let currentRow = from.row + rowStep;
        let currentCol = from.col + colStep;

        while (currentRow !== to.row || currentCol !== to.col) {
            if (this.board[currentRow][currentCol] !== '.') return false;
            currentRow += rowStep;
            currentCol += colStep;
        }

        return true;
    }

    startTimer(io) {
        if (this.timerInterval) return;

        this.lastMoveTime = Date.now();

        this.timerInterval = setInterval(() => {
            if (this.gameOver) {
                clearInterval(this.timerInterval);
                return;
            }

            const elapsed = Date.now() - this.lastMoveTime;

            if (this.currentTurn === 'white') {
                this.whiteTime -= 100;
                if (this.whiteTime <= 0) {
                    this.endGame('black', 'timeout');
                    io.to(this.id).emit('gameOver', { winner: 'black', reason: 'timeout' });
                    clearInterval(this.timerInterval);
                }
            } else {
                this.blackTime -= 100;
                if (this.blackTime <= 0) {
                    this.endGame('white', 'timeout');
                    io.to(this.id).emit('gameOver', { winner: 'white', reason: 'timeout' });
                    clearInterval(this.timerInterval);
                }
            }

            io.to(this.id).emit('timeUpdate', {
                whiteTime: Math.max(0, this.whiteTime),
                blackTime: Math.max(0, this.blackTime)
            });
        }, 100);
    }

    endGame(winner, reason) {
        this.gameOver = true;
        this.winner = winner;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }
}

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

        io.to(gameId).emit('gameStart', {
            board: game.board,
            currentTurn: game.currentTurn,
            whiteTime: game.whiteTime,
            blackTime: game.blackTime
        });

        game.startTimer(io);

        console.log(`Jugador unido a partida: ${gameId}`);
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
                blackTime: result.blackTime
            });
        } else {
            socket.emit('invalidMove', { reason: result.reason });
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);

        // Buscar y eliminar juegos del jugador desconectado
        games.forEach((game, gameId) => {
            if (game.players.some(p => p.socketId === socket.id)) {
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