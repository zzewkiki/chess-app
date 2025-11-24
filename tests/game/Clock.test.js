const Clock = require('../../src/game/Clock');

describe('Clock - Lógica del Reloj de Ajedrez', () => {
    let clock;

    beforeEach(() => {
        const timeControl = { minutes: 5, increment: 0 };
        clock = new Clock(timeControl);
    });

    afterEach(() => {
        clock.stop();
    });

    describe('Inicialización', () => {
        test('debe inicializar con el tiempo correcto', () => {
            // Assert
            expect(clock.getWhiteTime()).toBe(5 * 60 * 1000); // 5 minutos en ms
            expect(clock.getBlackTime()).toBe(5 * 60 * 1000);
        });

        test('debe inicializar con turno de blancas', () => {
            // Assert
            expect(clock.getCurrentTurn()).toBe('white');
        });
    });

    describe('Decremento de Tiempo', () => {
        test('debe decrementar tiempo del jugador activo', (done) => {
            // Arrange
            const initialTime = clock.getWhiteTime();

            // Act
            clock.start();

            // Assert: verificar después de 250ms
            setTimeout(() => {
                clock.stop();
                const finalTime = clock.getWhiteTime();
                expect(finalTime).toBeLessThan(initialTime);
                expect(initialTime - finalTime).toBeGreaterThanOrEqual(200);
                done();
            }, 250);
        });

        test('no debe decrementar tiempo del jugador inactivo', (done) => {
            // Arrange
            const initialBlackTime = clock.getBlackTime();

            // Act
            clock.start();

            // Assert
            setTimeout(() => {
                clock.stop();
                expect(clock.getBlackTime()).toBe(initialBlackTime);
                done();
            }, 250);
        });
    });

    describe('Cambio de Turno', () => {
        test('debe cambiar de turno después de recordMove', () => {
            // Arrange
            expect(clock.getCurrentTurn()).toBe('white');

            // Act
            clock.recordMove('white');

            // Assert
            expect(clock.getCurrentTurn()).toBe('black');
        });

        test('debe aplicar incremento después de movimiento', () => {
            // Arrange
            const timeControl = { minutes: 5, increment: 3 };
            const clockWithIncrement = new Clock(timeControl);
            const initialTime = clockWithIncrement.getWhiteTime();

            // Simular tiempo transcurrido
            clockWithIncrement.setTime('white', initialTime - 10000); // -10 segundos

            // Act
            clockWithIncrement.recordMove('white');

            // Assert
            const finalTime = clockWithIncrement.getWhiteTime();
            expect(finalTime).toBeGreaterThan(initialTime - 10000);
            expect(finalTime).toBe(initialTime - 10000 + 3000); // +3 segundos de incremento
        });
    });

    describe('Detección de Derrota por Tiempo', () => {
        test('debe detectar derrota cuando el tiempo llega a 0', (done) => {
            // Arrange
            clock.setTime('white', 150); // 150ms restantes
            let timeoutCalled = false;
            let timeoutColor = null;

            // Act
            clock.start((color, reason) => {
                timeoutCalled = true;
                timeoutColor = color;
            });

            // Assert
            setTimeout(() => {
                expect(timeoutCalled).toBe(true);
                expect(timeoutColor).toBe('white');
                expect(clock.getWhiteTime()).toBe(0);
                done();
            }, 300);
        });

        test('debe detener el reloj automáticamente en timeout', (done) => {
            // Arrange
            clock.setTime('white', 100);

            // Act
            clock.start((color, reason) => {
                // Assert
                expect(clock.interval).toBeNull();
                done();
            });
        });
    });

    describe('Control Manual del Reloj', () => {
        test('debe poder iniciar el reloj', () => {
            // Act
            clock.start();

            // Assert
            expect(clock.interval).not.toBeNull();
            clock.stop();
        });

        test('debe poder detener el reloj', () => {
            // Arrange
            clock.start();

            // Act
            clock.stop();

            // Assert
            expect(clock.interval).toBeNull();
        });

        test('no debe iniciar múltiples intervalos', () => {
            // Act
            clock.start();
            const firstInterval = clock.interval;
            clock.start();
            const secondInterval = clock.interval;

            // Assert
            expect(firstInterval).toBe(secondInterval);
            clock.stop();
        });
    });

    describe('Getter y Setter de Tiempo', () => {
        test('debe retornar 0 si el tiempo es negativo', () => {
            // Arrange
            clock.setTime('white', -1000);

            // Act & Assert
            expect(clock.getWhiteTime()).toBe(0);
        });

        test('debe poder establecer tiempo manualmente', () => {
            // Arrange
            const newTime = 120000; // 2 minutos

            // Act
            clock.setTime('black', newTime);

            // Assert
            expect(clock.getBlackTime()).toBe(newTime);
        });
    });

    describe('Escenarios de Integración', () => {
        test('debe manejar múltiples movimientos correctamente', () => {
            // Arrange
            const initialWhite = clock.getWhiteTime();
            const initialBlack = clock.getBlackTime();

            // Act: simular varios movimientos
            clock.recordMove('white'); // turno pasa a negro
            clock.recordMove('black'); // turno pasa a blanco
            clock.recordMove('white'); // turno pasa a negro

            // Assert
            expect(clock.getCurrentTurn()).toBe('black');
            // Los tiempos deben haber cambiado por el elapsed time simulado
            expect(clock.getWhiteTime()).toBeLessThanOrEqual(initialWhite);
            expect(clock.getBlackTime()).toBeLessThanOrEqual(initialBlack);
        });

        test('debe mantener tiempos correctos con incremento', () => {
            // Arrange
            const timeControl = { minutes: 1, increment: 2 };
            const incrementClock = new Clock(timeControl);
            const initialTime = 60000; // 1 minuto

            incrementClock.setTime('white', initialTime);
            incrementClock.setTime('black', initialTime);

            // Act: blancas "gastan" 5 segundos y mueven
            incrementClock.lastMoveTime = Date.now() - 5000;
            incrementClock.recordMove('white');

            // Assert
            // Tiempo debería ser: 60000 - 5000 + 2000 = 57000
            expect(incrementClock.getWhiteTime()).toBe(57000);
            expect(incrementClock.getCurrentTurn()).toBe('black');
        });
    });
});