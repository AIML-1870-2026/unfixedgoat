// Stellar Web - Interactive 3D Network Visualization
// Phase 1: Scene Setup and Particle System

class StellarWeb {
    constructor() {
        // Configuration
        this.config = {
            particleCount: 200,
            connectivityRadius: 20,
            maxConnections: 5,
            particleSpeed: 0.5,
            colorMode: 'rainbow',
            wavelength: 700, // Wavelength in nm (380-700, red to violet)
            boundarySize: 100,
            connectionFadeTime: 1500 // Time in ms for connections to fade out
        };

        // Calculate boundary size based on viewport
        this.updateBoundarySize();

        // Scene, Camera, Renderer
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        // Particles and connections
        this.particles = [];
        this.connections = new Map(); // Map of connection key -> {mesh}
        this.connectionMap = new Map(); // Track connection lifespans

        // Statistics tracking
        this.stats = {
            collisionsThisSecond: 0,
            lastSecondTimestamp: Date.now(),
            connectionChanges: 0,
            lastStabilityCheck: Date.now()
        };

        // Boundary cube
        this.boundaryBox = null;

        this.init();
        this.createBoundaryBox();
        this.createParticles();
        this.setupControls();
        this.animate();
    }

    updateBoundarySize() {
        // Calculate boundary to fill viewport based on camera FOV
        // For FOV 75 degrees, calculate visible area at optimal viewing distance
        const fov = 75 * (Math.PI / 180); // Convert to radians
        const optimalDistance = 150; // Camera distance

        // Calculate visible height at this distance
        const visibleHeight = 2 * Math.tan(fov / 2) * optimalDistance;
        const visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);

        // Set boundary to 80% of visible area (with some padding for edges)
        const maxDimension = Math.min(visibleWidth, visibleHeight) * 0.4;
        this.config.boundarySize = maxDimension;
    }

    wavelengthToRGB(wavelength) {
        // Convert wavelength in nm (380-700) to RGB color
        // Based on approximate wavelength to RGB conversion
        let r, g, b;

        if (wavelength >= 380 && wavelength < 440) {
            // Violet to Blue
            r = -(wavelength - 440) / (440 - 380);
            g = 0.0;
            b = 1.0;
        } else if (wavelength >= 440 && wavelength < 490) {
            // Blue to Cyan
            r = 0.0;
            g = (wavelength - 440) / (490 - 440);
            b = 1.0;
        } else if (wavelength >= 490 && wavelength < 510) {
            // Cyan to Green
            r = 0.0;
            g = 1.0;
            b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            // Green to Yellow
            r = (wavelength - 510) / (580 - 510);
            g = 1.0;
            b = 0.0;
        } else if (wavelength >= 580 && wavelength < 645) {
            // Yellow to Orange to Red
            r = 1.0;
            g = -(wavelength - 645) / (645 - 580);
            b = 0.0;
        } else if (wavelength >= 645 && wavelength <= 700) {
            // Red
            r = 1.0;
            g = 0.0;
            b = 0.0;
        } else {
            // Out of range
            r = 0.0;
            g = 0.0;
            b = 0.0;
        }

        // Apply intensity factor for edge wavelengths
        let factor;
        if (wavelength >= 380 && wavelength < 420) {
            factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
        } else if (wavelength >= 420 && wavelength < 645) {
            factor = 1.0;
        } else if (wavelength >= 645 && wavelength <= 700) {
            factor = 0.3 + 0.7 * (700 - wavelength) / (700 - 645);
        } else {
            factor = 0.0;
        }

        // Boost the intensity for better visibility
        const gamma = 0.8;
        r = Math.pow(r * factor, gamma);
        g = Math.pow(g * factor, gamma);
        b = Math.pow(b * factor, gamma);

        return new THREE.Color(r, g, b);
    }

    init() {
        // Set up renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 1);
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Position camera at optimal distance for viewing
        this.camera.position.z = 150;
        this.camera.position.y = 20;
        this.camera.lookAt(0, 0, 0);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createBoundaryBox() {
        // Remove old boundary box if it exists
        if (this.boundaryBox) {
            this.scene.remove(this.boundaryBox);
        }

        const size = this.config.boundarySize;

        // Create box geometry
        const geometry = new THREE.BoxGeometry(size, size, size);

        // Create edges geometry for wireframe effect
        const edges = new THREE.EdgesGeometry(geometry);

        // Create line material with visible color
        const material = new THREE.LineBasicMaterial({
            color: 0x666666,
            transparent: true,
            opacity: 0.6
        });

        // Create line segments
        this.boundaryBox = new THREE.LineSegments(edges, material);

        this.scene.add(this.boundaryBox);
    }

    createParticles() {
        // Clear existing particles
        this.particles.forEach(particle => {
            this.scene.remove(particle.mesh);
        });
        this.particles = [];

        const particleRadius = 0.8;

        for (let i = 0; i < this.config.particleCount; i++) {
            // Create sphere geometry
            const geometry = new THREE.SphereGeometry(particleRadius, 16, 16);

            // Get color based on mode
            const color = this.getParticleColor(i);

            // Create material with emission for glow effect
            const material = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.5,
                roughness: 0.3,
                metalness: 0.7
            });

            const mesh = new THREE.Mesh(geometry, material);

            // Random position within boundary
            const boundary = this.config.boundarySize;
            mesh.position.x = (Math.random() - 0.5) * boundary;
            mesh.position.y = (Math.random() - 0.5) * boundary;
            mesh.position.z = (Math.random() - 0.5) * boundary;

            // Random velocity
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * this.config.particleSpeed,
                (Math.random() - 0.5) * this.config.particleSpeed,
                (Math.random() - 0.5) * this.config.particleSpeed
            );

            this.scene.add(mesh);

            this.particles.push({
                mesh: mesh,
                velocity: velocity,
                radius: particleRadius,
                connections: [],
                floatOffset: Math.random() * Math.PI * 2 // Random phase offset for floating animation
            });
        }
    }

    getParticleColor(index) {
        switch (this.config.colorMode) {
            case 'rainbow':
                const hue = (index / this.config.particleCount);
                return new THREE.Color().setHSL(hue, 1.0, 0.6);
            case 'gbr':
                // Red, White, Black pattern
                const colorChoice = index % 3;
                if (colorChoice === 0) {
                    return new THREE.Color(1.0, 0.0, 0.0); // Red
                } else if (colorChoice === 1) {
                    return new THREE.Color(1.0, 1.0, 1.0); // White
                } else {
                    return new THREE.Color(0.1, 0.1, 0.1); // Dark gray (pure black doesn't glow well)
                }
            case 'hue':
            default:
                // Use wavelength to RGB conversion
                return this.wavelengthToRGB(this.config.wavelength);
        }
    }

    updateParticleColors() {
        this.particles.forEach((particle, index) => {
            const color = this.getParticleColor(index);
            particle.mesh.material.color = color;
            particle.mesh.material.emissive = color;
        });
    }

    updateParticles() {
        const boundary = this.config.boundarySize / 2;
        const time = Date.now() * 0.001; // Convert to seconds

        this.particles.forEach(particle => {
            // Add subtle floating motion for more organic feel
            const floatAmount = 0.02;
            const floatX = Math.sin(time + particle.floatOffset) * floatAmount;
            const floatY = Math.cos(time * 0.7 + particle.floatOffset) * floatAmount;
            const floatZ = Math.sin(time * 0.5 + particle.floatOffset) * floatAmount;

            // Update position with velocity and floating
            particle.mesh.position.x += particle.velocity.x + floatX;
            particle.mesh.position.y += particle.velocity.y + floatY;
            particle.mesh.position.z += particle.velocity.z + floatZ;

            // Boundary collision (bounce off walls)
            if (Math.abs(particle.mesh.position.x) > boundary) {
                particle.velocity.x *= -1;
                particle.mesh.position.x = Math.sign(particle.mesh.position.x) * boundary;
            }
            if (Math.abs(particle.mesh.position.y) > boundary) {
                particle.velocity.y *= -1;
                particle.mesh.position.y = Math.sign(particle.mesh.position.y) * boundary;
            }
            if (Math.abs(particle.mesh.position.z) > boundary) {
                particle.velocity.z *= -1;
                particle.mesh.position.z = Math.sign(particle.mesh.position.z) * boundary;
            }

            // Subtle pulsing glow effect
            const pulseIntensity = 0.4 + Math.sin(time * 2 + particle.floatOffset) * 0.1;
            particle.mesh.material.emissiveIntensity = pulseIntensity;
        });

        // Check for particle-particle collisions
        this.checkCollisions();
    }

    checkCollisions() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];

                const distance = p1.mesh.position.distanceTo(p2.mesh.position);
                const minDistance = p1.radius + p2.radius;

                if (distance < minDistance) {
                    // Collision detected!
                    this.handleCollision(p1, p2);
                    this.stats.collisionsThisSecond++;
                }
            }
        }
    }

    handleCollision(p1, p2) {
        // Calculate collision normal
        const normal = new THREE.Vector3()
            .subVectors(p2.mesh.position, p1.mesh.position)
            .normalize();

        // Calculate relative velocity
        const relativeVelocity = new THREE.Vector3()
            .subVectors(p1.velocity, p2.velocity);

        // Calculate velocity along collision normal
        const velocityAlongNormal = relativeVelocity.dot(normal);

        // Don't resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution (bounciness)
        const restitution = 0.8;

        // Calculate impulse scalar
        const impulseScalar = -(1 + restitution) * velocityAlongNormal / 2;

        // Apply impulse
        const impulse = normal.clone().multiplyScalar(impulseScalar);
        p1.velocity.add(impulse);
        p2.velocity.sub(impulse);

        // Separate overlapping particles
        const overlap = (p1.radius + p2.radius) - p1.mesh.position.distanceTo(p2.mesh.position);
        const separation = normal.clone().multiplyScalar(overlap / 2);
        p1.mesh.position.sub(separation);
        p2.mesh.position.add(separation);
    }

    updateConnections() {
        // Reset connection counts
        this.particles.forEach(p => p.connections = []);

        const currentTime = Date.now();
        const newConnectionMap = new Map();
        const activeConnections = new Set();
        let connectionChanges = 0;

        // Determine which connections should exist
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];

            // Skip if already at max connections
            if (p1.connections.length >= this.config.maxConnections) continue;

            // Find nearby particles
            const distances = [];
            for (let j = i + 1; j < this.particles.length; j++) {
                const p2 = this.particles[j];
                const distance = p1.mesh.position.distanceTo(p2.mesh.position);

                if (distance < this.config.connectivityRadius) {
                    distances.push({ index: j, distance: distance });
                }
            }

            // Sort by distance and connect to closest particles
            distances.sort((a, b) => a.distance - b.distance);

            for (let d of distances) {
                const p2 = this.particles[d.index];

                // Check if both particles can have more connections
                if (p1.connections.length >= this.config.maxConnections) break;
                if (p2.connections.length >= this.config.maxConnections) continue;

                // Create connection key
                const connKey = `${i}-${d.index}`;

                // Mark this connection as active
                activeConnections.add(connKey);
                p1.connections.push(d.index);
                p2.connections.push(i);

                // Track connection lifespan
                if (this.connectionMap.has(connKey)) {
                    newConnectionMap.set(connKey, this.connectionMap.get(connKey));
                } else {
                    newConnectionMap.set(connKey, currentTime);
                    connectionChanges++;
                }

                // Create or update connection mesh
                this.updateConnectionMesh(i, d.index, p1, p2, connKey);
            }
        }

        // Handle connections that are no longer active - fade them out
        this.connections.forEach((conn, key) => {
            if (!activeConnections.has(key)) {
                if (!conn.fadeStartTime) {
                    // Start fading out
                    conn.fadeStartTime = currentTime;
                    connectionChanges++;
                }

                // Calculate fade progress
                const fadeProgress = (currentTime - conn.fadeStartTime) / this.config.connectionFadeTime;

                if (fadeProgress >= 1.0) {
                    // Fade complete, remove connection
                    this.scene.remove(conn.mesh);
                    this.connections.delete(key);
                } else {
                    // Update opacity based on fade progress
                    conn.mesh.material.opacity = 0.7 * (1 - fadeProgress);
                }
            } else {
                // Connection is active again, reset fade
                if (conn.fadeStartTime) {
                    conn.fadeStartTime = null;
                    conn.mesh.material.opacity = 0.7;
                }
            }
        });

        // Track connection changes
        this.stats.connectionChanges = connectionChanges;
        this.connectionMap = newConnectionMap;
    }

    updateConnectionMesh(i, j, p1, p2, connKey) {
        const start = p1.mesh.position;
        const end = p2.mesh.position;
        const distance = start.distanceTo(end);

        // Check if connection already exists
        if (this.connections.has(connKey)) {
            // Update existing connection
            const conn = this.connections.get(connKey);
            const midpoint = new THREE.Vector3()
                .addVectors(start, end)
                .multiplyScalar(0.5);

            // Update position
            conn.mesh.position.copy(midpoint);

            // Update scale (length)
            conn.mesh.scale.y = distance;

            // Update rotation to point at end particle
            conn.mesh.lookAt(end);
            conn.mesh.rotateX(Math.PI / 2);

            // Update color based on current particle colors
            const color1 = p1.mesh.material.color;
            const color2 = p2.mesh.material.color;
            const mixedColor = new THREE.Color(
                (color1.r + color2.r) / 2,
                (color1.g + color2.g) / 2,
                (color1.b + color2.b) / 2
            );
            conn.mesh.material.color = mixedColor;
            conn.mesh.material.emissive = mixedColor;
        } else {
            // Create new connection
            const midpoint = new THREE.Vector3()
                .addVectors(start, end)
                .multiplyScalar(0.5);

            // Create cylinder geometry (unit height, we'll scale it)
            const geometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);

            // Mix colors of the two particles
            const color1 = p1.mesh.material.color;
            const color2 = p2.mesh.material.color;
            const mixedColor = new THREE.Color(
                (color1.r + color2.r) / 2,
                (color1.g + color2.g) / 2,
                (color1.b + color2.b) / 2
            );

            // Create glowing material
            const material = new THREE.MeshStandardMaterial({
                color: mixedColor,
                emissive: mixedColor,
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.7
            });

            const cylinder = new THREE.Mesh(geometry, material);

            // Position and orient the cylinder
            cylinder.position.copy(midpoint);
            cylinder.scale.y = distance;
            cylinder.lookAt(end);
            cylinder.rotateX(Math.PI / 2);

            this.scene.add(cylinder);
            this.connections.set(connKey, { mesh: cylinder, fadeStartTime: null });
        }
    }

    updateStatistics() {
        const now = Date.now();

        // Update collisions per second
        if (now - this.stats.lastSecondTimestamp >= 1000) {
            document.getElementById('stat-collisions').textContent = this.stats.collisionsThisSecond;
            this.stats.collisionsThisSecond = 0;
            this.stats.lastSecondTimestamp = now;
        }

        // Total edges
        const totalEdges = this.connections.size;
        document.getElementById('stat-edges').textContent = totalEdges;

        // Average connections per node
        const totalConnections = this.particles.reduce((sum, p) => sum + p.connections.length, 0);
        const avgConnections = totalConnections / this.particles.length;
        document.getElementById('stat-avg-connections').textContent = avgConnections.toFixed(1);

        // Network density (percentage of possible connections that exist)
        const maxPossibleEdges = (this.particles.length * (this.particles.length - 1)) / 2;
        const density = maxPossibleEdges > 0 ? (totalEdges / maxPossibleEdges) * 100 : 0;
        document.getElementById('stat-density').textContent = density.toFixed(1) + '%';

        // Clustering coefficient
        const clustering = this.calculateClusteringCoefficient();
        document.getElementById('stat-clustering').textContent = clustering.toFixed(2);

        // Average connection lifespan
        const avgLifespan = this.calculateAverageConnectionLifespan(now);
        document.getElementById('stat-lifespan').textContent = avgLifespan.toFixed(1) + 's';

        // Average velocity
        const avgVelocity = this.calculateAverageVelocity();
        document.getElementById('stat-velocity').textContent = avgVelocity.toFixed(2);

        // Temperature (based on velocity)
        const temperature = this.getTemperature(avgVelocity);
        const tempElement = document.getElementById('stat-temperature');
        tempElement.textContent = temperature.label;
        tempElement.style.color = temperature.color;

        // Web stability (percentage of connections that didn't change)
        const stability = this.calculateStability();
        document.getElementById('stat-stability').textContent = stability.toFixed(0) + '%';
    }

    calculateClusteringCoefficient() {
        if (this.particles.length === 0) return 0;

        let totalCoefficient = 0;

        this.particles.forEach((particle, i) => {
            const neighbors = particle.connections;
            if (neighbors.length < 2) return; // Need at least 2 neighbors

            // Count connections between neighbors
            let neighborConnections = 0;
            for (let j = 0; j < neighbors.length; j++) {
                for (let k = j + 1; k < neighbors.length; k++) {
                    const n1 = this.particles[neighbors[j]];
                    const n2 = this.particles[neighbors[k]];

                    if (n1.connections.includes(neighbors[k])) {
                        neighborConnections++;
                    }
                }
            }

            // Coefficient for this node
            const maxPossible = (neighbors.length * (neighbors.length - 1)) / 2;
            if (maxPossible > 0) {
                totalCoefficient += neighborConnections / maxPossible;
            }
        });

        return totalCoefficient / this.particles.length;
    }

    calculateAverageConnectionLifespan(currentTime) {
        if (this.connectionMap.size === 0) return 0;

        let totalLifespan = 0;
        this.connectionMap.forEach(birthTime => {
            totalLifespan += (currentTime - birthTime) / 1000; // Convert to seconds
        });

        return totalLifespan / this.connectionMap.size;
    }

    calculateAverageVelocity() {
        if (this.particles.length === 0) return 0;

        const totalVelocity = this.particles.reduce((sum, p) => {
            return sum + p.velocity.length();
        }, 0);

        return totalVelocity / this.particles.length;
    }

    getTemperature(velocity) {
        if (velocity < 0.3) {
            return { label: 'Cold', color: '#4da6ff' };
        } else if (velocity < 0.6) {
            return { label: 'Warm', color: '#4CAF50' };
        } else if (velocity < 1.0) {
            return { label: 'Hot', color: '#ff9800' };
        } else {
            return { label: 'Blazing', color: '#f44336' };
        }
    }

    calculateStability() {
        // Stability is inverse of connection changes
        // More changes = less stable
        const maxChanges = this.particles.length * 2; // Arbitrary scaling
        const stability = Math.max(0, 100 - (this.stats.connectionChanges / maxChanges) * 100);
        return stability;
    }

    setupControls() {
        // Particle count slider
        const particleCountSlider = document.getElementById('particle-count');
        const particleCountValue = document.getElementById('particle-count-value');

        particleCountSlider.addEventListener('input', (e) => {
            this.config.particleCount = parseInt(e.target.value);
            particleCountValue.textContent = this.config.particleCount;
            this.createParticles();
        });

        // Connectivity radius slider
        const radiusSlider = document.getElementById('connectivity-radius');
        const radiusValue = document.getElementById('radius-value');

        radiusSlider.addEventListener('input', (e) => {
            this.config.connectivityRadius = parseInt(e.target.value);
            radiusValue.textContent = this.config.connectivityRadius;
        });

        // Speed slider
        const speedSlider = document.getElementById('particle-speed');
        const speedValue = document.getElementById('speed-value');

        speedSlider.addEventListener('input', (e) => {
            this.config.particleSpeed = parseFloat(e.target.value);
            speedValue.textContent = this.config.particleSpeed.toFixed(1);

            // Update existing particle velocities
            this.particles.forEach(particle => {
                particle.velocity.normalize().multiplyScalar(this.config.particleSpeed);
            });
        });

        // Wavelength slider
        const hueSlider = document.getElementById('color-hue');
        const hueValue = document.getElementById('hue-value');

        hueSlider.addEventListener('input', (e) => {
            this.config.wavelength = parseFloat(e.target.value);

            // Update label with wavelength
            hueValue.textContent = Math.round(this.config.wavelength) + ' nm';

            // Update colors if in hue mode
            if (this.config.colorMode === 'hue') {
                this.updateParticleColors();
            }
        });

        // Color mode buttons
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                colorButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');

                // Update color mode
                this.config.colorMode = btn.dataset.color;

                // Enable/disable hue slider based on mode
                if (this.config.colorMode === 'hue') {
                    hueSlider.classList.remove('disabled');
                    hueValue.classList.remove('disabled');
                } else {
                    hueSlider.classList.add('disabled');
                    hueValue.classList.add('disabled');
                }

                this.updateParticleColors();
            });
        });

        // Controls panel toggle
        const controlsToggle = document.getElementById('controls-toggle');
        const controlsPanel = document.getElementById('controls-panel');
        let controlsVisible = true;

        controlsToggle.addEventListener('click', () => {
            controlsVisible = !controlsVisible;

            if (controlsVisible) {
                controlsPanel.classList.remove('hidden');
                controlsToggle.classList.remove('hidden');
                controlsToggle.textContent = '◀';
            } else {
                controlsPanel.classList.add('hidden');
                controlsToggle.classList.add('hidden');
                controlsToggle.textContent = '▶';
            }
        });

        // Stats panel toggle
        const statsToggle = document.getElementById('stats-toggle');
        const statsPanel = document.getElementById('stats-panel');
        let statsVisible = false;

        statsToggle.addEventListener('click', () => {
            statsVisible = !statsVisible;

            if (statsVisible) {
                statsPanel.classList.add('visible');
                statsToggle.classList.add('visible');
                statsToggle.textContent = '▼';
            } else {
                statsPanel.classList.remove('visible');
                statsToggle.classList.remove('visible');
                statsToggle.textContent = '▲';
            }
        });

        // Rotate camera around origin with mouse drag
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        // Store camera rotation angles
        this.cameraRotation = {
            theta: Math.atan2(this.camera.position.x, this.camera.position.z),
            phi: Math.atan2(this.camera.position.y, Math.sqrt(this.camera.position.x ** 2 + this.camera.position.z ** 2)),
            radius: Math.sqrt(this.camera.position.x ** 2 + this.camera.position.y ** 2 + this.camera.position.z ** 2)
        };

        this.renderer.domElement.addEventListener('mousedown', () => {
            isDragging = true;
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - previousMousePosition.x;
                const deltaY = e.clientY - previousMousePosition.y;

                // Update rotation angles
                this.cameraRotation.theta -= deltaX * 0.005;
                this.cameraRotation.phi += deltaY * 0.005;

                // Clamp phi to avoid gimbal lock
                this.cameraRotation.phi = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraRotation.phi));

                // Convert spherical coordinates to Cartesian
                this.camera.position.x = this.cameraRotation.radius * Math.sin(this.cameraRotation.phi) * Math.sin(this.cameraRotation.theta);
                this.camera.position.y = this.cameraRotation.radius * Math.cos(this.cameraRotation.phi);
                this.camera.position.z = this.cameraRotation.radius * Math.sin(this.cameraRotation.phi) * Math.cos(this.cameraRotation.theta);

                this.camera.lookAt(0, 0, 0);
            }

            previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Update boundary size to match new viewport
        this.updateBoundarySize();

        // Update the boundary box visualization
        this.createBoundaryBox();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update particles
        this.updateParticles();

        // Update connections
        this.updateConnections();

        // Update statistics
        this.updateStatistics();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the application when page loads
window.addEventListener('DOMContentLoaded', () => {
    const stellarWeb = new StellarWeb();
});
