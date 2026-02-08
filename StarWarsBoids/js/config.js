// config.js — Default parameter values, preset definitions, constants

const CONFIG = {
  canvas: {
    bgColor: '#0a0a0f',
  },

  starfield: {
    layers: [
      { count: 120, speed: 0.1, sizeRange: [0.3, 0.8], brightnessRange: [0.2, 0.4] },
      { count: 80, speed: 0.2, sizeRange: [0.5, 1.2], brightnessRange: [0.4, 0.7] },
      { count: 30, speed: 0.35, sizeRange: [1.0, 1.8], brightnessRange: [0.7, 1.0] },
    ],
    twinkleSpeed: 0.02,
  },

  defaults: {
    tie: {
      separationWeight: 1.5,
      alignmentWeight: 1.5,
      cohesionWeight: 1.5,
      neighborRadius: 60,
      maxSpeed: 2.0,
    },
    rebel: {
      separationWeight: 1.5,
      alignmentWeight: 1.5,
      cohesionWeight: 1.5,
      neighborRadius: 60,
      maxSpeed: 2.0,
    },
    engagement: {
      aggression: 1.0,
      evasion: 1.0,
      firingRange: 60,
    },
    general: {
      tieCount: 25,
      xwingCount: 25,
      trailLength: 10,
    },
  },

  boid: {
    separationDist: 40,
    maxForce: 0.15,
    trailMaxLength: 20,
    firingConeAngle: 20 * (Math.PI / 180), // 20 degrees in radians
    firingCooldown: 60, // frames between shots
  },

  obstacles: {
    deathStar: {
      radiusFraction: 0.12, // fraction of canvas min dimension
      avoidRadius: 40, // extra avoidance beyond surface
    },
    asteroidCount: 5,
    asteroidRadiusRange: [15, 35],
    avoidanceWeight: 5.0,
  },

  mouse: {
    radius: 80,
    attractStrength: 0.08,
    repelStrength: 0.15,
  },

  audio: {
    maxVoices: 10,
    engineBaseFreqTie: 90,
    engineBaseFreqRebel: 110,
    laserFreqBase: 1000,
  },

  presets: {
    imperialFormation: {
      name: 'Imperial Formation',
      mode: 'coexist',
      tie: { separationWeight: 1.2, alignmentWeight: 2.5, cohesionWeight: 1.8, neighborRadius: 80, maxSpeed: 2.0 },
      rebel: { separationWeight: 1.5, alignmentWeight: 1.5, cohesionWeight: 1.5, neighborRadius: 60, maxSpeed: 2.0 },
      engagement: { aggression: 1.0, evasion: 1.0, firingRange: 60 },
      general: { tieCount: 25, xwingCount: 25, trailLength: 10 },
    },
    rebelScramble: {
      name: 'Rebel Scramble',
      mode: 'hunt',
      huntSub: 'empire',
      tie: { separationWeight: 1.2, alignmentWeight: 1.5, cohesionWeight: 2.0, neighborRadius: 60, maxSpeed: 2.0 },
      rebel: { separationWeight: 2.5, alignmentWeight: 0.5, cohesionWeight: 1.0, neighborRadius: 40, maxSpeed: 2.5 },
      engagement: { aggression: 2.0, evasion: 2.0, firingRange: 60 },
      general: { tieCount: 25, xwingCount: 25, trailLength: 10 },
    },
    battleOfYavin: {
      name: 'Battle of Yavin',
      mode: 'dogfight',
      tie: { separationWeight: 1.2, alignmentWeight: 1.5, cohesionWeight: 1.5, neighborRadius: 70, maxSpeed: 2.0 },
      rebel: { separationWeight: 1.2, alignmentWeight: 1.5, cohesionWeight: 1.5, neighborRadius: 70, maxSpeed: 2.0 },
      engagement: { aggression: 2.0, evasion: 1.0, firingRange: 60 },
      general: { tieCount: 25, xwingCount: 25, trailLength: 10 },
    },
  },

  modes: {
    coexist: 'coexist',
    hunt: 'hunt',
    dogfight: 'dogfight',
  },
};
