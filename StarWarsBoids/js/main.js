// main.js — Entry point, animation loop, event wiring

class Simulation {
  constructor() {
    this.canvas = document.getElementById('sim-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.renderer = new Renderer(this.canvas);
    this.audio = new AudioManager();
    this.obstacleManager = new ObstacleManager();

    this.tieFlock = new Flock();
    this.rebelFlock = new Flock();

    // Parameters
    this.tieParams = { ...CONFIG.defaults.tie };
    this.rebelParams = { ...CONFIG.defaults.rebel };
    this.engagementParams = { ...CONFIG.defaults.engagement };
    this.general = { ...CONFIG.defaults.general };

    this.interactionMode = 'coexist';
    this.huntSub = 'empire'; // 'empire' or 'rebels'
    this.boundaryMode = 'wrap';
    this.mouseMode = 'attract';
    this.mouseX = null;
    this.mouseY = null;
    this.paused = false;

    // Stats
    this.fps = 60;
    this.lastTime = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.engagementCount = 0;

    // Explosions
    this.explosions = [];

    // Respawn timers
    this.tieRespawnTimer = 0;
    this.rebelRespawnTimer = 0;

    this.audioInitialized = false;

    // Intro state
    this.introActive = true;
    this.introFading = false;
    this.introSpawnPhase = false;
    this.introSpawnTimer = 0;
    this.introSpawnBatch = 0;
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.renderer.initStarfield(this.canvas.width, this.canvas.height);
    this.obstacleManager.init(this.canvas.width, this.canvas.height);

    // Don't populate boids yet — intro plays first
    this._initIntro();

    // Mouse events on canvas
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouseX = null;
      this.mouseY = null;
    });
    this.canvas.addEventListener('click', (e) => {
      this._ensureAudio();
      if (this.mouseMode === 'spawn') {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.rebelFlock.boids.push(new Boid(x, y, 'rebel', this.rebelParams));
        this.general.xwingCount = this.rebelFlock.boids.length;
      }
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._ensureAudio();
      if (this.mouseMode === 'spawn') {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.tieFlock.boids.push(new Boid(x, y, 'tie', this.tieParams));
        this.general.tieCount = this.tieFlock.boids.length;
      }
    });

    // Init audio on first user interaction
    document.addEventListener('click', () => this._ensureAudio(), { once: true });

    this.ui = new UI(this);
    this.ui.init();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  _ensureAudio() {
    if (!this.audioInitialized) {
      this.audio.init();
      this.audioInitialized = true;
    }
  }

  _initIntro() {
    const overlay = document.getElementById('intro-overlay');
    const skipBtn = document.getElementById('btn-skip-intro');

    // Hide controls panel during intro
    document.getElementById('controls-panel').classList.add('hidden');
    document.getElementById('btn-toggle-panel').style.display = 'none';
    document.getElementById('btn-mute').style.display = 'none';

    // Calculate when crawl is done: preamble (6s) + crawl scroll needs ~35s to clear viewport
    this._introCrawlTimeout = setTimeout(() => {
      this._endIntro();
    }, 38000);

    skipBtn.addEventListener('click', () => {
      this._endIntro();
    });
  }

  _endIntro() {
    if (this.introFading) return;
    this.introFading = true;

    clearTimeout(this._introCrawlTimeout);

    const overlay = document.getElementById('intro-overlay');
    overlay.classList.add('fade-out');

    // After fade-out transition (1.5s), remove overlay and start spawning
    setTimeout(() => {
      overlay.classList.add('hidden');
      this.introActive = false;
      this.introSpawnPhase = true;
      this.introSpawnTimer = 0;
      this.introSpawnBatch = 0;

      // Show UI elements
      document.getElementById('controls-panel').classList.remove('hidden');
      document.getElementById('btn-toggle-panel').style.display = '';
      document.getElementById('btn-mute').style.display = '';

      // Trigger resize for panel
      setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
    }, 1600);
  }

  _spawnBoidsFromEdges() {
    // Spawn boids in batches from screen edges
    const w = this.canvas.width;
    const h = this.canvas.height;
    const tieTarget = this.general.tieCount;
    const rebelTarget = this.general.xwingCount;
    const batchSize = 5;

    // Spawn a batch of TIEs
    for (let i = 0; i < batchSize && this.tieFlock.boids.length < tieTarget; i++) {
      const { x, y, vx, vy } = this._randomEdgeSpawn(w, h);
      const boid = new Boid(x, y, 'tie', this.tieParams);
      boid.vx = vx * this.tieParams.maxSpeed;
      boid.vy = vy * this.tieParams.maxSpeed;
      this.tieFlock.boids.push(boid);
    }

    // Spawn a batch of rebels
    for (let i = 0; i < batchSize && this.rebelFlock.boids.length < rebelTarget; i++) {
      const { x, y, vx, vy } = this._randomEdgeSpawn(w, h);
      const boid = new Boid(x, y, 'rebel', this.rebelParams);
      boid.vx = vx * this.rebelParams.maxSpeed;
      boid.vy = vy * this.rebelParams.maxSpeed;
      this.rebelFlock.boids.push(boid);
    }

    // Check if spawning is complete — then add hero ships
    if (this.tieFlock.boids.length >= tieTarget && this.rebelFlock.boids.length >= rebelTarget) {
      this.introSpawnPhase = false;
      this._spawnHeroShips();
    }
  }

  _spawnHeroShips() {
    // Only spawn if they don't already exist
    const hasAdvanced = this.tieFlock.boids.some(b => b.heroType === 'tieAdvanced');
    const hasFalcon = this.rebelFlock.boids.some(b => b.heroType === 'falcon');

    if (!hasAdvanced) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const heroParams = { ...this.tieParams, maxSpeed: this.tieParams.maxSpeed * 1.3 };
      const { x, y, vx, vy } = this._randomEdgeSpawn(w, h);
      const vader = new Boid(x, y, 'tie', heroParams);
      vader.vx = vx * heroParams.maxSpeed;
      vader.vy = vy * heroParams.maxSpeed;
      vader.heroType = 'tieAdvanced';
      vader.immune = true;
      vader.hp = 999;
      this.tieFlock.boids.push(vader);
    }

    if (!hasFalcon) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      const heroParams = { ...this.rebelParams, maxSpeed: this.rebelParams.maxSpeed * 1.3 };
      const { x, y, vx, vy } = this._randomEdgeSpawn(w, h);
      const falcon = new Boid(x, y, 'rebel', heroParams);
      falcon.vx = vx * heroParams.maxSpeed;
      falcon.vy = vy * heroParams.maxSpeed;
      falcon.heroType = 'falcon';
      falcon.immune = true;
      falcon.hp = 999;
      this.rebelFlock.boids.push(falcon);
    }
  }

  _randomEdgeSpawn(w, h) {
    const edge = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    const spread = 0.3; // random angular spread

    if (edge === 0) { // top
      x = Math.random() * w;
      y = -5;
      vx = (Math.random() - 0.5) * spread;
      vy = 0.7 + Math.random() * 0.3;
    } else if (edge === 1) { // bottom
      x = Math.random() * w;
      y = h + 5;
      vx = (Math.random() - 0.5) * spread;
      vy = -(0.7 + Math.random() * 0.3);
    } else if (edge === 2) { // left
      x = -5;
      y = Math.random() * h;
      vx = 0.7 + Math.random() * 0.3;
      vy = (Math.random() - 0.5) * spread;
    } else { // right
      x = w + 5;
      y = Math.random() * h;
      vx = -(0.7 + Math.random() * 0.3);
      vy = (Math.random() - 0.5) * spread;
    }

    return { x, y, vx, vy };
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
      this.renderer.initStarfield(cw, ch);
    }
  }

  reset() {
    this.tieFlock.populate(this.general.tieCount, 'tie', this.tieParams, this.canvas.width, this.canvas.height);
    this.rebelFlock.populate(this.general.xwingCount, 'rebel', this.rebelParams, this.canvas.width, this.canvas.height);
    this.obstacleManager.init(this.canvas.width, this.canvas.height);
    this._spawnHeroShips();
  }

  syncBoidCounts() {
    this.tieFlock.adjustCount(this.general.tieCount, 'tie', this.tieParams, this.canvas.width, this.canvas.height);
    this.rebelFlock.adjustCount(this.general.xwingCount, 'rebel', this.rebelParams, this.canvas.width, this.canvas.height);
  }

  applyPreset(preset) {
    Object.assign(this.tieParams, preset.tie);
    Object.assign(this.rebelParams, preset.rebel);
    Object.assign(this.engagementParams, preset.engagement);
    Object.assign(this.general, preset.general);
    this.interactionMode = preset.mode;
    if (preset.huntSub) this.huntSub = preset.huntSub;

    this.tieFlock.updateParams(this.tieParams);
    this.rebelFlock.updateParams(this.rebelParams);
    this.syncBoidCounts();
  }

  loop(time) {
    requestAnimationFrame((t) => this.loop(t));

    // Keep canvas resolution in sync with its display size (handles panel toggle animation)
    this.resizeCanvas();

    const rawDt = time - this.lastTime;
    this.lastTime = time;

    // FPS counter
    this.frameCount++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    // During intro, only render background (starfield)
    if (this.introActive) {
      this._render(time);
      return;
    }

    // Spawn boids from edges after intro ends
    if (this.introSpawnPhase) {
      this.introSpawnTimer++;
      if (this.introSpawnTimer % 3 === 0) { // every 3 frames
        this._spawnBoidsFromEdges();
      }
    }

    if (this.paused) {
      this._render(time);
      this._updateStats();
      return;
    }

    // Normalize dt (cap to avoid spiral of death)
    const dt = Math.min(rawDt / 16.667, 3);

    this._simulate(dt);
    this._render(time);
    this._updateStats();
  }

  _simulate(dt) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const allTies = this.tieFlock.boids;
    const allRebels = this.rebelFlock.boids;
    this.engagementCount = 0;

    // Apply flocking
    this.tieFlock.applyFlocking(w, h, this.boundaryMode);
    this.rebelFlock.applyFlocking(w, h, this.boundaryMode);

    // Apply engagement based on mode
    if (this.interactionMode !== 'coexist') {
      const aggr = this.engagementParams.aggression;
      const evas = this.engagementParams.evasion;
      const fRange = this.engagementParams.firingRange;

      if (this.interactionMode === 'dogfight') {
        // Both factions chase and evade (skip heroes — they hunt independently)
        for (const boid of allTies) {
          if (boid.heroType) continue;
          Flock.applyEngagement(boid, allRebels, aggr, evas, fRange, true, w, h, this.boundaryMode);
        }
        for (const boid of allRebels) {
          if (boid.heroType) continue;
          Flock.applyEngagement(boid, allTies, aggr, evas, fRange, true, w, h, this.boundaryMode);
        }
      } else if (this.interactionMode === 'hunt') {
        if (this.huntSub === 'empire') {
          // TIEs are predator, Rebels are prey
          for (const boid of allTies) {
            if (boid.heroType) continue;
            Flock.applyEngagement(boid, allRebels, aggr, 0, fRange, true, w, h, this.boundaryMode);
          }
          for (const boid of allRebels) {
            if (boid.heroType) continue;
            Flock.applyEngagement(boid, allTies, 0, evas, fRange, false, w, h, this.boundaryMode);
          }
        } else {
          // Rebels are predator, TIEs are prey
          for (const boid of allRebels) {
            if (boid.heroType) continue;
            Flock.applyEngagement(boid, allTies, aggr, 0, fRange, true, w, h, this.boundaryMode);
          }
          for (const boid of allTies) {
            if (boid.heroType) continue;
            Flock.applyEngagement(boid, allRebels, 0, evas, fRange, false, w, h, this.boundaryMode);
          }
        }
      }
    }

    // Hero ships always hunt independently, regardless of interaction mode
    const heroAggr = this.engagementParams.aggression || 5;
    const heroRange = this.engagementParams.firingRange || 150;
    for (const boid of allTies) {
      if (boid.heroType) {
        Flock.applyEngagement(boid, allRebels, heroAggr, 0, heroRange, true, w, h, this.boundaryMode);
      }
    }
    for (const boid of allRebels) {
      if (boid.heroType) {
        Flock.applyEngagement(boid, allTies, heroAggr, 0, heroRange, true, w, h, this.boundaryMode);
      }
    }

    // Obstacle avoidance
    const allBoids = [...allTies, ...allRebels];
    for (const boid of allBoids) {
      const avoid = this.obstacleManager.computeAvoidance(boid);
      boid.applyForce(avoid.fx, avoid.fy);
    }

    // Mouse interaction
    if (this.mouseX !== null && this.mouseY !== null && this.mouseMode !== 'spawn') {
      for (const boid of allBoids) {
        const dx = this.mouseX - boid.x;
        const dy = this.mouseY - boid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.mouse.radius && dist > 1) {
          const strength = this.mouseMode === 'attract'
            ? CONFIG.mouse.attractStrength
            : -CONFIG.mouse.repelStrength;
          boid.applyForce(
            (dx / dist) * strength,
            (dy / dist) * strength
          );
        }
      }
    }

    // Update all boids
    for (const boid of allBoids) {
      boid.update(dt, w, h, this.boundaryMode, this.general.trailLength);

      // Count engagements and play laser sounds
      if (boid.activeLaser && boid.activeLaser.life === boid.activeLaser.maxLife - 1) {
        this.engagementCount++;
        if (this.audioInitialized) {
          const panX = (boid.x / w) * 2 - 1;
          this.audio.playLaserZap(boid.faction, panX);
        }
      }
    }

    // Laser-hit detection: check each active laser bolt against enemy boids
    const hitRadius = 10;
    for (const boid of allBoids) {
      const laser = boid.activeLaser;
      if (!laser) continue;

      const progress = 1 - laser.life / laser.maxLife;
      const traveled = progress * laser.range;
      const boltLen = 8;
      const headX = laser.startX + laser.dirX * (traveled + boltLen);
      const headY = laser.startY + laser.dirY * (traveled + boltLen);

      const enemies = boid.faction === 'tie' ? allRebels : allTies;
      for (const enemy of enemies) {
        if (enemy.dead || enemy.immune) continue;
        const edx = headX - enemy.x;
        const edy = headY - enemy.y;
        const eDist = Math.sqrt(edx * edx + edy * edy);
        if (eDist < hitRadius) {
          enemy.hp--;
          boid.activeLaser = null; // bolt consumed
          if (enemy.hp <= 0) {
            enemy.dead = true;
            this.explosions.push({
              x: enemy.x,
              y: enemy.y,
              life: 20,
              maxLife: 20,
              faction: enemy.faction,
            });
          }
          break;
        }
      }
    }

    // Remove dead boids
    this.tieFlock.boids = this.tieFlock.boids.filter(b => !b.dead);
    this.rebelFlock.boids = this.rebelFlock.boids.filter(b => !b.dead);

    // Respawn boids gradually to maintain target counts
    const respawnDelay = 60; // frames between respawns
    if (this.tieFlock.boids.length < this.general.tieCount) {
      this.tieRespawnTimer++;
      if (this.tieRespawnTimer >= respawnDelay) {
        this.tieRespawnTimer = 0;
        // Spawn at a random edge
        const edge = Math.floor(Math.random() * 4);
        let sx, sy;
        if (edge === 0) { sx = Math.random() * w; sy = 5; }
        else if (edge === 1) { sx = Math.random() * w; sy = h - 5; }
        else if (edge === 2) { sx = 5; sy = Math.random() * h; }
        else { sx = w - 5; sy = Math.random() * h; }
        this.tieFlock.boids.push(new Boid(sx, sy, 'tie', this.tieParams));
      }
    } else {
      this.tieRespawnTimer = 0;
    }

    if (this.rebelFlock.boids.length < this.general.xwingCount) {
      this.rebelRespawnTimer++;
      if (this.rebelRespawnTimer >= respawnDelay) {
        this.rebelRespawnTimer = 0;
        const edge = Math.floor(Math.random() * 4);
        let sx, sy;
        if (edge === 0) { sx = Math.random() * w; sy = 5; }
        else if (edge === 1) { sx = Math.random() * w; sy = h - 5; }
        else if (edge === 2) { sx = 5; sy = Math.random() * h; }
        else { sx = w - 5; sy = Math.random() * h; }
        this.rebelFlock.boids.push(new Boid(sx, sy, 'rebel', this.rebelParams));
      }
    } else {
      this.rebelRespawnTimer = 0;
    }

    // Update explosions
    for (const exp of this.explosions) {
      exp.life--;
    }
    this.explosions = this.explosions.filter(e => e.life > 0);

    // Update engine audio
    if (this.audioInitialized) {
      let tieSpdSum = 0, rebelSpdSum = 0;
      for (const b of this.tieFlock.boids) tieSpdSum += b.getSpeed();
      for (const b of this.rebelFlock.boids) rebelSpdSum += b.getSpeed();
      const avgTie = this.tieFlock.boids.length > 0 ? tieSpdSum / this.tieFlock.boids.length : 0;
      const avgRebel = this.rebelFlock.boids.length > 0 ? rebelSpdSum / this.rebelFlock.boids.length : 0;
      this.audio.updateEngineVolume(avgTie, avgRebel);
    }
  }

  _render(time) {
    const allBoids = [...this.tieFlock.boids, ...this.rebelFlock.boids];

    this.renderer.drawBackground(time);
    this.renderer.drawObstacles(this.obstacleManager.obstacles);
    this.renderer.drawTrails(allBoids);

    for (const boid of allBoids) {
      this.renderer.drawShip(boid);
    }

    this.renderer.drawLasers(allBoids);
    this.renderer.drawExplosions(this.explosions);
    this.renderer.drawMouseCursor(this.mouseX, this.mouseY, this.mouseMode);
  }

  _updateStats() {
    const allTies = this.tieFlock.boids;
    const allRebels = this.rebelFlock.boids;

    let tieSpdSum = 0, rebelSpdSum = 0, neighborSum = 0;
    for (const b of allTies) {
      tieSpdSum += b.getSpeed();
      neighborSum += (b._neighborCount || 0);
    }
    for (const b of allRebels) {
      rebelSpdSum += b.getSpeed();
      neighborSum += (b._neighborCount || 0);
    }
    const total = allTies.length + allRebels.length;
    const avgSpeedTie = allTies.length > 0 ? (tieSpdSum / allTies.length).toFixed(1) : '0.0';
    const avgSpeedRebel = allRebels.length > 0 ? (rebelSpdSum / allRebels.length).toFixed(1) : '0.0';
    const avgNeighbors = total > 0 ? (neighborSum / total).toFixed(1) : '0.0';

    // Count active lasers
    let laserCount = 0;
    for (const b of [...allTies, ...allRebels]) {
      if (b.activeLaser) laserCount++;
    }

    this.ui.updateReadouts({
      fps: this.fps,
      tieCount: allTies.length,
      xwingCount: allRebels.length,
      avgSpeedTie,
      avgSpeedRebel,
      avgNeighbors,
      engagements: laserCount,
    });
  }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
  const sim = new Simulation();
  sim.init();
});
