class ChessLogic {
    constructor() {
        this.whiteKingMoved = false;
        this.blackKingMoved = false;
        this.whiteRookKingsideMoved = false;
        this.whiteRookQueensideMoved = false;
        this.blackRookKingsideMoved = false;
        this.blackRookQueensideMoved = false;
    }

    validateMove(board, from, to, piece, lastMove, currentTurn) {
        // Validación básica
        if (from.row === to.row && from.col === to.col) {
            return { valid: false, reason: 'Same position' };
        }

        // No puede capturar su propia pieza
        const targetPiece = board[to.row][to.col];
        if (targetPiece !== '.') {
            const isPieceWhite = piece === piece.toUpperCase();
            const isTargetWhite = targetPiece === targetPiece.toUpperCase();
            if (isPieceWhite === isTargetWhite) {
                return { valid: false, reason: 'Cannot capture own piece' };
            }
        }

        // Validar según tipo de pieza
        if (!this.isValidMoveForPiece(board, from, to, piece, lastMove)) {
            return { valid: false, reason: 'Invalid move for piece' };
        }

        // Simular movimiento para verificar jaque
        const boardCopy = board.map(row => [...row]);
        this.executeMove(boardCopy, from, to, piece, 'Q', lastMove);

        if (this.isKingInCheck(boardCopy, currentTurn)) {
            return { valid: false, reason: 'Move leaves king in check' };
        }

        return { valid: true };
    }

    isValidMoveForPiece(board, from, to, piece, lastMove) {
        const pieceType = piece.toLowerCase();

        switch (pieceType) {
            case 'p': return this.isValidPawnMove(board, from, to, piece, lastMove);
            case 'r': return this.isValidRookMove(board, from, to);
            case 'n': return this.isValidKnightMove(from, to);
            case 'b': return this.isValidBishopMove(board, from, to);
            case 'q': return this.isValidQueenMove(board, from, to);
            case 'k': return this.isValidKingMove(board, from, to, piece);
            default: return false;
        }
    }

    isValidPawnMove(board, from, to, piece, lastMove) {
        const direction = piece === piece.toUpperCase() ? -1 : 1;
        const startRow = piece === piece.toUpperCase() ? 6 : 1;
        const rowDiff = to.row - from.row;
        const colDiff = Math.abs(to.col - from.col);

        // Movimiento hacia adelante
        if (colDiff === 0 && board[to.row][to.col] === '.') {
            if (rowDiff === direction) return true;
            if (from.row === startRow && rowDiff === 2 * direction &&
                board[from.row + direction][from.col] === '.') return true;
        }

        // Captura diagonal
        if (colDiff === 1 && rowDiff === direction) {
            if (board[to.row][to.col] !== '.') return true;

            // Captura al paso
            if (lastMove && lastMove.piece.toLowerCase() === 'p') {
                const lastMoveRowDiff = Math.abs(lastMove.to.row - lastMove.from.row);
                if (lastMoveRowDiff === 2 && lastMove.to.col === to.col) {
                    const expectedRow = piece === 'P' ? 3 : 4;
                    if (from.row === expectedRow && lastMove.to.row === from.row) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    isValidRookMove(board, from, to) {
        if (from.row !== to.row && from.col !== to.col) return false;
        return this.isPathClear(board, from, to);
    }

    isValidKnightMove(from, to) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);
        return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    }

    isValidBishopMove(board, from, to) {
        if (Math.abs(to.row - from.row) !== Math.abs(to.col - from.col)) return false;
        return this.isPathClear(board, from, to);
    }

    isValidQueenMove(board, from, to) {
        return this.isValidRookMove(board, from, to) || this.isValidBishopMove(board, from, to);
    }

    isValidKingMove(board, from, to, piece) {
        const rowDiff = Math.abs(to.row - from.row);
        const colDiff = Math.abs(to.col - from.col);

        if (rowDiff <= 1 && colDiff <= 1) return true;

        // Enroque
        if (rowDiff === 0 && colDiff === 2) {
            return this.canCastle(board, from, to, piece);
        }

        return false;
    }

    canCastle(board, from, to, piece) {
        const isWhite = piece === 'K';
        const row = isWhite ? 7 : 0;

        if ((isWhite && this.whiteKingMoved) || (!isWhite && this.blackKingMoved)) {
            return false;
        }

        if (this.isKingInCheck(board, isWhite ? 'white' : 'black')) {
            return false;
        }

        const colDiff = to.col - from.col;

        if (colDiff === 2) {
            if ((isWhite && this.whiteRookKingsideMoved) || (!isWhite && this.blackRookKingsideMoved)) {
                return false;
            }

            if (board[row][5] !== '.' || board[row][6] !== '.') return false;

            return !this.isSquareUnderAttack(board, row, 5, isWhite ? 'white' : 'black') &&
                !this.isSquareUnderAttack(board, row, 6, isWhite ? 'white' : 'black');

        } else if (colDiff === -2) {
            if ((isWhite && this.whiteRookQueensideMoved) || (!isWhite && this.blackRookQueensideMoved)) {
                return false;
            }

            if (board[row][1] !== '.' || board[row][2] !== '.' || board[row][3] !== '.') {
                return false;
            }

            return !this.isSquareUnderAttack(board, row, 2, isWhite ? 'white' : 'black') &&
                !this.isSquareUnderAttack(board, row, 3, isWhite ? 'white' : 'black');
        }

        return false;
    }

    isPathClear(board, from, to) {
        const rowStep = Math.sign(to.row - from.row);
        const colStep = Math.sign(to.col - from.col);
        let currentRow = from.row + rowStep;
        let currentCol = from.col + colStep;

        while (currentRow !== to.row || currentCol !== to.col) {
            if (board[currentRow][currentCol] !== '.') return false;
            currentRow += rowStep;
            currentCol += colStep;
        }

        return true;
    }

    executeMove(board, from, to, piece, promotion, lastMove) {
        const pieceType = piece.toLowerCase();

        // Enroque
        if (pieceType === 'k') {
            const colDiff = to.col - from.col;
            if (Math.abs(colDiff) === 2) {
                board[to.row][to.col] = piece;
                board[from.row][from.col] = '.';

                if (colDiff === 2) {
                    board[to.row][5] = board[to.row][7];
                    board[to.row][7] = '.';
                } else {
                    board[to.row][3] = board[to.row][0];
                    board[to.row][0] = '.';
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
            if (colDiff === 1 && board[to.row][to.col] === '.') {
                const capturedPawnRow = piece === 'P' ? to.row + 1 : to.row - 1;
                board[capturedPawnRow][to.col] = '.';
            }

            // Promoción
            const promotionRow = piece === 'P' ? 0 : 7;
            if (to.row === promotionRow) {
                board[to.row][to.col] = piece === 'P' ? promotion.toUpperCase() : promotion.toLowerCase();
                board[from.row][from.col] = '.';
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
        board[to.row][to.col] = piece;
        board[from.row][from.col] = '.';
    }

    findKing(board, color) {
        const kingPiece = color === 'white' ? 'K' : 'k';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (board[row][col] === kingPiece) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    isKingInCheck(board, color) {
        const kingPos = this.findKing(board, color);
        if (!kingPos) return false;
        return this.isSquareUnderAttack(board, kingPos.row, kingPos.col, color);
    }

    isSquareUnderAttack(board, row, col, defenderColor) {
        const isDefenderWhite = defenderColor === 'white';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece === '.') continue;

                const isPieceWhite = piece === piece.toUpperCase();
                if (isPieceWhite === isDefenderWhite) continue;

                if (this.canPieceAttackSquare(board, r, c, row, col, piece)) {
                    return true;
                }
            }
        }

        return false;
    }

    canPieceAttackSquare(board, fromRow, fromCol, toRow, toCol, piece) {
        const pieceType = piece.toLowerCase();
        const from = { row: fromRow, col: fromCol };
        const to = { row: toRow, col: toCol };

        switch (pieceType) {
            case 'p':
                return this.canPawnAttack(from, to, piece);
            case 'n':
                return this.isValidKnightMove(from, to);
            case 'b':
                return this.isValidBishopMove(board, from, to);
            case 'r':
                return this.isValidRookMove(board, from, to);
            case 'q':
                return this.isValidQueenMove(board, from, to);
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

    hasLegalMoves(board, color, lastMove) {
        const isWhite = color === 'white';

        for (let fromRow = 0; fromRow < 8; fromRow++) {
            for (let fromCol = 0; fromCol < 8; fromCol++) {
                const piece = board[fromRow][fromCol];
                if (piece === '.') continue;

                const isPieceWhite = piece === piece.toUpperCase();
                if (isPieceWhite !== isWhite) continue;

                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        const moveValidation = this.validateMove(
                            board,
                            { row: fromRow, col: fromCol },
                            { row: toRow, col: toCol },
                            piece,
                            lastMove,
                            color
                        );

                        if (moveValidation.valid) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }
}

module.exports = ChessLogic;