// renderer.js — Canvas drawing (background, ships, trails, lasers, obstacles, cursor)

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stars = [];
    this.offscreenStarfield = null;
    this.starTwinklePhases = [];
    this.nebulaGradients = null;
  }

  initStarfield(width, height) {
    this.stars = [];
    for (const layer of CONFIG.starfield.layers) {
      for (let i = 0; i < layer.count; i++) {
        this.stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0]),
          brightness: layer.brightnessRange[0] + Math.random() * (layer.brightnessRange[1] - layer.brightnessRange[0]),
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: CONFIG.starfield.twinkleSpeed * (0.5 + Math.random()),
          layer,
        });
      }
    }
    this._renderStarfieldToOffscreen(width, height);
  }

  _renderStarfieldToOffscreen(width, height) {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const octx = offscreen.getContext('2d');

    // Background
    octx.fillStyle = CONFIG.canvas.bgColor;
    octx.fillRect(0, 0, width, height);

    // Nebula wash
    const grad1 = octx.createRadialGradient(0, 0, 0, 0, 0, width * 0.5);
    grad1.addColorStop(0, 'rgba(40, 10, 60, 0.15)');
    grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    octx.fillStyle = grad1;
    octx.fillRect(0, 0, width, height);

    const grad2 = octx.createRadialGradient(width, height, 0, width, height, width * 0.4);
    grad2.addColorStop(0, 'rgba(10, 20, 60, 0.12)');
    grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    octx.fillStyle = grad2;
    octx.fillRect(0, 0, width, height);

    this.offscreenStarfield = offscreen;
  }

  drawBackground(time) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.offscreenStarfield) {
      ctx.drawImage(this.offscreenStarfield, 0, 0);
    } else {
      ctx.fillStyle = CONFIG.canvas.bgColor;
      ctx.fillRect(0, 0, w, h);
    }

    // Draw twinkling stars
    for (const star of this.stars) {
      star.twinklePhase += star.twinkleSpeed;
      const twinkle = 0.5 + 0.5 * Math.sin(star.twinklePhase);
      const alpha = star.brightness * (0.6 + 0.4 * twinkle);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  drawObstacles(obstacles) {
    const ctx = this.ctx;

    for (const obs of obstacles) {
      if (obs.type === 'deathstar') {
        this._drawDeathStar(obs);
      } else {
        this._drawAsteroid(obs);
      }
    }
  }

  _drawDeathStar(obs) {
    const ctx = this.ctx;
    const { x, y, radius } = obs;

    // Main sphere
    const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
    grad.addColorStop(0, 'rgba(100, 100, 110, 0.6)');
    grad.addColorStop(0.7, 'rgba(50, 50, 60, 0.5)');
    grad.addColorStop(1, 'rgba(30, 30, 35, 0.4)');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Equatorial trench
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.08, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(40, 40, 50, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Superlaser dish
    ctx.beginPath();
    ctx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.25, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(60, 60, 70, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(80, 80, 90, 0.3)';
    ctx.fill();

    // Outline
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(70, 70, 80, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  _drawAsteroid(obs) {
    const ctx = this.ctx;
    const { x, y, radius } = obs;

    // Irregular rocky shape using a seed from position
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const wobble = 0.7 + 0.3 * Math.sin(angle * 3 + x * 0.1);
      const r = radius * wobble;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, 0, 0, 0, radius);
    grad.addColorStop(0, 'rgba(90, 80, 70, 0.7)');
    grad.addColorStop(1, 'rgba(50, 45, 40, 0.5)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(70, 65, 55, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  drawTrails(boids) {
    const ctx = this.ctx;
    for (const boid of boids) {
      if (boid.trail.length < 2) continue;
      let color;
      if (boid.heroType === 'tieAdvanced') {
        color = [100, 255, 100]; // green for Vader
      } else if (boid.heroType === 'falcon') {
        color = [255, 200, 100]; // golden for Falcon
      } else {
        color = boid.faction === 'tie'
          ? [150, 180, 255]   // pale blue
          : [255, 120, 80];   // orange-red
      }
      const isHero = !!boid.heroType;

      for (let i = 1; i < boid.trail.length; i++) {
        const alpha = (1 - i / boid.trail.length) * (isHero ? 0.7 : 0.5);
        const width = (1 - i / boid.trail.length) * (isHero ? 3.5 : 2);
        ctx.beginPath();
        ctx.moveTo(boid.trail[i - 1].x, boid.trail[i - 1].y);
        ctx.lineTo(boid.trail[i].x, boid.trail[i].y);
        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
        ctx.lineWidth = width;
        ctx.stroke();
      }
    }
  }

  drawShip(boid) {
    const ctx = this.ctx;
    const heading = boid.getHeading();
    ctx.save();
    ctx.translate(boid.x, boid.y);
    ctx.rotate(heading);

    if (boid.heroType === 'tieAdvanced') {
      this._drawTieAdvanced(ctx);
    } else if (boid.heroType === 'falcon') {
      this._drawMillenniumFalcon(ctx);
    } else if (boid.faction === 'tie') {
      this._drawTieFighter(ctx);
    } else {
      this._drawXWing(ctx);
    }

    ctx.restore();
  }

  _drawTieFighter(ctx) {
    // H-shape: two vertical solar panels connected by horizontal strut to central cockpit
    // Rotate 90° so panels are perpendicular to direction of travel
    ctx.rotate(Math.PI / 2);
    const panelW = 3;
    const panelH = 12;
    const strutLen = 10;
    const cockpitR = 3;

    // Left panel
    ctx.fillStyle = '#555';
    ctx.fillRect(-strutLen / 2 - panelW, -panelH / 2, panelW, panelH);
    // Panel lines
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-strutLen / 2 - panelW / 2, -panelH / 2);
    ctx.lineTo(-strutLen / 2 - panelW / 2, panelH / 2);
    ctx.stroke();

    // Right panel
    ctx.fillStyle = '#555';
    ctx.fillRect(strutLen / 2, -panelH / 2, panelW, panelH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(strutLen / 2 + panelW / 2, -panelH / 2);
    ctx.lineTo(strutLen / 2 + panelW / 2, panelH / 2);
    ctx.stroke();

    // Strut
    ctx.fillStyle = '#666';
    ctx.fillRect(-strutLen / 2, -1, strutLen, 2);

    // Cockpit
    ctx.beginPath();
    ctx.arc(0, 0, cockpitR, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Cockpit window
    ctx.beginPath();
    ctx.arc(0, 0, cockpitR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
  }

  _drawXWing(ctx) {
    // Top-down X-Wing modeled after reference: long pointed fuselage,
    // two swept-back wings, engine pods, laser cannons at wing tips.
    // Ship faces RIGHT (heading 0 = right)

    // Fuselage — long pointed triangle
    ctx.beginPath();
    ctx.moveTo(12, 0);          // sharp nose
    ctx.lineTo(2, 2.5);         // widen behind nose
    ctx.lineTo(-4, 3);          // mid body
    ctx.lineTo(-8, 2.5);        // rear body
    ctx.lineTo(-8, -2.5);
    ctx.lineTo(-4, -3);
    ctx.lineTo(2, -2.5);
    ctx.closePath();
    ctx.fillStyle = '#ccc';
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Cockpit window (rectangular)
    ctx.fillStyle = '#333';
    ctx.fillRect(2, -1.2, 3.5, 2.4);
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.4;
    ctx.strokeRect(2, -1.2, 3.5, 2.4);

    // Astromech droid (circle behind cockpit)
    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#556';
    ctx.fill();

    // Wings — perpendicular to fuselage, each side
    for (const side of [-1, 1]) {
      // Wing strut straight out from body
      ctx.beginPath();
      ctx.moveTo(-1, side * 3);            // wing root front
      ctx.lineTo(-1, side * 10);           // wing tip front
      ctx.lineTo(-3, side * 10);           // wing tip rear
      ctx.lineTo(-3, side * 3);            // wing root rear
      ctx.closePath();
      ctx.fillStyle = '#bbb';
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 0.4;
      ctx.stroke();

      // Red accent stripe on wing
      ctx.beginPath();
      ctx.moveTo(-2, side * 4);
      ctx.lineTo(-2, side * 9.5);
      ctx.strokeStyle = 'rgba(200, 50, 50, 0.7)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Engine pod at wing root
      ctx.fillStyle = '#999';
      ctx.fillRect(-4, side * 3 - 1.2 * side, 3, 2.4 * side);
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 0.4;
      ctx.strokeRect(-4, side * 3 - 1.2 * side, 3, 2.4 * side);

      // Engine pod at wing tip
      ctx.fillStyle = '#999';
      ctx.fillRect(-3.5, side * 9 - 1 * side, 2.5, 2 * side);
      ctx.strokeStyle = '#777';
      ctx.lineWidth = 0.4;
      ctx.strokeRect(-3.5, side * 9 - 1 * side, 2.5, 2 * side);

      // Laser cannon — thin line extending from wing tip
      ctx.beginPath();
      ctx.moveTo(-2, side * 10.5);
      ctx.lineTo(-2, side * 13);
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 0.6;
      ctx.stroke();
      // Cannon tip
      ctx.beginPath();
      ctx.arc(-2, side * 13, 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ddd';
      ctx.fill();
    }
  }

  _drawTieAdvanced(ctx) {
    // Darth Vader's TIE Advanced x1 — top-down view
    // Elongated central fuselage with two angled/bent wings sweeping back
    // Scaled up 1.25x from standard TIE
    ctx.rotate(Math.PI / 2); // panels perpendicular to travel (same as standard TIE)

    const scale = 1.25;

    // Central fuselage — elongated hexagonal shape (longer than standard TIE)
    ctx.beginPath();
    ctx.moveTo(0, -8 * scale);      // nose
    ctx.lineTo(4 * scale, -4 * scale);
    ctx.lineTo(4 * scale, 6 * scale);
    ctx.lineTo(2 * scale, 8 * scale);
    ctx.lineTo(-2 * scale, 8 * scale);
    ctx.lineTo(-4 * scale, 6 * scale);
    ctx.lineTo(-4 * scale, -4 * scale);
    ctx.closePath();
    ctx.fillStyle = '#777';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Central spine detail
    ctx.beginPath();
    ctx.moveTo(0, -7 * scale);
    ctx.lineTo(0, 7 * scale);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Cockpit — larger sphere
    ctx.beginPath();
    ctx.arc(0, -1 * scale, 4 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Cockpit window
    ctx.beginPath();
    ctx.arc(0, -1 * scale, 2.2 * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();

    // Bent wings — each wing has two segments: inner angling out, outer angling back
    for (const side of [-1, 1]) {
      // Wing strut from fuselage
      ctx.beginPath();
      ctx.moveTo(side * 4 * scale, -2 * scale);
      ctx.lineTo(side * 6 * scale, -2 * scale);
      ctx.lineTo(side * 6 * scale, 2 * scale);
      ctx.lineTo(side * 4 * scale, 2 * scale);
      ctx.closePath();
      ctx.fillStyle = '#666';
      ctx.fill();

      // Inner wing panel (angled outward)
      ctx.beginPath();
      ctx.moveTo(side * 6 * scale, -5 * scale);
      ctx.lineTo(side * 10 * scale, -7 * scale);
      ctx.lineTo(side * 10 * scale, 7 * scale);
      ctx.lineTo(side * 6 * scale, 5 * scale);
      ctx.closePath();
      ctx.fillStyle = '#555';
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Wing panel dark solar cells
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(side * 6.5 * scale, -4.5 * scale, side * 3 * scale, 9 * scale);

      // Outer bent section (angled back further)
      ctx.beginPath();
      ctx.moveTo(side * 10 * scale, -7 * scale);
      ctx.lineTo(side * 13 * scale, -5 * scale);
      ctx.lineTo(side * 13 * scale, 5 * scale);
      ctx.lineTo(side * 10 * scale, 7 * scale);
      ctx.closePath();
      ctx.fillStyle = '#555';
      ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Outer panel dark solar cells
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(side * 10.3 * scale, -4.5 * scale, side * 2.2 * scale, 9 * scale);
    }

    // Red accent lights at rear
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(-1.5 * scale, 7.5 * scale, 3 * scale, 1 * scale);
  }

  _drawMillenniumFalcon(ctx) {
    // Millennium Falcon — top-down view
    // Disc body, wide-gap mandibles, cockpit tube pointing straight forward on starboard
    const s = 1.25; // scale factor

    // Main disc body
    ctx.beginPath();
    ctx.arc(0, 0, 10 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#aaa';
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Hull panel lines — concentric detail
    ctx.beginPath();
    ctx.arc(0, 0, 7 * s, 0, Math.PI * 2);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 4 * s, 0, Math.PI * 2);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.4;
    ctx.stroke();

    // Panel segment lines (radial)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 4 * s, Math.sin(angle) * 4 * s);
      ctx.lineTo(Math.cos(angle) * 10 * s, Math.sin(angle) * 10 * s);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }

    // Forward mandibles — wide gap between them
    // Upper mandible (starboard side, negative Y)
    ctx.beginPath();
    ctx.moveTo(8 * s, -6 * s);
    ctx.lineTo(17 * s, -4 * s);
    ctx.lineTo(17 * s, -2.5 * s);
    ctx.lineTo(8 * s, -3.5 * s);
    ctx.closePath();
    ctx.fillStyle = '#999';
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Lower mandible (port side, positive Y)
    ctx.beginPath();
    ctx.moveTo(8 * s, 6 * s);
    ctx.lineTo(17 * s, 4 * s);
    ctx.lineTo(17 * s, 2.5 * s);
    ctx.lineTo(8 * s, 3.5 * s);
    ctx.closePath();
    ctx.fillStyle = '#999';
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Mandible gap fill — small recessed plate
    ctx.beginPath();
    ctx.moveTo(8 * s, -3.5 * s);
    ctx.lineTo(11 * s, -2.5 * s);
    ctx.lineTo(11 * s, 2.5 * s);
    ctx.lineTo(8 * s, 3.5 * s);
    ctx.closePath();
    ctx.fillStyle = '#888';
    ctx.fill();

    // Cockpit tube — connects from disc edge, points straight forward
    ctx.beginPath();
    ctx.moveTo(5 * s, -9 * s);       // where tube meets disc
    ctx.lineTo(5 * s, -12 * s);      // front left
    ctx.lineTo(10 * s, -12 * s);     // front right
    ctx.lineTo(10 * s, -9 * s);      // rear right at disc edge
    ctx.closePath();
    ctx.fillStyle = '#999';
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 0.4;
    ctx.stroke();

    // Connection piece — fills the gap between tube and disc curve
    ctx.beginPath();
    ctx.moveTo(4 * s, -9.2 * s);
    ctx.quadraticCurveTo(3 * s, -10 * s, 5 * s, -10.5 * s);
    ctx.lineTo(5 * s, -9 * s);
    ctx.closePath();
    ctx.fillStyle = '#999';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(10 * s, -9 * s);
    ctx.lineTo(10 * s, -10.5 * s);
    ctx.quadraticCurveTo(11 * s, -10 * s, 10.5 * s, -9.2 * s);
    ctx.closePath();
    ctx.fillStyle = '#999';
    ctx.fill();

    // Cockpit window — at the forward tip of the tube
    ctx.beginPath();
    ctx.arc(10 * s, -11 * s, 1.3 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#446';
    ctx.fill();
    ctx.strokeStyle = '#667';
    ctx.lineWidth = 0.4;
    ctx.stroke();

    // Sensor dish (top center, slightly forward)
    ctx.beginPath();
    ctx.arc(2 * s, 0, 2 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#bbb';
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.4;
    ctx.stroke();
    // Dish center
    ctx.beginPath();
    ctx.arc(2 * s, 0, 0.8 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#999';
    ctx.fill();

    // Rear engine exhausts — three rectangles at the back
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = '#77aaff';
      ctx.fillRect(-11 * s, (i * 3 - 1) * s, 1.5 * s, 2 * s);
      ctx.strokeStyle = '#5588cc';
      ctx.lineWidth = 0.3;
      ctx.strokeRect(-11 * s, (i * 3 - 1) * s, 1.5 * s, 2 * s);
    }

    // Gun turret circles (top and bottom)
    ctx.beginPath();
    ctx.arc(-3 * s, -5 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#999';
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 0.3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-3 * s, 5 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#999';
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 0.3;
    ctx.stroke();
  }

  drawLasers(boids) {
    const ctx = this.ctx;
    for (const boid of boids) {
      const laser = boid.activeLaser;
      if (!laser) continue;

      const progress = 1 - laser.life / laser.maxLife;
      const alpha = laser.life / laser.maxLife;

      // Bolt travels outward from ship along its heading
      const traveled = progress * laser.range;
      const boltLen = 8;
      const headX = laser.startX + laser.dirX * (traveled + boltLen);
      const headY = laser.startY + laser.dirY * (traveled + boltLen);
      const tailX = laser.startX + laser.dirX * traveled;
      const tailY = laser.startY + laser.dirY * traveled;

      const color = laser.faction === 'tie'
        ? [255, 40, 40]     // Red for TIE
        : [40, 255, 40];    // Green for X-Wing

      // Glow (thicker, semi-transparent)
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.3})`;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Core (thin, bright)
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.9})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawExplosions(explosions) {
    const ctx = this.ctx;
    for (const exp of explosions) {
      const progress = 1 - exp.life / exp.maxLife;
      const alpha = exp.life / exp.maxLife;
      const maxRadius = 18;
      const radius = progress * maxRadius;

      // Outer fireball
      const color = exp.faction === 'tie'
        ? [150, 180, 255]   // blue-white for TIE
        : [255, 150, 50];   // orange for X-Wing
      const grad = ctx.createRadialGradient(exp.x, exp.y, 0, exp.x, exp.y, radius);
      grad.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.9})`);
      grad.addColorStop(0.4, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.6})`);
      grad.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Debris particles — small dots flying outward
      const particleCount = 6;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + exp.x * 0.1; // seeded angle
        const pDist = progress * maxRadius * (0.8 + Math.sin(i * 2.5) * 0.4);
        const px = exp.x + Math.cos(angle) * pDist;
        const py = exp.y + Math.sin(angle) * pDist;
        const pSize = (1 - progress) * 1.5;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 220, 100, ${alpha * 0.8})`;
        ctx.fill();
      }
    }
  }

  drawMouseCursor(mouseX, mouseY, mouseMode) {
    if (mouseX === null || mouseY === null || mouseMode === 'spawn') return;
    const ctx = this.ctx;
    const r = CONFIG.mouse.radius;

    ctx.beginPath();
    ctx.arc(mouseX, mouseY, r, 0, Math.PI * 2);
    ctx.strokeStyle = mouseMode === 'attract'
      ? 'rgba(100, 200, 255, 0.25)'
      : 'rgba(255, 100, 100, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner glow
    const grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, r);
    grad.addColorStop(0, mouseMode === 'attract'
      ? 'rgba(100, 200, 255, 0.08)'
      : 'rgba(255, 100, 100, 0.08)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
