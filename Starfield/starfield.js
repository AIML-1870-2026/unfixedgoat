// Star Wars Hyperspace Starfield
// Get canvas and context
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

// Set canvas to full window size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Hyperspace configuration
const config = {
    numStars: 500,
    speed: 8,
    baseSpeed: 8, // Store the base speed for hyperdrive
    hyperdriveMultiplier: 3.5, // Speed multiplier during hyperdrive
    maxSpeed: 40,
    acceleration: 0.05,
    centerX: canvas.width / 2,
    centerY: canvas.height / 2,
    trailLength: 150,
    baseTrailLength: 150, // Store base trail length
    spawnRadius: 0
};

// Hyperdrive state
let hyperdriveActive = false;

// Laser blast class for TIE fighter weapons
class LaserBlast {
    constructor(side) {
        // Start from bottom corners at fixed angles
        // side: 'left' or 'right'

        if (side === 'left') {
            // Bottom left corner, angled toward center
            this.startX = canvas.width * 0.15;
            this.startY = canvas.height * 0.9;
        } else {
            // Bottom right corner, angled toward center
            this.startX = canvas.width * 0.85;
            this.startY = canvas.height * 0.9;
        }

        // Calculate angle from start position to center
        const dx = config.centerX - this.startX;
        const dy = config.centerY - this.startY;
        this.rotation = Math.atan2(dy, dx);

        // Current position starts at bottom corner
        this.x = this.startX;
        this.y = this.startY;

        // Distance traveled inward
        this.distance = 0;

        // Movement speed and trail
        this.speed = 12;
        this.baseWidth = 12;
        this.baseTrailLength = 100;

        // Calculate max distance (stop before reaching center)
        const maxDist = Math.sqrt(dx * dx + dy * dy);
        this.maxDistance = maxDist - 80;

        // Direction vector toward center
        this.dirX = dx / maxDist;
        this.dirY = dy / maxDist;
    }

    update() {
        // Move distance inward
        this.distance += this.speed;

        // Calculate how far we've progressed (0 = start, 1 = end)
        const progress = this.distance / this.maxDistance;

        // Move toward center in straight line
        this.x = this.startX + this.dirX * this.distance;
        this.y = this.startY + this.dirY * this.distance;

        // Scale down width and trail as we approach center (simulating depth)
        this.width = this.baseWidth * (1 - progress * 0.7); // Shrink to 30% of original
        this.trailLength = this.baseTrailLength * (1 - progress * 0.5); // Shrink trail too

        // Remove if reached max distance
        return this.distance < this.maxDistance;
    }

    draw() {
        // Calculate trail start position (behind the laser along direction vector)
        const trailStartX = this.x - this.dirX * this.trailLength;
        const trailStartY = this.y - this.dirY * this.trailLength;

        // Draw thick red laser tube with gradient
        ctx.beginPath();
        ctx.moveTo(trailStartX, trailStartY);
        ctx.lineTo(this.x, this.y);

        const gradient = ctx.createLinearGradient(trailStartX, trailStartY, this.x, this.y);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(0.2, 'rgba(255, 60, 60, 0.9)');
        gradient.addColorStop(1, 'rgba(255, 120, 120, 1)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw bright core down the center
        ctx.beginPath();
        ctx.moveTo(trailStartX, trailStartY);
        ctx.lineTo(this.x, this.y);

        const coreGradient = ctx.createLinearGradient(trailStartX, trailStartY, this.x, this.y);
        coreGradient.addColorStop(0, 'rgba(255, 200, 200, 0)');
        coreGradient.addColorStop(0.3, 'rgba(255, 220, 220, 0.8)');
        coreGradient.addColorStop(1, 'rgba(255, 255, 255, 1)');

        ctx.strokeStyle = coreGradient;
        ctx.lineWidth = this.width * 0.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Add outer glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.fill();
    }
}

// Array to store active laser blasts
const laserBlasts = [];

// Star class for individual particles
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        // 3D angle - particles spread from 5 to 35 degrees off-axis (no particles at 0 degrees)
        // Use power distribution to concentrate particles near center
        const spreadFactor = Math.pow(Math.random(), 2); // Bias toward smaller values
        this.angleFromCenter = (5 + spreadFactor * 30) * (Math.PI / 180); // 5 to 35 degrees in radians

        // Random rotation around the center axis (0-360 degrees)
        this.rotation = Math.random() * Math.PI * 2;

        // Start from a slightly larger aperture at the center
        this.distance = Math.random() * 20;

        // Calculate 2D screen position based on 3D angles
        // Project the 3D position onto 2D screen
        const screenRadius = this.distance * Math.sin(this.angleFromCenter);
        this.x = config.centerX + Math.cos(this.rotation) * screenRadius;
        this.y = config.centerY + Math.sin(this.rotation) * screenRadius;

        // Z-depth component (distance toward viewer)
        this.z = this.distance * Math.cos(this.angleFromCenter);

        // Individual speed multiplier for variation
        this.speedMultiplier = 0.5 + Math.random() * 0.5;

        // Much smaller particle size (constant, no depth scaling)
        this.baseSize = 0.2 + Math.random() * 0.3;
        this.size = this.baseSize;

        // Color variation (blue-white spectrum like hyperspace)
        this.colorVariation = Math.random();

        // Trail history for smooth long streaks
        this.trailPoints = [];
    }

    update() {
        // Add current position to trail history
        this.trailPoints.push({ x: this.x, y: this.y });

        // Limit trail length for performance
        if (this.trailPoints.length > 20) {
            this.trailPoints.shift();
        }

        // Move outward in 3D space at constant speed
        this.distance += config.speed * this.speedMultiplier;
        this.z = this.distance * Math.cos(this.angleFromCenter);

        // Update 2D screen position based on 3D position
        const screenRadius = this.distance * Math.sin(this.angleFromCenter);
        this.x = config.centerX + Math.cos(this.rotation) * screenRadius;
        this.y = config.centerY + Math.sin(this.rotation) * screenRadius;

        // Keep size constant (no depth scaling)
        this.size = this.baseSize;

        // Reset if star goes off screen or gets too large (before size grows)
        const margin = 100;
        const maxScreenRadius = Math.max(canvas.width, canvas.height) * 0.4; // Terminate at 40% of screen

        if (this.x < -margin || this.x > canvas.width + margin ||
            this.y < -margin || this.y > canvas.height + margin ||
            screenRadius > maxScreenRadius) {
            this.reset();
        }
    }

    draw() {
        // Color gradient from blue to white based on variation
        let r, g, b;
        if (this.colorVariation < 0.3) {
            // Blue-white stars
            r = 150 + Math.floor(this.colorVariation * 350);
            g = 180 + Math.floor(this.colorVariation * 250);
            b = 255;
        } else if (this.colorVariation < 0.7) {
            // Pure white stars
            r = g = b = 255;
        } else {
            // Slight cyan tint
            r = 200;
            g = 230;
            b = 255;
        }

        // Calculate opacity based on distance (fade in effect)
        const opacity = Math.min(this.distance / 100, 1);

        // Draw long solid trail from center
        if (this.distance > 10) {
            // Calculate trail start position (much further back for long streaks)
            const trailDistance = Math.max(0, this.distance - config.trailLength);
            const trailScreenRadius = trailDistance * Math.sin(this.angleFromCenter);
            const trailStartX = config.centerX + Math.cos(this.rotation) * trailScreenRadius;
            const trailStartY = config.centerY + Math.sin(this.rotation) * trailScreenRadius;

            // Draw solid trail line
            ctx.beginPath();
            ctx.moveTo(trailStartX, trailStartY);
            ctx.lineTo(this.x, this.y);

            // Create gradient along the entire trail
            const gradient = ctx.createLinearGradient(
                trailStartX, trailStartY,
                this.x, this.y
            );
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.6})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${opacity})`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Draw bright point at the head
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.fill();
        }
    }
}

// Create star array
const stars = [];
for (let i = 0; i < config.numStars; i++) {
    stars.push(new Star());
}

// Animation loop
function animate() {
    // Clear the canvas completely for crisp trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw each star
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    // Update and draw laser blasts (drawn after stars so they appear on top)
    for (let i = laserBlasts.length - 1; i >= 0; i--) {
        const blast = laserBlasts[i];
        if (!blast.update()) {
            laserBlasts.splice(i, 1);
        } else {
            blast.draw();
        }
    }

    requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    config.centerX = canvas.width / 2;
    config.centerY = canvas.height / 2;
});

// Start animation
animate();

// Control panel event listeners
document.getElementById('trailLength').addEventListener('input', (e) => {
    config.baseTrailLength = parseInt(e.target.value);
    config.trailLength = parseInt(e.target.value);
    document.getElementById('trailLengthValue').textContent = e.target.value;
});

document.getElementById('starCount').addEventListener('input', (e) => {
    const newCount = parseInt(e.target.value);
    document.getElementById('starCountValue').textContent = e.target.value;

    // Add or remove stars to match the new count
    if (newCount > stars.length) {
        // Add stars
        for (let i = stars.length; i < newCount; i++) {
            stars.push(new Star());
        }
    } else {
        // Remove stars
        stars.length = newCount;
    }
    config.numStars = newCount;
});

document.getElementById('starSpeed').addEventListener('input', (e) => {
    config.baseSpeed = parseInt(e.target.value);
    if (!hyperdriveActive) {
        config.speed = parseInt(e.target.value);
    }
    document.getElementById('starSpeedValue').textContent = e.target.value;
});

// Toggle button functionality
const toggleButton = document.getElementById('toggleButton');
const controlsPanel = document.getElementById('controls');
let controlsVisible = true;

toggleButton.addEventListener('click', () => {
    controlsVisible = !controlsVisible;

    if (controlsVisible) {
        controlsPanel.classList.remove('hidden');
        toggleButton.classList.add('shifted');
        toggleButton.textContent = 'Hide Controls';
    } else {
        controlsPanel.classList.add('hidden');
        toggleButton.classList.remove('shifted');
        toggleButton.textContent = 'Show Controls';
    }
});

// Hyperdrive controls - spacebar activation
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !hyperdriveActive) {
        e.preventDefault(); // Prevent page scroll
        hyperdriveActive = true;
        config.speed = config.baseSpeed * config.hyperdriveMultiplier;
        config.trailLength = config.baseTrailLength * 1.5; // Longer trails during hyperdrive
    }

    // Laser blast controls - B key fires twin lasers
    if (e.code === 'KeyB') {
        e.preventDefault();
        // Fire two laser blasts, one from each side (left and right)
        laserBlasts.push(new LaserBlast('left'));
        laserBlasts.push(new LaserBlast('right'));
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && hyperdriveActive) {
        e.preventDefault();
        hyperdriveActive = false;
        config.speed = config.baseSpeed;
        config.trailLength = config.baseTrailLength;
    }
});
