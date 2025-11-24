class Clock {
    constructor(timeControl) {
        this.timeControl = timeControl;
        this.whiteTime = timeControl.minutes * 60 * 1000;
        this.blackTime = timeControl.minutes * 60 * 1000;
        this.lastMoveTime = null;
        this.interval = null;
        this.currentTurn = 'white';
    }

    start(onTimeout) {
        if (this.interval) return;

        this.lastMoveTime = Date.now();

        this.interval = setInterval(() => {
            const elapsed = 100; // 100ms por tick

            if (this.currentTurn === 'white') {
                this.whiteTime -= elapsed;
                if (this.whiteTime <= 0) {
                    this.whiteTime = 0;
                    this.stop();
                    if (onTimeout) onTimeout('white', 'timeout');
                }
            } else {
                this.blackTime -= elapsed;
                if (this.blackTime <= 0) {
                    this.blackTime = 0;
                    this.stop();
                    if (onTimeout) onTimeout('black', 'timeout');
                }
            }
        }, 100);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    recordMove(color) {
        if (this.lastMoveTime) {
            const elapsed = Date.now() - this.lastMoveTime;

            if (color === 'white') {
                this.whiteTime -= elapsed;
                this.whiteTime += this.timeControl.increment * 1000;
            } else {
                this.blackTime -= elapsed;
                this.blackTime += this.timeControl.increment * 1000;
            }
        }

        this.lastMoveTime = Date.now();
        this.currentTurn = color === 'white' ? 'black' : 'white';
    }

    getWhiteTime() {
        return Math.max(0, this.whiteTime);
    }

    getBlackTime() {
        return Math.max(0, this.blackTime);
    }

    getCurrentTurn() {
        return this.currentTurn;
    }

    setTurn(color) {
        this.currentTurn = color;
    }

    // Método útil para testing
    setTime(color, milliseconds) {
        if (color === 'white') {
            this.whiteTime = milliseconds;
        } else {
            this.blackTime = milliseconds;
        }
    }
}

module.exports = Clock;