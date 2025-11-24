const ChessLogic = require('../../src/game/ChessLogic');

describe('ChessLogic - Validación de Movimientos', () => {
    let chessLogic;
    let board;

    beforeEach(() => {
        chessLogic = new ChessLogic();
        // Tablero inicial
        board = [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['.', '.', '.', '.', '.', '.', '.', '.'],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
    });

    describe('Movimientos de Torre', () => {
        test('debe permitir movimiento vertical válido de torre blanca', () => {
            // Arrange: limpiar camino para la torre
            board[6][0] = '.'; // quitar peón
            board[5][0] = '.';

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 7, col: 0 },
                { row: 5, col: 0 },
                'R',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });

        test('debe permitir movimiento horizontal válido de torre', () => {
            // Arrange: tablero vacío con torre en el centro
            const emptyBoard = Array(8).fill(null).map(() => Array(8).fill('.'));
            emptyBoard[4][4] = 'R';
            emptyBoard[7][4] = 'K'; // Rey blanco

            // Act
            const result = chessLogic.validateMove(
                emptyBoard,
                { row: 4, col: 4 },
                { row: 4, col: 7 },
                'R',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });

        test('debe rechazar movimiento diagonal de torre', () => {
            // Arrange
            board[6][0] = '.';

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 7, col: 0 },
                { row: 5, col: 2 },
                'R',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(false);
        });

        test('debe rechazar movimiento bloqueado por pieza', () => {
            // Arrange: torre con peón delante (posición inicial)

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 7, col: 0 },
                { row: 5, col: 0 },
                'R',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Invalid move for piece');
        });
    });

    describe('Movimientos de Caballo', () => {
        test('debe permitir movimiento en L válido', () => {
            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 7, col: 1 },
                { row: 5, col: 2 },
                'N',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });

        test('debe rechazar movimiento no-L del caballo', () => {
            // Arrange
            board[6][1] = '.'; // quitar peón

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 7, col: 1 },
                { row: 5, col: 1 },
                'N',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(false);
        });

        test('caballo puede saltar sobre piezas', () => {
            // Arrange: posición inicial (hay peones delante)

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 7, col: 1 },
                { row: 5, col: 0 },
                'N',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });
    });

    describe('Detección de Jaque', () => {
        test('debe detectar jaque al rey blanco', () => {
            // Arrange: torre negra atacando rey blanco
            const testBoard = Array(8).fill(null).map(() => Array(8).fill('.'));
            testBoard[0][0] = 'K'; // rey blanco
            testBoard[0][7] = 'r'; // torre negra
            testBoard[7][7] = 'k'; // rey negro

            // Act
            const isCheck = chessLogic.isKingInCheck(testBoard, 'white');

            // Assert
            expect(isCheck).toBe(true);
        });

        test('debe detectar cuando NO hay jaque', () => {
            // Arrange: reyes separados
            const testBoard = Array(8).fill(null).map(() => Array(8).fill('.'));
            testBoard[0][0] = 'K';
            testBoard[7][7] = 'k';

            // Act
            const isCheck = chessLogic.isKingInCheck(testBoard, 'white');

            // Assert
            expect(isCheck).toBe(false);
        });

        test('no debe permitir movimiento que deje al rey en jaque', () => {
            // Arrange: rey blanco en e1, torre negra en e8, alfil blanco en e2
            const testBoard = Array(8).fill(null).map(() => Array(8).fill('.'));
            testBoard[7][4] = 'K'; // e1
            testBoard[0][4] = 'r'; // e8
            testBoard[6][4] = 'B'; // e2 - bloqueando el jaque
            testBoard[7][7] = 'k'; // rey negro

            // Act: intentar mover el alfil que bloquea
            const result = chessLogic.validateMove(
                testBoard,
                { row: 6, col: 4 },
                { row: 5, col: 3 },
                'B',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('Move leaves king in check');
        });
    });

    describe('Movimientos de Peón', () => {
        test('debe permitir avance simple de peón', () => {
            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 6, col: 4 },
                { row: 5, col: 4 },
                'P',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });

        test('debe permitir avance doble desde posición inicial', () => {
            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 6, col: 4 },
                { row: 4, col: 4 },
                'P',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });

        test('debe permitir captura diagonal', () => {
            // Arrange
            board[5][5] = 'p'; // peón negro para capturar

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 6, col: 4 },
                { row: 5, col: 5 },
                'P',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });

        test('no debe permitir captura hacia adelante', () => {
            // Arrange
            board[5][4] = 'p'; // peón negro directamente adelante

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 6, col: 4 },
                { row: 5, col: 4 },
                'P',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(false);
        });
    });

    describe('Captura al Paso', () => {
        test('debe permitir captura al paso', () => {
            // Arrange: peón blanco en fila 5, peón negro acaba de avanzar 2
            const testBoard = Array(8).fill(null).map(() => Array(8).fill('.'));
            testBoard[3][4] = 'P'; // peón blanco en e5
            testBoard[3][5] = 'p'; // peón negro en f5
            testBoard[0][0] = 'K';
            testBoard[7][7] = 'k';

            const lastMove = {
                from: { row: 1, col: 5 },
                to: { row: 3, col: 5 },
                piece: 'p'
            };

            // Act
            const result = chessLogic.validateMove(
                testBoard,
                { row: 3, col: 4 },
                { row: 2, col: 5 },
                'P',
                lastMove,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });
    });

    describe('Enroque', () => {
        test('debe permitir enroque corto cuando es válido', () => {
            // Arrange: limpiar espacio entre rey y torre
            board[7][5] = '.'; // alfil
            board[7][6] = '.'; // caballo

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 7, col: 4 },
                { row: 7, col: 6 },
                'K',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(true);
        });

        test('no debe permitir enroque si el rey está en jaque', () => {
            // Arrange
            board[7][5] = '.';
            board[7][6] = '.';
            board[0][4] = 'r'; // torre negra atacando rey

            // Act
            const result = chessLogic.validateMove(
                board,
                { row: 7, col: 4 },
                { row: 7, col: 6 },
                'K',
                null,
                'white'
            );

            // Assert
            expect(result.valid).toBe(false);
        });
    });

    describe('Detección de Jaque Mate', () => {
        test('debe detectar que no hay movimientos legales en jaque mate', () => {
            // Arrange: mate del pastor simplificado
            const testBoard = Array(8).fill(null).map(() => Array(8).fill('.'));
            testBoard[7][4] = 'K'; // rey blanco en e1
            testBoard[6][5] = 'q'; // reina negra en f2 (jaque mate)
            testBoard[5][4] = 'r'; // torre negra en e3 (apoyo)
            testBoard[0][0] = 'k'; // rey negro

            // Act
            const hasLegalMoves = chessLogic.hasLegalMoves(testBoard, 'white', null);

            // Assert
            expect(hasLegalMoves).toBe(false);
        });

        test('debe detectar que SÍ hay movimientos legales cuando no es mate', () => {
            // Arrange: tablero inicial

            // Act
            const hasLegalMoves = chessLogic.hasLegalMoves(board, 'white', null);

            // Assert
            expect(hasLegalMoves).toBe(true);
        });
    });
});