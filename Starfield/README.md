# Star Wars Hyperspace Starfield

An interactive Star Wars-themed hyperspace particle system with TIE fighter cockpit overlay. Experience the classic hyperspace jump effect with long, streaking stars zooming past your viewport.

## Features

- **Realistic Hyperspace Effect**: Long, smooth particle trails that mimic the iconic Star Wars hyperspace jump
- **TIE Fighter Cockpit Overlay**: View the hyperspace through an authentic TIE fighter viewport
- **Hyperdrive Mode**: Press and hold SPACE to engage hyperdrive for extra speed
- **Laser Cannons**: Press B to fire thick red laser blasts from twin TIE fighter cannons
- **Interactive Controls**: Adjust parameters in real-time
  - Trail Length (50-300)
  - Star Count (100-1000)
  - Star Speed (1-20)
- **Star Wars Themed UI**: News Cycle font and blue accent colors matching the Star Wars aesthetic
- **Responsive Design**: Adapts to any screen size

## Getting Started

Simply open `index.html` in any modern web browser, or visit the live demo at https://aiml-1870-2026.github.io/unfixedgoat/Starfield/

### Controls

- **SPACE**: Hold to activate hyperdrive mode
- **B**: Fire twin laser cannons
- **Toggle Button**: Show/hide the control panel
- **Sliders**: Adjust starfield parameters in real-time

## Files

- `index.html` - Main HTML file with embedded CSS
- `starfield.js` - JavaScript particle system and animation logic
- `tiefighter.png` - TIE fighter cockpit overlay image
- `.gitignore` - Git ignore configuration

## Technical Details

The starfield uses HTML5 Canvas for rendering with:
- 3D particle system with cone-shaped distribution (5-35 degrees off-axis)
- Gradient-based trail rendering for smooth hyperspace streaks
- Dynamic speed adjustment for hyperdrive effect
- Thick tube-like laser blasts with core glow effects
- Optimized animation loop with requestAnimationFrame

## Credits

Created for a coding class project with assistance from Claude Sonnet 4.5.

## License

This project is for educational purposes.
