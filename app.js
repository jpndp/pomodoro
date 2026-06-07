import TimerState from './timer.js';
import TaskManager from './task-manager.js';

document.addEventListener('DOMContentLoaded', () => {
    const timer = new TimerState({
        workMinutes: 25,
        breakMinutes: 5
    });
    const elements = {
        modeDisplay: document.getElementById('modeLabel'),
        startButton: document.getElementById('start'),
        timerDisplay: document.querySelector('.timer-display'),
        pauseButton: document.getElementById('pause'),
        resetButton: document.getElementById('reset'),
        workDuration: document.getElementById('workDuration'),
        breakDuration: document.getElementById('breakDuration'),
        sessionCount: document.getElementById('sessionCount'),
        progressRing: document.querySelector('.progress-ring'),
        newTaskInput: document.getElementById('newTaskInput'),
        taskList: document.getElementById('taskList'),
        modeToggle: document.getElementById('modeToggle'),
    };
    document.body.classList.add('work-mode');

    const taskManager = new TaskManager('taskList', 'newTaskInput');

    let lastState = {};

    function _updateTimeDisplay(state) {
        const minutes = Math.floor(state.timeRemaining / 60).toString().padStart(2, '0');
        const seconds = (state.timeRemaining % 60).toString().padStart(2, '0');
        if (elements.timerDisplay) {
            elements.timerDisplay.textContent = `${minutes}:${seconds}`;
        }
    }

    function _updateThemeAndText(state) {
        const isWork = state.mode === 'work';
        const modeLabelText = isWork ? 'Time to focus!' : 'Take a Break!';
        const modeButtonText = isWork ? 'Work Mode' : 'Break Mode';

        elements.modeDisplay.textContent = modeLabelText;
        elements.modeToggle.textContent = modeButtonText;
            
        document.body.classList.remove('work-mode', 'break-mode');
        requestAnimationFrame(() => {
            document.body.classList.add(`${state.mode}-mode`);
        });
    }

    function _updateInputs(state) {
        elements.sessionCount.textContent = state.sessionsToday;
        if (elements.workDuration && typeof state.workDuration === 'number') {
            elements.workDuration.value = Math.round(state.workDuration / 60);
        }
        if (elements.breakDuration && typeof state.breakDuration === 'number') {
            elements.breakDuration.value = Math.round(state.breakDuration / 60);
        }
    }

    function updateDisplay(state) {
        requestAnimationFrame(() => {
            if (state.timeRemaining !== lastState.timeRemaining) {
                _updateTimeDisplay(state);
                updateProgress(state);
            }
            if (state.mode !== lastState.mode) {
                _updateThemeAndText(state);
            }
            if (state.sessionsToday !== lastState.sessionsToday ||
                state.workDuration !== lastState.workDuration ||
                state.breakDuration !== lastState.breakDuration) {
                _updateInputs(state);
            }
            if (state.isActive !== lastState.isActive) {
                updateButtons(state);
            }

            if (state.timeRemaining === 0 && lastState.timeRemaining > 0) {
                _flashRedTwice();
            }

            if (state.timeRemaining !== lastState.timeRemaining || state.mode !== lastState.mode) {
                const minutes = Math.floor(state.timeRemaining / 60).toString().padStart(2, '0');
                const seconds = (state.timeRemaining % 60).toString().padStart(2, '0');
                const modeText = state.mode.charAt(0).toUpperCase() + state.mode.slice(1);
                document.title = `(${minutes}:${seconds}) - ${modeText} | Pomodoro`;
            }

            lastState = { ...state };
        });
    }

    function updateButtons(state) {
        elements.startButton.disabled = state.isActive;
        elements.pauseButton.disabled = !state.isActive;
        elements.workDuration.disabled = state.isActive;
        elements.breakDuration.disabled = state.isActive;
    }

    function updateProgress(state) {
        const totalDuration = state.mode === 'work' ? state.workDuration : state.breakDuration;
        const elapsedTime = totalDuration - state.timeRemaining;
        const progress = Math.min(100, Math.max(0, (elapsedTime / totalDuration) * 100));

        const color = state.mode === 'work' ? 'var(--accent-work)' : 'var(--accent-break)';
        const angleDeg = `${(progress * 3.6).toFixed(2)}deg`;

        elements.progressRing.style.setProperty('--ring-color', color);
        elements.progressRing.style.setProperty('--progress-angle', angleDeg);

        if (state.timeRemaining === 0) {
            elements.progressRing.classList.add('mode-transition');
            setTimeout(() => {
                elements.progressRing.classList.remove('mode-transition');
            }, 1000);
        }
    }

    function _flashRedTwice() {
        if (!elements.timerDisplay) return;
        let n = 0;
        const doFlash = () => {
            elements.timerDisplay.classList.add('flash-red');
            setTimeout(() => {
                elements.timerDisplay.classList.remove('flash-red');
                n++;
                if (n < 2) setTimeout(doFlash, 300);
            }, 350);
        };
        doFlash();
    }

    function setupButtonListeners() {
        if (elements.startButton) {
            elements.startButton.addEventListener('click', () => {
                try {
                    timer.start();
                } catch (e) {
                    console.error('Error starting timer:', e);
                }
            });
        }

        if (elements.pauseButton) {
            elements.pauseButton.addEventListener('click', () => {
                try {
                    timer.pause();
                } catch (e) {
                    console.error('Error pausing timer:', e);
                }
            });
        }

        if (elements.resetButton) {
            elements.resetButton.addEventListener('click', () => {
                try {
                    timer.reset();
                } catch (e) {
                    console.error('Error resetting timer:', e);
                }
            });
        }
    }

    setupButtonListeners();
    if (elements.modeToggle) {
        elements.modeToggle.addEventListener('click', () => {
            const newMode = timer.mode === 'work' ? 'break' : 'work';
            timer.setMode(newMode); 
        });
    }

    elements.workDuration.addEventListener('change', (e) => {
        const value = Math.max(1, Math.min(60, parseInt(e.target.value) || 25));
        e.target.value = value;
        timer.setWorkDuration(value);
    });

    elements.breakDuration.addEventListener('change', (e) => {
        const value = Math.max(1, Math.min(30, parseInt(e.target.value) || 5));
        e.target.value = value;
        timer.setBreakDuration(value);
    });
    timer.addListener(updateDisplay);
    timer._notify();
});