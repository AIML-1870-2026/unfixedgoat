// obstacles.js — Obstacle definitions (Death Star, asteroids), avoidance force calc

class Obstacle {
  constructor(x, y, radius, type) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type; // 'deathstar' or 'asteroid'
  }
}

class ObstacleManager {
  constructor() {
    this.obstacles = [];
    this.deathStar = null;
  }

  init(canvasWidth, canvasHeight) {
    this.obstacles = [];

    // Death Star — positioned in upper-left area
    const minDim = Math.min(canvasWidth, canvasHeight);
    const dsRadius = minDim * CONFIG.obstacles.deathStar.radiusFraction;
    this.deathStar = new Obstacle(
      canvasWidth * 0.25,
      canvasHeight * 0.3,
      dsRadius,
      'deathstar'
    );
    this.obstacles.push(this.deathStar);

    // Asteroids
    this.randomizeAsteroids(canvasWidth, canvasHeight);
  }

  randomizeAsteroids(canvasWidth, canvasHeight) {
    // Remove existing asteroids, keep death star
    this.obstacles = this.obstacles.filter(o => o.type === 'deathstar');

    const [minR, maxR] = CONFIG.obstacles.asteroidRadiusRange;
    for (let i = 0; i < CONFIG.obstacles.asteroidCount; i++) {
      const r = minR + Math.random() * (maxR - minR);
      let x, y, valid;
      // Avoid placing on top of Death Star
      do {
        x = r + Math.random() * (canvasWidth - r * 2);
        y = r + Math.random() * (canvasHeight - r * 2);
        valid = true;
        for (const o of this.obstacles) {
          const dx = x - o.x;
          const dy = y - o.y;
          if (Math.sqrt(dx * dx + dy * dy) < o.radius + r + 30) {
            valid = false;
            break;
          }
        }
      } while (!valid);
      this.obstacles.push(new Obstacle(x, y, r, 'asteroid'));
    }
  }

  computeAvoidance(boid) {
    let fx = 0, fy = 0;
    for (const obs of this.obstacles) {
      const dx = boid.x - obs.x;
      const dy = boid.y - obs.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const surface = dist - obs.radius;
      const avoidDist = obs.radius + CONFIG.obstacles.deathStar.avoidRadius;

      if (dist < avoidDist) {
        const strength = CONFIG.obstacles.avoidanceWeight / Math.max(surface, 1);
        fx += (dx / dist) * strength;
        fy += (dy / dist) * strength;
      }
    }
    return { fx, fy };
  }
}
