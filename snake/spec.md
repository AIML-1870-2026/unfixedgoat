# Snake Quest — Game Specification

## Overview

A cyberpunk-themed Snake game built with HTML, CSS, and JavaScript. The core twist is **trail decay** — the snake's tail gradually shrinks over time, forcing the player to keep eating to survive. The game features a full neon/Tron aesthetic with synthwave audio and responsive controls.

---

## Visual Design

### Theme: Cyberpunk / Tron

- **Background**: Dark grid with faint glowing gridlines
- **Snake**: Bright neon body (default cyan/electric blue) with a glowing trail effect
- **Food**: Pulsing neon orb with a soft glow halo
- **Color palette**: Deep blacks/dark blues for the background, neon cyan, magenta, green, and orange for game elements
- **Font**: Monospace or pixel-style font for UI text, with a neon glow treatment

### Visual Effects

- **Neon glow**: Snake body and food have a CSS/canvas glow (shadow blur)
- **Particle bursts**: When the snake eats food, particles explode outward from the food location
- **Grid pulse**: The background grid subtly pulses or ripples in response to eating and game events
- **Trail fade**: Tail segments fade in brightness as they approach decay, visually telegraphing the mechanic
- **Death effect**: Screen flash or glitch effect on game over

---

## Core Gameplay

### Basic Rules

- Snake moves on a grid in four directions (up, down, left, right)
- Eating food grows the snake and increases the score
- Hitting the snake's own body ends the game

### Trail Decay Mechanic

- The snake's tail **passively shrinks** over time at a steady rate
- Eating food adds segments, counteracting decay
- If the snake decays down to just the head (length 1), it's **game over** — the player must keep eating to survive
- **Decay acceleration**: As the player's score increases, the decay rate gradually speeds up, creating natural difficulty progression
- Tail segments visually dim/fade before disappearing, giving the player a visual cue

### Wall Behavior (Player Toggle)

- **Classic mode**: Hitting a wall ends the game
- **Wrap mode**: Snake exits one edge and enters from the opposite side
- Toggled in a settings/options menu before or during the game (paused)

---

## Controls

### Desktop

- **Arrow keys**: Move snake in four directions
- **WASD**: Alternative movement keys
- **Space / Enter**: Start game, restart after game over
- **P / Escape**: Pause and resume

### Mobile

- **Swipe gestures**: Swipe in a direction to change the snake's heading
- **Tap**: Start game / restart
- Responsive canvas that scales to screen size

---

## Audio

### Background Music

- Synthwave / retrowave style looping track
- Music starts on game start, pauses when game is paused
- Volume control or mute toggle in settings

### Sound Effects

- **Eat**: Short bright synth blip
- **Death**: Glitchy distortion or low buzz
- **Unlock**: Achievement-style chime when a skin is earned
- **UI navigation**: Subtle click/beep on menu interactions

---

## Replayability

### High Score Leaderboard

- Local storage-based leaderboard
- Top 10 scores displayed
- Player enters a name/initials (3 characters) when achieving a top score
- Scores persist between sessions

### Unlockable Skins

- Snake color/trail skins unlocked at score milestones
- Example unlock tiers:
  - **Score 50**: Magenta snake
  - **Score 100**: Green snake with particle trail
  - **Score 200**: Orange snake with flame trail
  - **Score 500**: Rainbow/cycling color snake
- Unlocked skins persist in local storage
- Skin selector available on the main menu or settings screen

---

## UI Structure

### Screens

1. **Main menu**: Title, start button, settings button, skin selector, high scores button
2. **Game screen**: Canvas with score display, optional pause overlay
3. **Pause overlay**: Resume, restart, and quit to menu options
4. **Game over screen**: Final score, high score entry (if applicable), restart and menu buttons
5. **Settings screen**: Wall mode toggle, audio volume/mute, controls reference

### HUD (During Gameplay)

- Current score (top left or top center)
- Current snake length indicator
- Decay rate indicator (optional — a small bar or icon showing how fast the tail is shrinking)

---

## Technical Notes

- Single-page HTML/CSS/JS (no frameworks or build tools)
- Canvas-based rendering for the game board
- `requestAnimationFrame` for the game loop with a fixed tick rate
- All state (scores, unlocks, settings) stored in `localStorage`
- Responsive layout: canvas resizes to fit the viewport while maintaining grid proportions
- Audio generated programmatically (Web Audio API) or loaded from small embedded files
