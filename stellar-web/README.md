# Stellar Web - Interactive 3D Network Visualization

A beautiful 3D particle network visualization with physics-based collisions and dynamic connectivity.

## Features

### Visual Effects
- ✨ 3D spherical particles with glow effects
- 🌈 Rainbow color mode (or choose Blue, Green, Purple)
- 🔗 Glowing cylindrical connections that blend colors from both connected particles
- 💥 Realistic collision physics with bounce

### Interactive Controls
- **Particle Count** (10-150): Adjust the number of particles in the scene
- **Connectivity Radius** (5-50): Change how far particles can be to connect
- **Particle Speed** (0.1-2.0): Control movement speed
- **Color Modes**: Rainbow, Blue, Green, or Purple

### Statistics Panel
Real-time metrics tracking:
- **Total Edges**: Number of connections
- **Avg Connections**: Average connections per particle
- **Network Density**: Percentage of possible connections
- **Clustering Coefficient**: How interconnected the network is
- **Avg Connection Life**: How long connections persist
- **Collisions/Second**: Collision detection counter
- **Average Velocity**: Mean particle speed
- **Temperature**: Visual representation of network energy (color-coded!)
- **Web Stability**: How much the network is changing

## How to Run

### Option 1: Open Locally
Simply open `index.html` in your web browser.

### Option 2: Deploy to GitHub Pages
1. Create a new repository on GitHub
2. Upload these files to the repository
3. Go to Settings → Pages
4. Select your main branch as the source
5. Your site will be live at `https://[your-username].github.io/[repo-name]/`

## Camera Controls
- **Click and drag**: Rotate camera view
- **Mouse wheel**: Zoom in/out

## Built With
- Three.js - 3D graphics library
- Vanilla JavaScript
- HTML5/CSS3

## What We've Implemented
✅ 3D spherical particles with glow
✅ Physics-based collision detection
✅ Dynamic network connectivity (max 5 connections per particle)
✅ Color blending for connection tubes
✅ All 9 statistics
✅ Sliding statistics panel with fade animation
✅ Color mode selection

## Next Steps
Feel free to experiment with:
- Adjusting the sliders to create different patterns
- Changing color modes
- Watching how different speeds affect network formation
- Observing clustering and stability metrics

Enjoy exploring your Stellar Web! 🌌
