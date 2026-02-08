// flock.js — Flock manager (neighbor search, rule application, engagement logic)

class Flock {
  constructor() {
    this.boids = [];
  }

  populate(count, faction, params, canvasWidth, canvasHeight) {
    this.boids = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * canvasHeight;
      this.boids.push(new Boid(x, y, faction, params));
    }
  }

  adjustCount(count, faction, params, canvasWidth, canvasHeight) {
    // +1 for hero ship if present
    const heroCount = this.boids.filter(b => b.heroType).length;
    const target = count + heroCount;
    while (this.boids.length > target) {
      // Never remove hero ships
      const idx = this.boids.findLastIndex(b => !b.heroType);
      if (idx === -1) break;
      this.boids.splice(idx, 1);
    }
    while (this.boids.length < count) {
      const x = Math.random() * canvasWidth;
      const y = Math.random() * canvasHeight;
      this.boids.push(new Boid(x, y, faction, params));
    }
  }

  updateParams(params) {
    for (const b of this.boids) {
      b.params = params;
    }
  }

  applyFlocking(wrapWidth, wrapHeight, boundaryMode) {
    for (const boid of this.boids) {
      // Hero ships are independent — skip flocking
      if (boid.heroType) continue;
      const params = boid.params;
      let sepX = 0, sepY = 0, sepCount = 0;
      let aliX = 0, aliY = 0, aliCount = 0;
      let cohX = 0, cohY = 0, cohCount = 0;
      const radius = params.neighborRadius;
      const sepDist = CONFIG.boid.separationDist;

      for (const other of this.boids) {
        if (other === boid || other.heroType) continue;
        let dx = other.x - boid.x;
        let dy = other.y - boid.y;

        // Wrap-aware distance
        if (boundaryMode === 'wrap') {
          if (dx > wrapWidth / 2) dx -= wrapWidth;
          if (dx < -wrapWidth / 2) dx += wrapWidth;
          if (dy > wrapHeight / 2) dy -= wrapHeight;
          if (dy < -wrapHeight / 2) dy += wrapHeight;
        }

        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius || dist < 0.001) continue;

        // Alignment
        aliX += other.vx;
        aliY += other.vy;
        aliCount++;

        // Cohesion
        cohX += dx;
        cohY += dy;
        cohCount++;

        // Separation — stronger the closer they are (inverse-square)
        if (dist < sepDist) {
          const urgency = (sepDist / Math.max(dist, 1));
          sepX -= (dx / dist) * urgency;
          sepY -= (dy / dist) * urgency;
          sepCount++;
        }
      }

      // Apply separation (strong to prevent clumping)
      if (sepCount > 0) {
        boid.applyForce(
          (sepX / sepCount) * params.separationWeight * 0.14,
          (sepY / sepCount) * params.separationWeight * 0.14
        );
      }

      // Apply alignment (dominant force — makes boids fly parallel)
      if (aliCount > 0) {
        const avgVx = aliX / aliCount;
        const avgVy = aliY / aliCount;
        boid.applyForce(
          (avgVx - boid.vx) * params.alignmentWeight * 0.06,
          (avgVy - boid.vy) * params.alignmentWeight * 0.06
        );
      }

      // Anti-orbit correction: detect when velocity is perpendicular to
      // group center (= circling) and steer outward to break the orbit
      if (cohCount > 0) {
        const gcx = cohX / cohCount;
        const gcy = cohY / cohCount;
        const gcDist = Math.sqrt(gcx * gcx + gcy * gcy);

        if (gcDist > 1) {
          // Dot product of velocity and direction-to-center
          const speed = boid.getSpeed();
          if (speed > 0.1) {
            const toCenter = (boid.vx * gcx + boid.vy * gcy) / (speed * gcDist);
            // toCenter near 0 means perpendicular = orbiting
            // toCenter near 1 means heading toward center
            // toCenter near -1 means heading away
            if (Math.abs(toCenter) < 0.4 && aliCount > 2) {
              // Orbiting detected — push outward from center
              boid.applyForce(
                -(gcx / gcDist) * 0.06,
                -(gcy / gcDist) * 0.06
              );
            }
          }

          // Gentle cohesion only for lone boids with few neighbors
          if (aliCount <= 3 && gcDist > sepDist) {
            boid.applyForce(
              gcx * params.cohesionWeight * 0.006,
              gcy * params.cohesionWeight * 0.006
            );
          }
        }
      }

      // Flock splitting — disperse when local group is too large
      const maxFlockSize = 4;
      if (aliCount > maxFlockSize) {
        if (cohCount > 0) {
          const gcx = cohX / cohCount;
          const gcy = cohY / cohCount;
          const gcDist = Math.sqrt(gcx * gcx + gcy * gcy);
          if (gcDist > 0.1) {
            const overFactor = (aliCount - maxFlockSize) / maxFlockSize;
            // Strong outward push
            boid.applyForce(
              -(gcx / gcDist) * overFactor * 0.15,
              -(gcy / gcDist) * overFactor * 0.15
            );
            // Strong random lateral nudge to break symmetry
            const perpX = -gcy / gcDist;
            const perpY = gcx / gcDist;
            const jitter = (Math.random() - 0.5) * overFactor * 0.12;
            boid.applyForce(perpX * jitter, perpY * jitter);
          }
        }
      }

      boid._neighborCount = aliCount;
    }
  }

  static applyEngagement(boid, enemyBoids, aggression, evasion, firingRange, canFire, wrapWidth, wrapHeight, boundaryMode) {
    let nearestDist = Infinity;
    let nearestEnemy = null;
    const evasionDist = 30;

    for (const enemy of enemyBoids) {
      let dx = enemy.x - boid.x;
      let dy = enemy.y - boid.y;

      if (boundaryMode === 'wrap') {
        if (dx > wrapWidth / 2) dx -= wrapWidth;
        if (dx < -wrapWidth / 2) dx += wrapWidth;
        if (dy > wrapHeight / 2) dy -= wrapHeight;
        if (dy < -wrapHeight / 2) dy += wrapHeight;
      }

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = enemy;
      }
    }

    if (!nearestEnemy) return;

    let dx = nearestEnemy.x - boid.x;
    let dy = nearestEnemy.y - boid.y;

    if (boundaryMode === 'wrap') {
      if (dx > wrapWidth / 2) dx -= wrapWidth;
      if (dx < -wrapWidth / 2) dx += wrapWidth;
      if (dy > wrapHeight / 2) dy -= wrapHeight;
      if (dy < -wrapHeight / 2) dy += wrapHeight;
    }

    const dist = nearestDist;

    // Aggression — steer toward nearest enemy
    if (aggression > 0 && dist > 0) {
      boid.applyForce(
        (dx / dist) * aggression * 0.03,
        (dy / dist) * aggression * 0.03
      );
    }

    // Evasion — steer away when close
    if (evasion > 0 && dist < evasionDist * 3 && dist > 0) {
      const evadeStrength = evasion * 0.05 * (1 - dist / (evasionDist * 3));
      boid.applyForce(
        -(dx / dist) * evadeStrength,
        -(dy / dist) * evadeStrength
      );
    }

    // Laser firing
    if (canFire && dist < firingRange && boid.fireCooldown <= 0) {
      // Check cone angle
      const heading = boid.getHeading();
      const angleToEnemy = Math.atan2(dy, dx);
      let angleDiff = angleToEnemy - heading;
      // Normalize to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < CONFIG.boid.firingConeAngle) {
        // Fire a short bolt in the heading direction, not all the way to the enemy
        const boltRange = 30; // short bolt travel distance
        boid.activeLaser = {
          startX: boid.x,
          startY: boid.y,
          dirX: Math.cos(heading),
          dirY: Math.sin(heading),
          range: boltRange,
          life: 10,
          maxLife: 10,
          faction: boid.faction,
        };
        boid.fireCooldown = CONFIG.boid.firingCooldown;
      }
    }
  }
}
