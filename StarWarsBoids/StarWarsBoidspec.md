# Star Wars Boids Mini-Lab — Project Spec

## 1. Concept

A browser-based Boids flocking simulation themed as a **Star Wars space battle**. Two factions — **Imperial TIE Fighters** and **Rebel X-Wings** — flock independently using classic boid rules (separation, alignment, cohesion) while also engaging each other in a dogfight mode. The simulation runs on an HTML5 Canvas with a deep-space starfield, optional Death Star / asteroid obstacles, engine glow trails, laser effects, and full audio (engine hum + laser zaps).

The project satisfies all **Main Task** requirements from the Code Quest Boids assignment, plus the following **Stretch Challenges**: Predator/Prey (dogfight engagement), Trails & Themes (engine glow trails, Star Wars theme), and Interaction Toys (mouse attract/repel/spawn).

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Vanilla JavaScript (ES6+) |
| Rendering | HTML5 Canvas 2D |
| Audio | Web Audio API |
| Layout/UI | HTML + CSS (no framework) |
| Build | None — single `index.html` or a small set of `.js` / `.css` files |

No bundler, no npm dependencies. Everything runs from a static file serve or local `file://` open.

---

## 3. Visual Design

### 3.1 Space Background

- **Starfield**: Multiple parallax layers of stars (small white dots) at varying brightness and subtle twinkle animation. Stars should feel deep — tiny dim ones far away, a few brighter ones closer.
- **Nebula wash** (subtle): Optional faint color gradients (purple/blue) in corners to break up pure black. Keep it understated so ships and trails pop.
- **Death Star**: A large, semi-transparent circular obstacle rendered in the background (dark gray with a subtle equatorial trench line and superlaser dish).
- **Asteroids**: Several smaller irregular rocky shapes scattered on the canvas.
- **Note on Physics**: While rendered with detail, for collision purposes, the Death Star and Asteroids are treated strictly as **simple circles**.

### 3.2 Ship Rendering — Top-Down Silhouettes

Both ship types are drawn as detailed **top-down silhouettes** using `ctx.beginPath()` / canvas path commands. They rotate to face their velocity heading.

**TIE Fighter (top-down)**
- **Shape**: Strictly top-down view resembling the letter **"H"**.
- **Geometry**: Two vertical rectangles (solar panels) on the left and right, connected by a horizontal strut to a central circular cockpit.
- **Color**: Medium gray cockpit, dark gray panels with subtle panel-line detail.
- **Scale**: ~12–14px wide (small and distinct).

**X-Wing (top-down)**
- **Shape**: Top-down view resembling a cross or an **"X"**.
- **Geometry**: Central fuselage (long pointed oval) with four wings extending diagonally (two forward/out, two back/out) to form the X shape.
- **Color**: Light gray / off-white fuselage, red accent stripes on wings.
- **Scale**: ~14–18px wide.

Both ship types should be recognizable at a glance but remain simple enough for smooth rendering.

### 3.3 Engine Glow Trails

- Each boid leaves a short fading trail behind it (opposite its heading).
- **TIE Fighters**: Pale blue/white engine glow.
- **X-Wings**: Orange/red-pink engine glow.
- Trail length proportional to current speed. Fades via decreasing opacity over ~8–12 frames.
- Implementation: Store last N positions per boid; draw as a tapered, fading polyline or series of circles with decreasing alpha.

### 3.4 Laser Effects

- When two enemy boids are within a **firing range** (configurable, e.g., 60px) and the target is within a **20-degree cone** relative to the boid's forward velocity vector, a short laser bolt line is drawn.
- **TIE lasers**: **Red** (per specific requirement).
- **X-Wing lasers**: **Green** (per specific requirement).
- **Visuals**: Lasers are cosmetic. They should appear as slow-moving, glowing bolts rather than instant lines. Draw a thicker semi-transparent line behind a thin bright line for a "glow" effect.
- **Pacing**: Firing should be rate-limited and slower than standard twitch-shooters (e.g., one shot every 50–70 frames) to emphasize cinematic smoothness.

---

## 4. Simulation Rules

### 4.1 Core Boid Behaviors (per faction)

Each boid computes three steering vectors relative to **same-faction** neighbors within its perception radius:

| Rule | Description |
|------|-------------|
| **Separation** | Steer away from neighbors that are too close (within a separation distance). Weighted by inverse distance. |
| **Alignment** | Steer toward the average velocity (heading + speed) of nearby same-faction neighbors. |
| **Cohesion** | Steer toward the average position of nearby same-faction neighbors. |

### 4.2 Faction Interaction Mode (Togglable)

A segmented control in the UI lets the user switch between interaction modes. The Engagement sliders (Aggression, Evasion, Firing Range) are only visible/active when a mode uses them.

| Mode | Label | Behavior | Engagement Sliders |
|------|-------|----------|-------------------|
| **Passive** | *Coexist* | Both factions flock independently in the same space. No inter-faction forces at all — ships ignore the other side entirely. Good for comparing flocking parameters side by side. | Hidden |
| **Predator / Prey** | *The Hunt* | One faction is the **predator** (chases), the other is the **prey** (evades). A sub-toggle selects which faction hunts: "Empire Hunts" or "Rebels Hunt." The predator faction steers toward the nearest enemy (aggression weight). The prey faction steers away from the nearest enemy (evasion weight). Only the predator fires lasers. | Visible |
| **Dogfight** | *All-Out War* | Both factions simultaneously chase **and** evade each other. Each boid steers toward the nearest enemy (aggression) but veers away when an enemy gets dangerously close (evasion). Both sides fire lasers. This is the most visually intense mode. | Visible |

**Implementation notes:**
- Switching modes takes effect immediately — no reset needed.
- In Predator/Prey mode, the prey faction's aggression is forced to 0 and the predator's evasion is forced to 0 (overriding slider values). The UI should gray out the irrelevant sliders or show a note.
- The mode selector should be styled as a prominent 3-button toggle group near the top of the controls panel (below presets, above sliders), since it fundamentally changes the simulation's character.
- Future modes (e.g., "Escort" — one faction protects a slow capital ship, "Swarm vs. Ace" — many weak boids vs. few fast ones) can be added to this selector without restructuring.

Both factions use the same engagement rules but can have **independent flocking parameter sets** (e.g., TIEs might have higher alignment for tighter formation; X-Wings might have higher evasion for scrappier flying).

### 4.3 Obstacle Avoidance

Boids steer away from obstacles (Death Star, asteroids) when within a configurable avoidance radius.
- **Geometry:** All obstacles are mathematically treated as **Circles**.
- **Force:** The avoidance force is inversely proportional to distance from the obstacle surface.
- **Priority:** Avoidance forces must be strong enough to override other forces at close range (see 4.6).

### 4.4 Boundary Handling

Two modes, togglable via UI:

- **Wrap** (default): Boids that exit one edge reappear on the opposite edge. Trails are clipped at boundaries.
- **Bounce**: Boids are repelled by a soft force near the canvas edges, curving them back inward.

### 4.5 Mouse Interaction

Three mouse modes, selectable via toggle buttons:

| Mode | Behavior |
|------|----------|
| **Attract** | Boids within a radius of the cursor steer toward it (like a gravity well). |
| **Repel** | Boids within a radius of the cursor steer away (like a shockwave). |
| **Spawn** | Click to spawn a boid at the cursor position. Left-click = X-Wing, Right-click = TIE Fighter. |

A subtle visual indicator (ring or glow) follows the cursor to show the interaction radius.

### 4.6 Steering Force Priority

To prevent conflicting behaviors (e.g., flying into the Death Star to chase a target), forces are accumulated with strict priority:

1.  **Critical Avoidance (Weight: 5x):** Obstacle avoidance and Wall Bounce (if active). This is the highest priority.
2.  **Engagement (Weight: Variable):** Chasing enemies (Aggression) or fleeing enemies (Evasion).
3.  **Flocking (Weight: Variable):** Separation, Alignment, Cohesion.

Resulting acceleration is clamped to **max steering force**. Velocity is clamped to **max speed**.

---

## 5. Audio Design

All audio is generated procedurally using the **Web Audio API** — no external audio files needed.

| Sound | Implementation |
|-------|---------------|
| **Engine ambient** | Low-frequency oscillator hum (saw/triangle wave, ~80–120 Hz). Volume scales with average fleet speed. Subtle, always-on background drone. Slightly different pitch for each faction. |
| **Laser zap** | Short burst: high-frequency square wave (~800–1200 Hz) with rapid pitch drop and fast decay envelope (~100ms). Triggered per laser event. Pan left/right based on screen position. |
| **UI feedback** | Soft click/blip on button press or slider change (optional). |

- **Master volume** slider in the UI.
- **Mute toggle** button.
- Audio should not auto-play on page load (browser policy). Start on first user interaction or a "Start Simulation" button.

---

## 6. UI / Controls Layout

### 6.1 Overall Layout


```

┌─────────────────────────────────────────────────────────┐
│  [Star Wars Boids Mini-Lab]              [Mute] [Vol]   │
├───────────────────────────────────┬─────────────────────┤
│                                   │  CONTROLS PANEL     │
│                                   │                     │
│         CANVAS                    │  [Presets]          │
│      (starfield +                 │  [Parameters]       │
│       ships +                     │  [Readouts]         │
│       obstacles)                  │  [Mouse Mode]       │
│                                   │  [Boundary Toggle]  │
│                                   │  [Pause/Reset]      │
│                                   │                     │
├───────────────────────────────────┴─────────────────────┤
│  FPS: 60  |  Boids: 50   |  Avg Speed: 2.1  |  ...     │
└─────────────────────────────────────────────────────────┘

```

- Canvas takes ~75% width. Control panel is a scrollable sidebar on the right (~25%).
- Bottom status bar shows live readouts.
- Dark theme throughout: near-black background (`#0a0a0f`), text in light gray/white, accent colors matching faction (Imperial blue-gray, Rebel orange-red).
- Star Wars-flavored typography: use a monospace or military-style font. If custom fonts aren't available, fall back to `'Courier New', monospace` or similar.

### 6.2 Controls Panel

#### Preset Buttons (top of panel)

Three large, clearly labeled buttons:

| Preset | Name | Mode | Parameters |
|--------|------|------|------------|
| 1 | **Imperial Formation** | Coexist | TIE: high alignment (2.5), high cohesion (1.8), moderate separation (1.2), large radius (80). X-Wing: moderate everything. No engagement. |
| 2 | **Rebel Scramble** | The Hunt (Empire Hunts) | X-Wing: high separation (2.5), low alignment (0.5), small radius (40). TIE: high cohesion (2.0). High evasion for X-Wings, high aggression for TIEs. |
| 3 | **Battle of Yavin** | All-Out War | Both factions: balanced flocking (1.5, 1.5, 1.2). High aggression (2.0), moderate evasion (1.0). Large radius (70). Full dogfight chaos. |

Pressing a preset updates the sliders and simulation parameters **instantly** (no smooth animation) to ensure the UI state stays strictly in sync with the logic.

#### Faction Interaction Mode (below presets)

A prominent 3-button segmented control:

| Button | Label | Icon idea |
|--------|-------|-----------|
| 1 | **Coexist** | Two parallel arrows |
| 2 | **The Hunt** | Arrow chasing a fleeing arrow |
| 3 | **All-Out War** | Two crossed arrows |

When "The Hunt" is selected, a sub-toggle appears: **Empire Hunts** ↔ **Rebels Hunt**.

Switching modes grays out irrelevant Engagement sliders and takes effect instantly.

#### Parameter Sliders

Grouped under collapsible section headers:

**Flocking — Imperial (TIE Fighters)**
| Slider | Range | Default | Tooltip |
|--------|-------|---------|---------|
| Separation Weight | 0.0 – 5.0 | 1.5 | How strongly TIEs avoid crowding each other |
| Alignment Weight | 0.0 – 5.0 | 1.5 | How strongly TIEs match their neighbors' heading |
| Cohesion Weight | 0.0 – 5.0 | 1.5 | How strongly TIEs pull toward their group center |
| Neighbor Radius | 20 – 150 px | 60 | How far each TIE "sees" to find neighbors |
| Max Speed | 1.0 – 6.0 | **2.0** | Top speed for TIE Fighters (Keep low for smoothness) |

**Flocking — Rebel (X-Wings)**
_(Same five sliders, independent values.)_

**Engagement**
| Slider | Range | Default | Tooltip |
|--------|-------|---------|---------|
| Aggression | 0.0 – 5.0 | 1.0 | How strongly boids chase enemies |
| Evasion | 0.0 – 5.0 | 1.0 | How strongly boids flee from close enemies |
| Firing Range | 20 – 120 px | 60 | Distance at which lasers activate |

**General**
| Slider | Range | Default | Tooltip |
|--------|-------|---------|---------|
| TIE Count | 5 – 100 | **25** | Number of TIE Fighters |
| X-Wing Count | 5 – 100 | **25** | Number of X-Wings |
| Trail Length | 0 – 20 | 10 | Engine trail length (0 = off) |

Each slider shows its current numeric value. Labels are plain English with `(?)` tooltip icons.

#### Mouse Mode Selector

Three toggle buttons (radio-style, only one active):
- 🎯 Attract
- 💥 Repel
- ✚ Spawn

#### Boundary Toggle

A switch/toggle: **Wrap** ↔ **Bounce**

#### Simulation Controls

- **⏸ Pause / ▶ Resume** — toggle button
- **🔄 Reset** — re-randomizes all boid positions/velocities with current parameters
- **Randomize Obstacles** — re-rolls asteroid positions (Death Star stays centered or in a fixed dramatic position)

### 6.3 Status Bar / Readouts

Live-updating, bottom of screen:

| Readout | Description |
|---------|-------------|
| FPS | Frames per second (smoothed) |
| TIE Count / X-Wing Count | Current boid counts |
| Avg Speed (TIE) | Average speed of TIE fleet |
| Avg Speed (X-Wing) | Average speed of X-Wing fleet |
| Avg Neighbors | Average number of same-faction neighbors per boid |
| Engagements | Number of active cross-faction laser events this frame |

---

## 7. Presets — Detailed Behavior Goals

The presets should feel **meaningfully different** — not just small slider nudges. When a user clicks a preset, the simulation's character should visibly transform within a second or two.

### Imperial Formation
**Mode**: Coexist
**Visual goal**: TIE Fighters fly in tight, disciplined columns/sheets. X-Wings are looser, orbiting around the edges. No lasers — factions ignore each other.
**Feeling**: Orderly, imposing, calm. A good starting point to study flocking behavior.

### Rebel Scramble
**Mode**: The Hunt (Empire Hunts)
**Visual goal**: TIEs clump into a predatory ball and pursue scattered X-Wings. X-Wings scatter and dart unpredictably, evading at every turn. Only red lasers (TIEs firing). Lots of near-misses.
**Feeling**: Chaotic, tense, asymmetric. The Rebels are on the run.

### Battle of Yavin
**Mode**: All-Out War
**Visual goal**: Both flocks intermingle aggressively. Frequent laser exchanges in both directions. Ships weave through each other. High energy.
**Feeling**: Full-scale space battle. Exciting and visually dense.

---

## 8. Architecture (Suggested)


```

index.html          — Layout, canvas, control panel markup
css/
style.css         — Dark theme, layout, controls styling
js/
main.js           — Entry point, animation loop, event wiring
boid.js           — Boid class (position, velocity, steering, faction, trail history)
flock.js          — Flock manager (neighbor search, rule application, engagement logic)
renderer.js       — Canvas drawing (background, ships, trails, lasers, obstacles, cursor)
obstacles.js      — Obstacle definitions (Death Star, asteroids), avoidance force calc
audio.js          — Web Audio API setup, engine drone, laser zap triggers
ui.js             — Slider/button wiring, preset application, readout updates
config.js         — Default parameter values, preset definitions, constants

```

This is a suggested structure. A single-file approach is also acceptable if it stays organized. Prioritize clarity.

---

## 9. Performance & Smoothness Considerations

- **Smooth Motion**: Use proper delta-time (`dt`) calculation in the animation loop. Do not rely on fixed frame updates. Ensure velocity and rotation interpolation is smooth, avoiding jittery turns.
- **Target**: 60 FPS with 50-100 boids on a modern laptop.
- **Neighbor search**: At 50 boids (25 per side), brute-force O(n²) is fine and simpler to implement.
- **Trail rendering**: Limit trail history length. Use `globalAlpha` for fading rather than redrawing complex gradients.
- **Laser rendering**: Cap simultaneous laser lines.
- **Audio Limits**: Limit concurrent active audio voices (e.g., max 10 overlapping sounds) rather than strictly pooling nodes. This prevents distortion and simplifies implementation while maintaining performance.
- **Canvas clearing**: Clear and redraw each frame (standard approach). The starfield can be pre-rendered to an offscreen canvas and `drawImage`'d each frame for performance.

---

## 10. Implementation Priorities

Build in this order to have something working at every stage:

### Phase 1 — Core Loop (MVP)
1. Canvas + starfield background
2. Single-faction boids with separation, alignment, cohesion
3. Basic sliders for the 5 core parameters
4. Wrap boundary
5. Pause / Reset

### Phase 2 — Star Wars Theme
6. Ship rendering (TIE H-Shape + X-Wing Cross-Shape)
7. Two independent factions with separate parameters
8. Engine glow trails
9. Preset buttons (Imperial Formation, Rebel Scramble, Battle of Yavin)

### Phase 3 — Dogfight
10. Engagement rules (aggression, evasion)
11. Laser effect rendering (Red/Green)
12. Firing range slider

### Phase 4 — Polish
13. Death Star + asteroid obstacles with avoidance (Circle physics)
14. Audio (engine drone, laser zaps, volume control)
15. Mouse interaction modes (attract, repel, spawn)
16. Bounce boundary mode + toggle
17. Status bar readouts
18. Tooltips, slider value labels, instant preset updates

---

## 11. Success Criteria

Pulled from the assignment checklist, adapted to this project:

- [ ] Controls update behavior in real time and feel smooth
- [ ] Three presets feel meaningfully different (not tiny tweaks)
- [ ] Readouts (FPS, counts, avg speed, avg neighbors, engagements) are accurate and update live
- [ ] Clear labels + tooltips on every control; no mystery knobs
- [ ] Ships are visually distinct: TIEs (H-shape), X-Wings (X-shape), Top-Down view.
- [ ] Engine trails look good and don't tank performance
- [ ] Dogfight engagement creates visually interesting cross-faction dynamics
- [ ] Lasers fire only within 20-degree cone, are colored correctly (Red/Green), and feel cinematic.
- [ ] Obstacles (Death Star, asteroids) are visible and boids steer around them (Circle collision)
- [ ] Audio is atmospheric and not annoying; mute works; no autoplay
- [ ] Mouse interaction feels responsive and fun
- [ ] Boundary toggle (wrap/bounce) works correctly
- [ ] Overall aesthetic feels like a Star Wars space battle, not a generic particle sim