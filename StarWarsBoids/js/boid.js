// boid.js — Boid class (position, velocity, steering, faction, trail history)

class Boid {
  constructor(x, y, faction, params) {
    this.x = x;
    this.y = y;
    this.faction = faction; // 'tie' or 'rebel'
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
    this.ax = 0;
    this.ay = 0;
    this.trail = [];
    this.fireCooldown = 0;
    this.activeLaser = null;
    this.params = params;
    this.hp = 2;
    this.dead = false;
    this.heroType = null; // null, 'tieAdvanced', or 'falcon'
    this.immune = false;
  }

  getHeading() {
    return Math.atan2(this.vy, this.vx);
  }

  getSpeed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  applyForce(fx, fy) {
    this.ax += fx;
    this.ay += fy;
  }

  update(dt, width, height, boundaryMode, trailLength) {
    const maxForce = CONFIG.boid.maxForce;
    const maxSpeed = this.params.maxSpeed;

    // Clamp acceleration
    const aMag = Math.sqrt(this.ax * this.ax + this.ay * this.ay);
    if (aMag > maxForce) {
      this.ax = (this.ax / aMag) * maxForce;
      this.ay = (this.ay / aMag) * maxForce;
    }

    this.vx += this.ax * dt;
    this.vy += this.ay * dt;

    // Clamp velocity
    const speed = this.getSpeed();
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    // Ensure minimum speed — keeps boids moving forward, prevents orbiting
    const minSpeed = maxSpeed * 0.6;
    if (speed < minSpeed) {
      const angle = speed > 0.01 ? this.getHeading() : Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * minSpeed;
      this.vy = Math.sin(angle) * minSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Boundary handling — solid walls, boids steer away from edges
    const margin = 60;
    const turnForce = 0.4;
    if (this.x < margin) this.vx += turnForce * (1 - this.x / margin);
    if (this.x > width - margin) this.vx -= turnForce * (1 - (width - this.x) / margin);
    if (this.y < margin) this.vy += turnForce * (1 - this.y / margin);
    if (this.y > height - margin) this.vy -= turnForce * (1 - (height - this.y) / margin);
    // Hard clamp — never escape
    this.x = Math.max(2, Math.min(width - 2, this.x));
    this.y = Math.max(2, Math.min(height - 2, this.y));

    // Trail
    if (trailLength > 0) {
      this.trail.unshift({ x: this.x, y: this.y });
      while (this.trail.length > trailLength) {
        this.trail.pop();
      }
    } else {
      this.trail.length = 0;
    }

    // Cooldown
    if (this.fireCooldown > 0) this.fireCooldown--;

    // Update active laser
    if (this.activeLaser) {
      this.activeLaser.life--;
      if (this.activeLaser.life <= 0) {
        this.activeLaser = null;
      }
    }

    // Reset acceleration
    this.ax = 0;
    this.ay = 0;
  }
}
