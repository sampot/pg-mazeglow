/**
 * Original arcade-ish SFX via Web Audio — no commercial samples.
 */

export class MazeglowAudio {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    this.enabled = true;
    this.master = 0.18;
    this._pellet = 0;
    this._tick = 0;
  }

  async unlock() {
    this.ensure();
    if (this.ctx?.state === "suspended") await this.ctx.resume();
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
  }

  setEnabled(on) {
    this.enabled = on;
  }

  /**
   * @param {number} freq
   * @param {number} dur
   * @param {OscillatorType} [type]
   * @param {number} [gain]
   * @param {number} [when]
   */
  tone(freq, dur, type = "square", gain = 0.12, when = 0) {
    if (!this.enabled) return;
    this.ensure();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * this.master, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur));
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  pellet() {
    this._tick = 1 - this._tick;
    const f = this._tick ? 620 : 740;
    this.tone(f, 0.035, "square", 0.05);
  }

  power() {
    this.tone(220, 0.12, "sawtooth", 0.09);
    this.tone(440, 0.14, "triangle", 0.08, 0.08);
    this.tone(660, 0.16, "square", 0.06, 0.16);
  }

  eatChase() {
    this.tone(520, 0.08, "square", 0.1);
    this.tone(780, 0.12, "triangle", 0.09, 0.06);
  }

  hurt() {
    this.tone(180, 0.14, "sawtooth", 0.1);
    this.tone(90, 0.22, "triangle", 0.1, 0.1);
  }

  clear() {
    for (let i = 0; i < 6; i++) {
      this.tone(360 * Math.pow(1.15, i), 0.09, "square", 0.09, i * 0.07);
    }
  }

  gameOver() {
    this.tone(300, 0.15, "sawtooth", 0.1);
    this.tone(180, 0.25, "triangle", 0.1, 0.12);
    this.tone(100, 0.35, "sine", 0.1, 0.3);
  }

  startBeep() {
    this.tone(400, 0.08, "square", 0.09);
    this.tone(600, 0.1, "triangle", 0.08, 0.07);
  }
}
