// ui.js — Slider/button wiring, preset application, readout updates

class UI {
  constructor(sim) {
    this.sim = sim;
    this.sliderElements = {};
    this.modeButtons = {};
    this.huntSubToggle = null;
  }

  init() {
    this._wirePresets();
    this._wireModeSelector();
    this._wireSliders();
    this._wireMouseModes();
    this._wireSimControls();
    this._wireAudioControls();
    this._updateModeUI();
  }

  _wirePresets() {
    document.getElementById('preset-imperial').addEventListener('click', () => {
      this.sim.applyPreset(CONFIG.presets.imperialFormation);
      this._syncSlidersFromSim();
      this._updateModeUI();
      this.sim.audio.playUIClick();
    });
    document.getElementById('preset-rebel').addEventListener('click', () => {
      this.sim.applyPreset(CONFIG.presets.rebelScramble);
      this._syncSlidersFromSim();
      this._updateModeUI();
      this.sim.audio.playUIClick();
    });
    document.getElementById('preset-yavin').addEventListener('click', () => {
      this.sim.applyPreset(CONFIG.presets.battleOfYavin);
      this._syncSlidersFromSim();
      this._updateModeUI();
      this.sim.audio.playUIClick();
    });
  }

  _wireModeSelector() {
    const modes = ['coexist', 'hunt', 'dogfight'];
    modes.forEach(mode => {
      const btn = document.getElementById(`mode-${mode}`);
      this.modeButtons[mode] = btn;
      btn.addEventListener('click', () => {
        this.sim.interactionMode = mode;
        this._updateModeUI();
        this.sim.audio.playUIClick();
      });
    });

    this.huntSubToggle = document.getElementById('hunt-sub-toggle');
    document.getElementById('hunt-empire').addEventListener('click', () => {
      this.sim.huntSub = 'empire';
      this._updateHuntSubUI();
      this.sim.audio.playUIClick();
    });
    document.getElementById('hunt-rebels').addEventListener('click', () => {
      this.sim.huntSub = 'rebels';
      this._updateHuntSubUI();
      this.sim.audio.playUIClick();
    });
  }

  _updateModeUI() {
    const mode = this.sim.interactionMode;
    Object.keys(this.modeButtons).forEach(m => {
      this.modeButtons[m].classList.toggle('active', m === mode);
    });

    // Show/hide hunt sub-toggle
    this.huntSubToggle.style.display = mode === 'hunt' ? 'flex' : 'none';
    this._updateHuntSubUI();

    // Show/hide engagement sliders
    const engSection = document.getElementById('engagement-section');
    if (mode === 'coexist') {
      engSection.classList.add('disabled');
    } else {
      engSection.classList.remove('disabled');
    }
  }

  _updateHuntSubUI() {
    const sub = this.sim.huntSub;
    document.getElementById('hunt-empire').classList.toggle('active', sub === 'empire');
    document.getElementById('hunt-rebels').classList.toggle('active', sub === 'rebels');
  }

  _wireSliders() {
    const sliderDefs = [
      // TIE flocking
      { id: 'tie-separation', path: 'tieParams.separationWeight' },
      { id: 'tie-alignment', path: 'tieParams.alignmentWeight' },
      { id: 'tie-cohesion', path: 'tieParams.cohesionWeight' },
      { id: 'tie-radius', path: 'tieParams.neighborRadius' },
      { id: 'tie-speed', path: 'tieParams.maxSpeed' },
      // Rebel flocking
      { id: 'rebel-separation', path: 'rebelParams.separationWeight' },
      { id: 'rebel-alignment', path: 'rebelParams.alignmentWeight' },
      { id: 'rebel-cohesion', path: 'rebelParams.cohesionWeight' },
      { id: 'rebel-radius', path: 'rebelParams.neighborRadius' },
      { id: 'rebel-speed', path: 'rebelParams.maxSpeed' },
      // Engagement
      { id: 'eng-aggression', path: 'engagementParams.aggression' },
      { id: 'eng-evasion', path: 'engagementParams.evasion' },
      { id: 'eng-firing-range', path: 'engagementParams.firingRange' },
      // General
      { id: 'gen-tie-count', path: 'general.tieCount', isCount: true },
      { id: 'gen-xwing-count', path: 'general.xwingCount', isCount: true },
      { id: 'gen-trail-length', path: 'general.trailLength' },
    ];

    sliderDefs.forEach(def => {
      const slider = document.getElementById(def.id);
      const valueEl = document.getElementById(def.id + '-val');
      if (!slider) return;
      this.sliderElements[def.id] = { slider, valueEl, def };

      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        const [obj, key] = def.path.split('.');
        this.sim[obj][key] = val;
        if (valueEl) valueEl.textContent = val;

        if (def.isCount) {
          this.sim.syncBoidCounts();
        }
        if (obj === 'tieParams') {
          this.sim.tieFlock.updateParams(this.sim.tieParams);
        } else if (obj === 'rebelParams') {
          this.sim.rebelFlock.updateParams(this.sim.rebelParams);
        }
      });
    });
  }

  _syncSlidersFromSim() {
    Object.values(this.sliderElements).forEach(({ slider, valueEl, def }) => {
      const [obj, key] = def.path.split('.');
      const val = this.sim[obj][key];
      slider.value = val;
      if (valueEl) valueEl.textContent = val;
    });
  }

  _wireMouseModes() {
    ['attract', 'repel', 'spawn'].forEach(mode => {
      const btn = document.getElementById(`mouse-${mode}`);
      btn.addEventListener('click', () => {
        this.sim.mouseMode = mode;
        document.querySelectorAll('.mouse-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.sim.audio.playUIClick();
      });
    });
  }

  _wireSimControls() {
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.sim.paused = !this.sim.paused;
      const btn = document.getElementById('btn-pause');
      btn.textContent = this.sim.paused ? '\u25B6 Resume' : '\u23F8 Pause';
      this.sim.audio.playUIClick();
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      this.sim.reset();
      this.sim.audio.playUIClick();
    });
    document.getElementById('btn-randomize-obstacles').addEventListener('click', () => {
      this.sim.obstacleManager.randomizeAsteroids(this.sim.canvas.width, this.sim.canvas.height);
      this.sim.audio.playUIClick();
    });
  }

  _wireAudioControls() {
    document.getElementById('btn-mute').addEventListener('click', () => {
      this.sim._ensureAudio();
      const muted = this.sim.audio.toggleMute();
      document.getElementById('btn-mute').textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    });
  }

  updateReadouts(stats) {
    document.getElementById('readout-fps').textContent = stats.fps;
    document.getElementById('readout-tie-count').textContent = stats.tieCount;
    document.getElementById('readout-xwing-count').textContent = stats.xwingCount;
    document.getElementById('readout-tie-speed').textContent = stats.avgSpeedTie;
    document.getElementById('readout-xwing-speed').textContent = stats.avgSpeedRebel;
    document.getElementById('readout-avg-neighbors').textContent = stats.avgNeighbors;
    document.getElementById('readout-engagements').textContent = stats.engagements;
  }
}
