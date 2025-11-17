// Manejo del reloj de ajedrez

const whiteTimerElement = document.getElementById('whiteTimer');
const blackTimerElement = document.getElementById('blackTimer');

// Formatear tiempo en milisegundos a MM:SS
function formatTime(milliseconds) {
    if (milliseconds < 0) milliseconds = 0;

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Actualizar el reloj visual
function updateTimer(color, time) {
    const timerElement = color === 'white' ? whiteTimerElement : blackTimerElement;
    const formattedTime = formatTime(time);

    timerElement.textContent = formattedTime;

    // Advertencia de tiempo bajo (menos de 20 segundos)
    if (time < 20000) {
        timerElement.classList.add('low-time');
    } else {
        timerElement.classList.remove('low-time');
    }

    // Guardar tiempo en el estado global
    if (color === 'white') {
        gameState.whiteTime = time;
    } else {
        gameState.blackTime = time;
    }
}