/* ============================================================
   config.js — global namespace, tunables, shared state & helpers
   ------------------------------------------------------------
   Every module attaches to the single global `window.CDL`. Files
   are loaded as CLASSIC scripts (see index.html) in dependency
   order — NOT ES modules — so the game also runs from file://
   (double-clicking index.html) with no server or build step.

   ★ TUNING DIFFICULTY: almost every balance number lives in
     CDL.CONFIG below. Change values here, reload, done.
   ============================================================ */

window.CDL = window.CDL || {};

(function (CDL) {
  "use strict";

  /* ---- Central tunables (difficulty, balance, sizing) ---- */
  CDL.CONFIG = {
    arena: { w: 1200, h: 720 },          // internal canvas resolution (v0.5.0: bigger arena)
    storageKey: "cdl_packet_survivor_best",

    player: {
      radius: 14,
      maxHp: 100,
      speed: 235,            // px/sec
      invuln: 0.6,           // i-frames after a hit (seconds). Fair, not too long.
      pickupRange: 64,       // telemetry magnet radius
      knockbackOnHit: 14,    // how far a hit shoves the player
    },

    // XP needed for next level = base * growth^(level-1)
    xp: { base: 10, growth: 1.22 },

    waves: {
      duration: 24,          // seconds per wave
      maxEnemies: 130,       // hard perf cap

      // Per-wave scaling. Early waves stay easy; mid waves bite.
      healthScale: 0.14,     // +14% enemy HP per wave
      speedScale: 0.025,     // +2.5% enemy speed per wave...
      speedCap: 1.5,         // ...capped so they never outrun the player
      damageScale: 0.045,    // +4.5% enemy contact damage per wave
                             //   (this is what stops the player going immortal)

      spawnBase: 1.7,        // base seconds between spawn ticks
      spawnStep: 0.11,       // each wave shortens the gap by this
      spawnMin: 0.34,        // floor on spawn gap
      batchAfter: 6,         // extra enemies per tick start after this wave
    },

    // Difficulty presets — simple multipliers layered on top of wave scaling.
    //   hp/speed/damage : flat multipliers on base enemy stats
    //   scale           : multiplier on the per-wave ramp (slower/faster scaling)
    //   spawn           : multiplier on spawn interval (>1 = slower spawns = easier)
    difficulties: {
      training:  { label: "Training",           hp: 0.80, speed: 0.90, damage: 0.70, scale: 0.65, spawn: 1.30,
                   desc: "Forgiving. Slower scaling and gentler threats — learn the ropes." },
      analyst:   { label: "Analyst",            hp: 1.00, speed: 1.00, damage: 1.00, scale: 1.00, spawn: 1.00,
                   desc: "Balanced challenge. The standard Packet Survivor experience." },
      incident:  { label: "Incident Commander", hp: 1.25, speed: 1.10, damage: 1.30, scale: 1.35, spawn: 0.82,
                   desc: "Relentless. Faster scaling, tougher threats, constant pressure." },
    },
    defaultDifficulty: "analyst",

    maxTools: 6,           // max active damage tools the player can own (v0.5.0)
    levelupCards: 3,       // cards shown per level-up
  };

  // Convenience aliases used all over the codebase.
  CDL.W = CDL.CONFIG.arena.w;
  CDL.H = CDL.CONFIG.arena.h;

  /* ---- Shared live game state ----
     One persistent object. newGame() MUTATES these fields (it never
     replaces CDL.S), so module references stay valid across restarts. */
  CDL.S = {
    state: "menu",           // menu | howto | playing | paused | levelup | gameover
    difficulty: "analyst",   // training | analyst | incident (chosen on the menu)
    player: null,
    enemies: [], projectiles: [], pickups: [], pulses: [], fields: [], decoys: [], particles: [],
    mines: [], walls: [],
    feed: [],
    wave: 1, waveTimer: 0, spawnTimer: 0, runTime: 0,
    bestScore: 0, shake: 0, pendingLevelUps: 0,
    stats: null,             // per-run tally for the incident report
  };

  // Active difficulty preset.
  CDL.diff = () =>
    CDL.CONFIG.difficulties[CDL.S.difficulty] ||
    CDL.CONFIG.difficulties[CDL.CONFIG.defaultDifficulty];

  /* ---- Tiny math helpers ---- */
  CDL.rand = (a, b) => a + Math.random() * (b - a);
  CDL.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  CDL.dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  CDL.shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Fresh per-run stats container (kills + which tool/threat mattered most).
  CDL.freshStats = () => ({
    kills: 0,
    telemetry: 0,        // total telemetry/XP collected this run
    killsByTool: {},     // source -> count   (for "most effective tool")
    killsByType: {},     // enemy type -> count   (threat breakdown)
    dmgByThreat: {},     // enemy type -> total damage dealt to player
  });
})(window.CDL);
