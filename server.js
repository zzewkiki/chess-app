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
        this.timeControl = timeControl;
        this.whiteTime = timeControl.minutes * 60 * 1000;
        this.blackTime = timeControl.minutes * 60 * 1000;
        this.lastMoveTime = null;
        this.timerInterval = null;
        this.gameOver = false;
        this.winner = null;
        this.whiteKingMoved = false;
        this.blackKingMoved = false;
        this.whiteRookKingsideMoved = false;
        this.whiteRookQueensideMoved = false;
        this.blackRookKingsideMoved = false;
        this.blackRookQueensideMoved = false;
        this.lastMove = null; // Para captura al paso
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

    makeMove(from, to, socketId, promotion = 'Q') {
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

        // Validar movimiento básico
        if (!this.isValidMove(from, to, piece)) {
            return { success: false, reason: 'Invalid move' };
        }

        // Simular el movimiento para verificar si deja al rey en jaque
        const capturedPiece = this.board[to.row][to.col];
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = '.';

        const inCheck = this.isKingInCheck(playerColor);

        // Deshacer el movimiento
        this.board[from.row][from.col] = piece;
        this.board[to.row][to.col] = capturedPiece;

        if (inCheck) {
            return { success: false, reason: 'Move leaves king in check' };
        }

        // Realizar el movimiento real
        const moveResult = this.executeMoveWithSpecialRules(from, to, piece, promotion);

        // Actualizar tiempo
        if (this.lastMoveTime) {
            const elapsed = Date.now() - this.lastMoveTime;
            if (this.currentTurn === 'white') {
                this.whiteTime -= elapsed;
                this.whiteTime += this.timeControl.increment * 1000;
            } else {
                this.blackTime -= elapsed;
                this.blackTime += this.timeControl.increment * 1000;
            }
        }

        this.lastMoveTime = Date.now();

        // Cambiar turno
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

        // Verificar jaque mate o tablas
        const opponentColor = this.currentTurn;
        const isCheck = this.isKingInCheck(opponentColor);
        const hasLegalMoves = this.hasLegalMoves(opponentColor);

        let gameStatus = null;
        if (!hasLegalMoves) {
            if (isCheck) {
                // Jaque mate
                this.endGame(playerColor, 'checkmate');
                gameStatus = { winner: playerColor, reason: 'checkmate' };
            } else {
                // Tablas por ahogado
                this.endGame(null, 'stalemate');
                gameStatus = { winner: null, reason: 'stalemate' };
            }
        }

        // Guardar en historial
        this.moveHistory.push({ from, to, piece, timestamp: Date.now() });
        this.lastMove = { from, to, piece };

        return {
            success: true,
            board: this.board,
            currentTurn: this.currentTurn,
            whiteTime: this.whiteTime,
            blackTime: this.blackTime,
            isCheck: !gameStatus && this.isKingInCheck(this.currentTurn),
            gameStatus
        };
    }

    executeMoveWithSpecialRules(from, to, piece, promotion) {
        const pieceType = piece.toLowerCase();

        // Enroque
        if (pieceType === 'k') {
            const colDiff = to.col - from.col;
            if (Math.abs(colDiff) === 2) {
                // Mover el rey
                this.board[to.row][to.col] = piece;
                this.board[from.row][from.col] = '.';

                // Mover la torre
                if (colDiff === 2) { // Enroque corto
                    this.board[to.row][5] = this.board[to.row][7];
                    this.board[to.row][7] = '.';
                } else { // Enroque largo
                    this.board[to.row][3] = this.board[to.row][0];
                    this.board[to.row][0] = '.';
                }

                if (piece === 'K') this.whiteKingMoved = true;
                else this.blackKingMoved = true;

                return;
            }

            if (piece === 'K') this.whiteKingMoved = true;
            else this.blackKingMoved = true;
        }

        // Captura al paso
        if (pieceType === 'p') {
            const colDiff = Math.abs(to.col - from.col);
            if (colDiff === 1 && this.board[to.row][to.col] === '.') {
                // Es captura al paso
                const capturedPawnRow = piece === 'P' ? to.row + 1 : to.row - 1;
                this.board[capturedPawnRow][to.col] = '.';
            }

            // Promoción de peón
            const promotionRow = piece === 'P' ? 0 : 7;
            if (to.row === promotionRow) {
                this.board[to.row][to.col] = piece === 'P' ? promotion.toUpperCase() : promotion.toLowerCase();
                this.board[from.row][from.col] = '.';
                return;
            }
        }

        // Actualizar banderas de torres
        if (piece === 'R' && from.row === 7) {
            if (from.col === 0) this.whiteRookQueensideMoved = true;
            if (from.col === 7) this.whiteRookKingsideMoved = true;
        }
        if (piece === 'r' && from.row === 0) {
            if (from.col === 0) this.blackRookQueensideMoved = true;
            if (from.col === 7) this.blackRookKingsideMoved = true;
        }

        // Movimiento normal
        this.board[to.row][to.col] = piece;
        this.board[from.row][from.col] = '.';
    }

    isValidMove(from, to, piece) {
        if (from.row === to.row && from.col === to.col) return false;

        const targetPiece = this.board[to.row][to.col];
        if (targetPiece !== '.') {
            const isPieceWhite = piece === piece.toUpperCase();
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            if (isPieceWhite === isTargetWhite) return false;
        }

        const pieceType = piece.toLowerCase();
        switch (pieceType) {
            case 'p': return this.isValidPawnMove(from, to, piece);
            case 'r': return this.isValidRookMove(from, to);
            case 'n': return this.isValidKnightMove(from, to);
            case 'b': return this.isValidBishopMove(from, to);
            case 'q': return this.isValidQueenMove(from, to);
            case 'k': return this.isValidKingMove(from, to, piece);
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
        if (colDiff === 1 && rowDiff === direction) {
            if (this.board[to.row][to.col] !== '.') return true;

            // Captura al paso
            if (this.lastMove && this.lastMove.piece.toLowerCase() === 'p') {
                const lastMoveRowDiff = Math.abs(this.lastMove.to.row - this.lastMove.from.row);
                if (lastMoveRowDiff === 2 && this.lastMove.to.col === to.col) {
                    const expectedRow = piece === 'P' ? 3 : 4;
                    if (from.row === expectedRow && this.lastMove.to.row === from.row) {
                        return true;
                    }
                }
            }
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

    isValidKingMove(from, to, piece) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);

        // Movimiento normal del rey
        if (rowDiff <= 1 && colDiff <= 1) return true;

        // Enroque
        if (rowDiff === 0 && colDiff === 2) {
            return this.canCastle(from, to, piece);
        }

        return false;
    }

    canCastle(from, to, piece) {
        const isWhite = piece === 'K';
        const row = isWhite ? 7 : 0;

        // Verificar que el rey no se haya movido
        if ((isWhite && this.whiteKingMoved) || (!isWhite && this.blackKingMoved)) {
            return false;
        }

        // Verificar que el rey no esté en jaque
        if (this.isKingInCheck(isWhite ? 'white' : 'black')) {
            return false;
        }

        const colDiff = to.col - from.col;

        if (colDiff === 2) { // Enroque corto
            if ((isWhite && this.whiteRookKingsideMoved) || (!isWhite && this.blackRookKingsideMoved)) {
                return false;
            }

            // Verificar que las casillas estén vacías
            if (this.board[row][5] !== '.' || this.board[row][6] !== '.') {
                return false;
            }

            // Verificar que el rey no pase por jaque
            return !this.isSquareUnderAttack(row, 5, isWhite ? 'white' : 'black') &&
                !this.isSquareUnderAttack(row, 6, isWhite ? 'white' : 'black');

        } else if (colDiff === -2) { // Enroque largo
            if ((isWhite && this.whiteRookQueensideMoved) || (!isWhite && this.blackRookQueensideMoved)) {
                return false;
            }

            // Verificar que las casillas estén vacías
            if (this.board[row][1] !== '.' || this.board[row][2] !== '.' || this.board[row][3] !== '.') {
                return false;
            }

            // Verificar que el rey no pase por jaque
            return !this.isSquareUnderAttack(row, 2, isWhite ? 'white' : 'black') &&
                !this.isSquareUnderAttack(row, 3, isWhite ? 'white' : 'black');
        }

        return false;
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

    findKing(color) {
        const kingPiece = color === 'white' ? 'K' : 'k';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === kingPiece) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isKingInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return false;
        return this.isSquareUnderAttack(kingPos.row, kingPos.col, color);
    }

    isSquareUnderAttack(row, col, defenderColor) {
        const isDefenderWhite = defenderColor === 'white';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece === '.') continue;

                const isPieceWhite = piece === piece.toUpperCase();
                if (isPieceWhite === isDefenderWhite) continue;

                // Verificar si esta pieza puede atacar la casilla
                if (this.canPieceAttackSquare(r, c, row, col, piece)) {
                    return true;
                }
            }
        }

        return false;
    }

    canPieceAttackSquare(fromRow, fromCol, toRow, toCol, piece) {
        const pieceType = piece.toLowerCase();
        const from = { row: fromRow, col: fromCol };
        const to = { row: toRow, col: toCol };

        switch (pieceType) {
            case 'p':
                return this.canPawnAttack(from, to, piece);
            case 'n':
                return this.isValidKnightMove(from, to);
            case 'b':
                return this.isValidBishopMove(from, to);
            case 'r':
                return this.isValidRookMove(from, to);
            case 'q':
                return this.isValidQueenMove(from, to);
            case 'k':
                const rowDiff = Math.abs(to.row - from.row);
                const colDiff = Math.abs(to.col - from.col);
                return rowDiff <= 1 && colDiff <= 1;
        }

        return false;
    }

    canPawnAttack(from, to, piece) {
        const direction = piece === piece.toUpperCase() ? -1 : 1;
        const rowDiff = to.row - from.row;
        const colDiff = Math.abs(to.col - from.col);
        return colDiff === 1 && rowDiff === direction;
    }

    hasLegalMoves(color) {
        const isWhite = color === 'white';

        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = this.board[fromRow][fromCol];
                if (piece === '.') continue;

                const isPieceWhite = piece === piece.toUpperCase();
                if (isPieceWhite !== isWhite) continue;

                // Probar todos los movimientos posibles
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        if (!this.isValidMove({ row: fromRow, col: fromCol }, { row: toRow, col: toCol }, piece)) {
                            continue;
                        }

                        // Simular el movimiento
                        const capturedPiece = this.board[toRow][toCol];
                        this.board[toRow][toCol] = piece;
                        this.board[fromRow][fromCol] = '.';

                        const inCheck = this.isKingInCheck(color);

                        // Deshacer
                        this.board[fromRow][fromCol] = piece;
                        this.board[toRow][toCol] = capturedPiece;

                        if (!inCheck) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    startTimer(io) {
        if (this.timerInterval) return;
        this.lastMoveTime = Date.now();

        this.timerInterval = setInterval(() => {
            if (this.gameOver) {
                clearInterval(this.timerInterval);
                return;
            }

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