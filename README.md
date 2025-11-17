Necesito que me ayudes a construir una web simple para jugar ajedrez que incluya FRONTEND y BACKEND
🎯 Objetivo del proyecto

Crear una aplicación web funcional donde dos jugadores puedan jugar ajedrez con:

tablero interactivo

tiempo establecido o personalizado

sincronización en tiempo real

dos jugadores en diferentes pestañas navegando

1. Requerimientos técnicos obligatorios
🖥️ Frontend

HTML, CSS y JavaScript (sin frameworks, salvo recomendación).

Tablero de ajedrez arrastrable o clic-para-mover.

Validación de movimientos reales.

UI simple y clara.

Reloj de ajedrez

Implementar un reloj de ajedrez con:

tiempos predefinidos (1+0, 3+0, 5+0, 10+0, etc.)

tiempos personalizados ingresados por el usuario

decremento del tiempo por cada jugador

pausa automática cuando el rival mueve

detección de derrota por tiempo

actualización del tablero y del reloj en tiempo real

🛠️ Backend

Node.js + Express.

Servidor con Socket.io para tiempo real.

Debe permitir:

crear o unirse a una partida

enviar y recibir movimientos

guardar y sincronizar el estado del tablero

manejar el estado del tiempo de cada jugador

detectar fin de partida por tiempo

🔌 Comunicación

WebSockets mediante Socket.io.

Enviar en cada movimiento:

pieza movida

posición nueva

tiempo restante

2. Entregables que quiero
✔️ A. Estructura completa del proyecto

Carpetas + archivos.

✔️ B. Código del frontend

HTML, CSS, JS separados.
Incluye el componente del reloj de ajedrez.

✔️ C. Código del backend

Lógica del servidor, sockets, manejo del reloj y estados de partida.

✔️ D. Instrucciones para ejecutarlo
