const ChessLogic = require('./ChessLogic');
const Clock = require('./Clock');

class Game {
    constructor(gameId, timeControl) {
        this.id = gameId;
        this.players = [];
        this.board = this.initializeBoard();
        this.currentTurn = 'white';
        this.moveHistory = [];
        this.timeControl = timeControl;
        this.clock = new Clock(timeControl);
        this.chessLogic = new ChessLogic();
        this.gameOver = false;
        this.winner = null;
        this.lastMove = null;
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
        if (this.gameOver) {
            return { success: false, reason: 'Game is over' };
        }

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

        // Validar con ChessLogic
        const moveValidation = this.chessLogic.validateMove(
            this.board,
            from,
            to,
            piece,
            this.lastMove,
            this.currentTurn
        );

        if (!moveValidation.valid) {
            return { success: false, reason: moveValidation.reason };
        }

        // Ejecutar el movimiento
        this.chessLogic.executeMove(this.board, from, to, piece, promotion, this.lastMove);

        // Actualizar reloj
        this.clock.recordMove(this.currentTurn);

        // Cambiar turno
        this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

        // Verificar jaque mate o tablas
        const opponentColor = this.currentTurn;
        const isCheck = this.chessLogic.isKingInCheck(this.board, opponentColor);
        const hasLegalMoves = this.chessLogic.hasLegalMoves(this.board, opponentColor, this.lastMove);

        let gameStatus = null;
        if (!hasLegalMoves) {
            if (isCheck) {
                this.endGame(playerColor, 'checkmate');
                gameStatus = { winner: playerColor, reason: 'checkmate' };
            } else {
                this.endGame(null, 'stalemate');
                gameStatus = { winner: null, reason: 'stalemate' };
            }
        }

        // Guardar movimiento
        this.moveHistory.push({ from, to, piece, timestamp: Date.now() });
        this.lastMove = { from, to, piece };

        return {
            success: true,
            board: this.board,
            currentTurn: this.currentTurn,
            whiteTime: this.clock.getWhiteTime(),
            blackTime: this.clock.getBlackTime(),
            isCheck: !gameStatus && this.chessLogic.isKingInCheck(this.board, this.currentTurn),
            gameStatus
        };
    }

    startTimer(callback) {
        this.clock.start((color, reason) => {
            this.endGame(color === 'white' ? 'black' : 'white', reason);
            if (callback) callback(color, reason);
        });
    }

    stopTimer() {
        this.clock.stop();
    }

    endGame(winner, reason) {
        this.gameOver = true;
        this.winner = winner;
        this.clock.stop();
    }

    getState() {
        return {
            board: this.board,
            currentTurn: this.currentTurn,
            whiteTime: this.clock.getWhiteTime(),
            blackTime: this.clock.getBlackTime(),
            gameOver: this.gameOver,
            winner: this.winner
        };
    }
}

module.exports = Game;