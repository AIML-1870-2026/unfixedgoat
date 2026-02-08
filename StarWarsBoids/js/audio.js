// audio.js — Web Audio API setup, engine drone, laser zap triggers

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.engineGainTie = null;
    this.engineGainRebel = null;
    this.engineOscTie = null;
    this.engineOscRebel = null;
    this.muted = false;
    this.volume = 0.3;
    this.initialized = false;
    this.activeVoices = 0;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);

      // TIE engine drone
      this.engineOscTie = this.ctx.createOscillator();
      this.engineOscTie.type = 'sawtooth';
      this.engineOscTie.frequency.value = CONFIG.audio.engineBaseFreqTie;
      this.engineGainTie = this.ctx.createGain();
      this.engineGainTie.gain.value = 0.03;
      this.engineOscTie.connect(this.engineGainTie);
      this.engineGainTie.connect(this.masterGain);
      this.engineOscTie.start();

      // Rebel engine drone
      this.engineOscRebel = this.ctx.createOscillator();
      this.engineOscRebel.type = 'triangle';
      this.engineOscRebel.frequency.value = CONFIG.audio.engineBaseFreqRebel;
      this.engineGainRebel = this.ctx.createGain();
      this.engineGainRebel.gain.value = 0.025;
      this.engineOscRebel.connect(this.engineGainRebel);
      this.engineGainRebel.connect(this.masterGain);
      this.engineOscRebel.start();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : v;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    return this.muted;
  }

  updateEngineVolume(avgSpeedTie, avgSpeedRebel) {
    if (!this.initialized) return;
    const tieVol = Math.min(0.06, avgSpeedTie * 0.02);
    const rebelVol = Math.min(0.05, avgSpeedRebel * 0.018);
    if (this.engineGainTie) {
      this.engineGainTie.gain.setTargetAtTime(tieVol, this.ctx.currentTime, 0.1);
    }
    if (this.engineGainRebel) {
      this.engineGainRebel.gain.setTargetAtTime(rebelVol, this.ctx.currentTime, 0.1);
    }
  }

  playLaserZap(faction, panX) {
    if (!this.initialized || this.activeVoices >= CONFIG.audio.maxVoices) return;

    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    const startFreq = faction === 'tie' ? 900 : 1100;
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, panX));

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.masterGain);

    this.activeVoices++;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
    osc.onended = () => {
      this.activeVoices--;
      osc.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  playUIClick() {
    if (!this.initialized) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 600;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
}
