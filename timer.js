class TimerState {
  constructor(opts = {}) {
    this.workDuration = (opts.workMinutes || 25) * 60;
    this.breakDuration = (opts.breakMinutes || 5) * 60;
    this.mode = 'work';
    this.timeRemaining = this.workDuration;
    this.isActive = false;
    this.startTime = null;
    this.interval = null;
    this.listeners = new Set();
    this.sessionsToday = this._loadDailyStats();

    const el = document.getElementById('completeSound');
    this.audioEl = el && el.play ? el : null;
    this._audioCtx = null; 
    this._beepScheduled = false;
    this._loadSavedState();
  }

  addListener(cb) { this.listeners.add(cb); }
  removeListener(cb) { this.listeners.delete(cb); }

  setMode(newMode) {
    if ((newMode !== 'work' && newMode !== 'break') || this.mode === newMode) {
      return;
    }
    
    this.mode = newMode;
    this.reset();
  }

  _notify() {
    const state = {
      timeRemaining: this.timeRemaining,
      isActive: this.isActive,
      mode: this.mode,
      sessionsToday: this.sessionsToday,
      workDuration: this.workDuration,
      breakDuration: this.breakDuration
    };
    this.listeners.forEach(cb => cb(state));
  }

  start() {
    if (this.isActive) return;

    this.isActive = true;

    if (this.timeRemaining <= 0) {
        this.timeRemaining = this._currentDuration();
    }
    
    this.startTime = Date.now() - ((this._currentDuration() - this.timeRemaining) * 1000);

    this._saveCurrentState();
    this._startInterval();
    this._notify();
  }

  pause() {
    if (!this.isActive) return;
    this.isActive = false;
    clearInterval(this.interval);
    this.interval = null;
    this._saveCurrentState();
    this._notify();
  }

  reset() {
    this.isActive = false;
    clearInterval(this.interval);
    this.interval = null;
    this.timeRemaining = this._currentDuration();
    this._saveCurrentState();
    this._notify();
  }

  setWorkDuration(minutes) {
    const m = Math.max(1, Math.min(60, Math.floor(Number(minutes) || 25)));
    this.workDuration = m * 60;
    if (this.mode === 'work' && !this.isActive) this.timeRemaining = this.workDuration;
    this._savePreferences();
    this._saveCurrentState();
    this._notify();
  }

  setBreakDuration(minutes) {
    const m = Math.max(1, Math.min(60, Math.floor(Number(minutes) || 5)));
    this.breakDuration = m * 60;
    if (this.mode === 'break' && !this.isActive) this.timeRemaining = this.breakDuration;
    this._savePreferences();
    this._saveCurrentState();
    this._notify();
  }

  _currentDuration() { return this.mode === 'work' ? this.workDuration : this.breakDuration; }

  _startInterval() {

    this.interval = setInterval(() => {

      this._tick();
    }, 200);

  }

  _tick() {
    if (!this.isActive) return;
    
    const now = Date.now();
    const elapsedSec = Math.floor((now - this.startTime) / 1000);
    const total = this._currentDuration();
    const newRemaining = Math.max(0, total - elapsedSec);

    if (newRemaining === this.timeRemaining) return;

    const prev = this.timeRemaining;
    this.timeRemaining = newRemaining;

    if (!this._beepScheduled && prev > 3 && this.timeRemaining <= 3) {
      this._beepScheduled = true;
      this._playThreeBeeps(() => { this._beepScheduled = false; });
    }

    this._notify();

    if (this.timeRemaining <= 0) {
      clearInterval(this.interval);
      this.interval = null;
      this.isActive = false;
      this._saveCurrentState();
      this._handleCompletion();
    }
  }

  _handleCompletion() {
    if (this.mode === 'work') this._incrementSessionCount();
    this.mode = this.mode === 'work' ? 'break' : 'work';
    this.timeRemaining = this._currentDuration();
    this._saveCurrentState();
    this.start();
  }

  _playThreeBeeps(done) {
    const playOne = () => this._playBeep();
    playOne();
    setTimeout(playOne, 1000);
    setTimeout(() => { playOne(); if (done) done(); }, 2000);
  }

  _playBeep() {
    try {
      if (this.audioEl) {
        this.audioEl.currentTime = 0;
        this.audioEl.play().catch(() => {});
        return;
      }
      if (!this._audioCtx) {
        try { this._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this._audioCtx = null; }
      }
      if (this._audioCtx) {
        const ctx = this._audioCtx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880; // A5-ish beep
        g.gain.value = 0.0001;
        o.connect(g); g.connect(ctx.destination);
        const now = ctx.currentTime;
        g.gain.linearRampToValueAtTime(0.15, now + 0.01);
        g.gain.linearRampToValueAtTime(0.001, now + 0.15);
        o.start(now);
        o.stop(now + 0.16);
      }
    } catch (e) {
    }
  }

  _incrementSessionCount() {
    const today = new Date().toLocaleDateString();
    let stats = { date: today, count: 0 };
    try {
      const raw = localStorage.getItem('dailyStats');
      if (raw) stats = JSON.parse(raw);
    } catch (e) {}
    if (stats.date === today) stats.count = (stats.count || 0) + 1;
    else { stats.date = today; stats.count = 1; }
    try { localStorage.setItem('dailyStats', JSON.stringify(stats)); } catch (e) {}
    this.sessionsToday = stats.count;
    this._notify();
  }

  _loadDailyStats() {
    try {
      const raw = localStorage.getItem('dailyStats');
      if (raw) {
        const stats = JSON.parse(raw);
        if (stats.date === new Date().toLocaleDateString()) return stats.count || 0;
      }
    } catch (e) {}
    return 0;
  }

  _saveCurrentState() {
    try {
      localStorage.setItem('timerState', JSON.stringify({
        mode: this.mode,
        timeRemaining: this.timeRemaining,
        isActive: this.isActive,
        workDuration: this.workDuration,
        breakDuration: this.breakDuration,
        timestamp: Date.now()
      }));
    } catch (e) {}
  }

  _savePreferences() {
    try {
      localStorage.setItem('timerPreferences', JSON.stringify({ workDuration: this.workDuration, breakDuration: this.breakDuration }));
    } catch (e) {}
  }

  _loadSavedState() {
    try {
      const raw = localStorage.getItem('timerState');
      if (!raw) return;

      const st = JSON.parse(raw);
      this.mode = st.mode || this.mode;
      this.workDuration = st.workDuration || this.workDuration;
      this.breakDuration = st.breakDuration || this.breakDuration;

      if (st.isActive) {
        const elapsedSince = Math.floor((Date.now() - (st.timestamp || Date.now())) / 1000);
        this.timeRemaining = Math.max(0, (st.timeRemaining || 0) - elapsedSince);
      } else {
        this.timeRemaining = st.timeRemaining || this._currentDuration();
      }

      if (st.isActive && this.timeRemaining > 0) {
        this.start();
      } else {
        this.isActive = false;
      }

      this._notify();
    } catch (e) {
    }
  }
}

export default TimerState;
