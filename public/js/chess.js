// Conexión con Socket.io
const socket = io();

// Estado global del juego
const gameState = {
    gameId: null,
    playerColor: null,
    board: null,
    currentTurn: 'white',
    selectedSquare: null,
    timeControl: null,
    whiteTime: 0,
    blackTime: 0
};

// Elementos del DOM
const lobbyScreen = document.getElementById('lobby');
const gameScreen = document.getElementById('game');
const gameOverScreen = document.getElementById('gameOver');

const createGameBtn = document.getElementById('createGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const gameIdInput = document.getElementById('gameIdInput');
const gameIdDisplay = document.getElementById('gameIdDisplay');
const gameIdText = document.getElementById('gameIdText');
const copyGameIdBtn = document.getElementById('copyGameId');
const resignBtn = document.getElementById('resignBtn');
const newGameBtn = document.getElementById('newGameBtn');

const minutesInput = document.getElementById('minutes');
const incrementInput = document.getElementById('increment');
const presetButtons = document.querySelectorAll('.preset-btn');

const turnIndicator = document.getElementById('turnIndicator');
const winnerText = document.getElementById('winnerText');

// Event Listeners para presets de tiempo
presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        minutesInput.value = btn.dataset.time;
        incrementInput.value = btn.dataset.increment;
    });
});

// Crear partida
createGameBtn.addEventListener('click', () => {
    const minutes = parseInt(minutesInput.value);
    const increment = parseInt(incrementInput.value);

    if (isNaN(minutes) || minutes < 1) {
        alert('Por favor ingresa un tiempo válido (mínimo 1 minuto)');
        return;
    }

    const timeControl = { minutes, increment };
    socket.emit('createGame', { timeControl });
});

// Unirse a partida
joinGameBtn.addEventListener('click', () => {
    const gameId = gameIdInput.value.trim();

    if (!gameId) {
        alert('Por favor ingresa un código de partida');
        return;
    }

    socket.emit('joinGame', { gameId });
});

// Copiar código de partida
copyGameIdBtn.addEventListener('click', () => {
    const textToCopy = gameIdText.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
        copyGameIdBtn.textContent = '✓ Copiado!';
        setTimeout(() => {
            copyGameIdBtn.textContent = '📋 Copiar';
        }, 2000);
    });
});

// Rendirse
resignBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres rendirte?')) {
        const winner = gameState.playerColor === 'white' ? 'black' : 'white';
        showGameOver(winner, 'resign');
    }
});

// Nueva partida
newGameBtn.addEventListener('click', () => {
    location.reload();
});

// Socket Events
socket.on('gameCreated', ({ gameId, color, board, timeControl }) => {
    gameState.gameId = gameId;
    gameState.playerColor = color;
    gameState.board = board;
    gameState.timeControl = timeControl;

    gameIdText.textContent = gameId;
    gameIdDisplay.style.display = 'block';
    createGameBtn.disabled = true;

    console.log('Partida creada:', gameId);
});

socket.on('gameJoined', ({ gameId, color, board, timeControl }) => {
    gameState.gameId = gameId;
    gameState.playerColor = color;
    gameState.board = board;
    gameState.timeControl = timeControl;

    console.log('Unido a partida:', gameId);
});

socket.on('gameStart', ({ board, currentTurn, whiteTime, blackTime }) => {
    gameState.board = board;
    gameState.currentTurn = currentTurn;
    gameState.whiteTime = whiteTime;
    gameState.blackTime = blackTime;

    showScreen('game');
    initBoard(board);
    updateTimer('white', whiteTime);
    updateTimer('black', blackTime);
    updateTurnIndicator(currentTurn);

    console.log('¡Juego iniciado!');
});

socket.on('moveMade', ({ board, from, to, currentTurn, whiteTime, blackTime }) => {
    gameState.board = board;
    gameState.currentTurn = currentTurn;
    gameState.whiteTime = whiteTime;
    gameState.blackTime = blackTime;

    updateBoard(board);
    updateTurnIndicator(currentTurn);
    clearSelection();

    // Actualizar indicador de turno activo
    updateActivePlayer(currentTurn);
});

socket.on('timeUpdate', ({ whiteTime, blackTime }) => {
    updateTimer('white', whiteTime);
    updateTimer('black', blackTime);
});

socket.on('gameOver', ({ winner, reason }) => {
    showGameOver(winner, reason);
});

socket.on('playerDisconnected', () => {
    alert('El otro jugador se ha desconectado');
    location.reload();
});

socket.on('invalidMove', ({ reason }) => {
    console.log('Movimiento inválido:', reason);
    clearSelection();
});

socket.on('error', ({ message }) => {
    alert('Error: ' + message);
});

// Funciones auxiliares
function showScreen(screenName) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    if (screenName === 'lobby') lobbyScreen.classList.add('active');
    if (screenName === 'game') gameScreen.classList.add('active');
    if (screenName === 'gameOver') gameOverScreen.classList.add('active');
}

function updateTurnIndicator(turn) {
    const turnText = turn === 'white' ? 'Blancas' : 'Negras';
    turnIndicator.textContent = `Turno de las ${turnText}`;

    updateActivePlayer(turn);
}

function updateActivePlayer(turn) {
    const topPlayer = document.getElementById('topPlayer');
    const bottomPlayer = document.getElementById('bottomPlayer');

    topPlayer.classList.remove('active');
    bottomPlayer.classList.remove('active');

    if (gameState.playerColor === 'white') {
        if (turn === 'white') {
            bottomPlayer.classList.add('active');
        } else {
            topPlayer.classList.add('active');
        }
    } else {
        if (turn === 'black') {
            bottomPlayer.classList.add('active');
        } else {
            topPlayer.classList.add('active');
        }
    }
}

function showGameOver(winner, reason) {
    let message = '';

    if (reason === 'timeout') {
        message = `¡${winner === 'white' ? 'Blancas' : 'Negras'} ganan por tiempo!`;
    } else if (reason === 'resign') {
        message = `¡${winner === 'white' ? 'Blancas' : 'Negras'} ganan por rendición!`;
    } else {
        message = `¡${winner === 'white' ? 'Blancas' : 'Negras'} ganan!`;
    }

    winnerText.textContent = message;
    showScreen('gameOver');
}

function clearSelection() {
    gameState.selectedSquare = null;
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'valid-move', 'has-piece');
    });
}