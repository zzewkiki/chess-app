// Símbolos Unicode para las piezas de ajedrez
const pieceSymbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Inicializar el tablero
function initBoard(board) {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';

    // Ajustar la orientación del tablero según el color del jugador
    const isWhite = gameState.playerColor === 'white';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const displayRow = isWhite ? row : 7 - row;
            const displayCol = isWhite ? col : 7 - col;

            const square = document.createElement('div');
            square.classList.add('square');

            // Alternar colores
            if ((displayRow + displayCol) % 2 === 0) {
                square.classList.add('light');
            } else {
                square.classList.add('dark');
            }

            // Añadir pieza si existe
            const piece = board[row][col];
            if (piece !== '.') {
                square.textContent = pieceSymbols[piece];
            }

            // Guardar posición en el dataset
            square.dataset.row = row;
            square.dataset.col = col;

            // Event listener para clicks
            square.addEventListener('click', () => handleSquareClick(row, col));

            chessboard.appendChild(square);
        }
    }
}

// Actualizar el tablero
function updateBoard(board) {
    const squares = document.querySelectorAll('.square');

    squares.forEach(square => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = board[row][col];

        if (piece !== '.') {
            square.textContent = pieceSymbols[piece];
        } else {
            square.textContent = '';
        }
    });
}

// Manejar clicks en el tablero
function handleSquareClick(row, col) {
    // Verificar si es el turno del jugador
    if (gameState.currentTurn !== gameState.playerColor) {
        console.log('No es tu turno');
        return;
    }

    const piece = gameState.board[row][col];

    // Si no hay pieza seleccionada
    if (gameState.selectedSquare === null) {
        // Verificar que la pieza pertenezca al jugador
        if (piece === '.') return;

        const isWhitePiece = piece === piece.toUpperCase();
        const playerIsWhite = gameState.playerColor === 'white';

        if (isWhitePiece !== playerIsWhite) {
            console.log('No es tu pieza');
            return;
        }

        // Seleccionar pieza
        selectSquare(row, col);
        showValidMoves(row, col, piece);
    } else {
        // Si se seleccionó la misma casilla, deseleccionar
        if (gameState.selectedSquare.row === row && gameState.selectedSquare.col === col) {
            clearSelection();
            return;
        }

        // Intentar mover la pieza
        makeMove(gameState.selectedSquare, { row, col });
    }
}

// Seleccionar una casilla
function selectSquare(row, col) {
    clearSelection();

    gameState.selectedSquare = { row, col };

    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        const squareRow = parseInt(square.dataset.row);
        const squareCol = parseInt(square.dataset.col);

        if (squareRow === row && squareCol === col) {
            square.classList.add('selected');
        }
    });
}

// Mostrar movimientos válidos (versión simplificada)
function showValidMoves(row, col, piece) {
    const validMoves = getValidMoves(row, col, piece);

    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        const squareRow = parseInt(square.dataset.row);
        const squareCol = parseInt(square.dataset.col);

        const isValid = validMoves.some(move => move.row === squareRow && move.col === squareCol);

        if (isValid) {
            square.classList.add('valid-move');

            // Si hay una pieza enemiga, añadir clase especial
            if (gameState.board[squareRow][squareCol] !== '.') {
                square.classList.add('has-piece');
            }
        }
    });
}

// Obtener movimientos válidos básicos
function getValidMoves(row, col, piece) {
    const moves = [];
    const pieceType = piece.toLowerCase();
    const isWhite = piece === piece.toUpperCase();

    // Direcciones básicas
    const directions = {
        rook: [[0,1], [0,-1], [1,0], [-1,0]],
        bishop: [[1,1], [1,-1], [-1,1], [-1,-1]],
        queen: [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]],
        king: [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]],
        knight: [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]]
    };

    switch (pieceType) {
        case 'p':
            return getPawnMoves(row, col, isWhite);
        case 'n':
            return getKnightMoves(row, col, isWhite);
        case 'r':
            return getSlidingMoves(row, col, isWhite, directions.rook);
        case 'b':
            return getSlidingMoves(row, col, isWhite, directions.bishop);
        case 'q':
            return getSlidingMoves(row, col, isWhite, directions.queen);
        case 'k':
            return getKingMoves(row, col, isWhite);
    }

    return moves;
}

function getPawnMoves(row, col, isWhite) {
    const moves = [];
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;

    // Movimiento hacia adelante
    if (isInBounds(row + direction, col) && gameState.board[row + direction][col] === '.') {
        moves.push({ row: row + direction, col });

        // Doble movimiento desde posición inicial
        if (row === startRow && gameState.board[row + 2 * direction][col] === '.') {
            moves.push({ row: row + 2 * direction, col });
        }
    }

    // Capturas diagonales
    [-1, 1].forEach(colOffset => {
        const newRow = row + direction;
        const newCol = col + colOffset;

        if (isInBounds(newRow, newCol)) {
            const targetPiece = gameState.board[newRow][newCol];
            if (targetPiece !== '.') {
                const targetIsWhite = targetPiece === targetPiece.toUpperCase();
                if (targetIsWhite !== isWhite) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
    });

    return moves;
}

function getKnightMoves(row, col, isWhite) {
    const moves = [];
    const knightMoves = [[2,1], [2,-1], [-2,1], [-2,-1], [1,2], [1,-2], [-1,2], [-1,-2]];

    knightMoves.forEach(([rowOffset, colOffset]) => {
        const newRow = row + rowOffset;
        const newCol = col + colOffset;

        if (isInBounds(newRow, newCol)) {
            const targetPiece = gameState.board[newRow][newCol];
            if (targetPiece === '.') {
                moves.push({ row: newRow, col: newCol });
            } else {
                const targetIsWhite = targetPiece === targetPiece.toUpperCase();
                if (targetIsWhite !== isWhite) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
    });

    return moves;
}

function getSlidingMoves(row, col, isWhite, directions) {
    const moves = [];

    directions.forEach(([rowDir, colDir]) => {
        let newRow = row + rowDir;
        let newCol = col + colDir;

        while (isInBounds(newRow, newCol)) {
            const targetPiece = gameState.board[newRow][newCol];

            if (targetPiece === '.') {
                moves.push({ row: newRow, col: newCol });
            } else {
                const targetIsWhite = targetPiece === targetPiece.toUpperCase();
                if (targetIsWhite !== isWhite) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }

            newRow += rowDir;
            newCol += colDir;
        }
    });

    return moves;
}

function getKingMoves(row, col, isWhite) {
    const moves = [];
    const kingMoves = [[0,1], [0,-1], [1,0], [-1,0], [1,1], [1,-1], [-1,1], [-1,-1]];

    kingMoves.forEach(([rowOffset, colOffset]) => {
        const newRow = row + rowOffset;
        const newCol = col + colOffset;

        if (isInBounds(newRow, newCol)) {
            const targetPiece = gameState.board[newRow][newCol];
            if (targetPiece === '.') {
                moves.push({ row: newRow, col: newCol });
            } else {
                const targetIsWhite = targetPiece === targetPiece.toUpperCase();
                if (targetIsWhite !== isWhite) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
    });

    return moves;
}

function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Hacer un movimiento
function makeMove(from, to) {
    socket.emit('makeMove', {
        gameId: gameState.gameId,
        from,
        to
    });
}