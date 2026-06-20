/* ============================================================
   waves.js — wave progression, spawning & difficulty scaling
   ------------------------------------------------------------
   ★ TO TUNE DIFFICULTY: edit the numbers in CDL.CONFIG.waves
     (config.js). This file just applies them.
   ★ TO CHANGE WHEN A THREAT APPEARS: edit allowedTypes() below.

   Design intent:
     • Waves 1-3 stay gentle so the player learns the loop.
     • New threat types are introduced one wave at a time.
     • HP, speed, contact damage, and spawn rate all creep up so
       mid waves get stressful and the player can't go immortal.
   ============================================================ */

(function (CDL) {
  "use strict";

  const { rand, CONFIG, W, H } = CDL;
  const WC = CONFIG.waves;

  // Which threat types can appear on a given wave (introduced one at a time).
  function allowedTypes(w) {
    const t = ["malware"];
    if (w >= 2) t.push("phishing");
    if (w >= 3) t.push("bruteforce");
    if (w >= 4) t.push("ransomware");
    if (w >= 5) t.push("credential");
    if (w >= 6) t.push("beacon");
    if (w >= 7) t.push("exfil");
    return t;
  }

  // Per-wave scaling multipliers, modulated by the chosen difficulty:
  //   d.scale stretches/compresses the per-wave ramp,
  //   d.hp/speed/damage flat-scale base threat stats,
  //   d.spawn scales the spawn interval (>1 = slower = easier).
  const healthMul = () => CDL.diff().hp * (1 + (CDL.S.wave - 1) * WC.healthScale * CDL.diff().scale);
  const speedMul  = () => CDL.diff().speed * Math.min(WC.speedCap, 1 + (CDL.S.wave - 1) * WC.speedScale * CDL.diff().scale);
  const damageMul = () => CDL.diff().damage * (1 + (CDL.S.wave - 1) * WC.damageScale * CDL.diff().scale);
  const spawnInterval = () => Math.max(WC.spawnMin, WC.spawnBase - CDL.S.wave * WC.spawnStep) * CDL.diff().spawn / (CDL.S.dailyMods.spawnMult || 1);
  const spawnBatch = () => 1 + Math.floor(Math.max(0, CDL.S.wave - WC.batchAfter) / 2);

  function spawnEnemy(type) {
    const S = CDL.S;
    if (S.enemies.length >= WC.maxEnemies) return;
    const def = CDL.ENEMY_TYPES[type];

    // Spawn just outside one of the four edges.
    let x, y;
    const edge = (Math.random() * 4) | 0;
    if (edge === 0) { x = rand(0, W); y = -30; }
    else if (edge === 1) { x = W + 30; y = rand(0, H); }
    else if (edge === 2) { x = rand(0, W); y = H + 30; }
    else { x = -30; y = rand(0, H); }

    // Daily Simulation HP modifiers (default 1 in normal mode).
    const md = S.dailyMods;
    const hpMul = (md.enemyHp || 1) * ((md.enemyHpFor && md.enemyHpFor[type]) || 1);
    const hp = Math.round(def.hp * healthMul() * hpMul);

    // Discovery / first-seen tracking for the Threat Intel database.
    if (!S.stats.firstWaveByType[type]) S.stats.firstWaveByType[type] = S.wave;
    S.stats.encounteredThreats[type] = true;

    S.enemies.push({
      type, x, y, r: def.r,
      hp, maxHp: hp,
      speed: def.speed * speedMul(),
      damage: def.damage * damageMul(),
      score: def.score, xp: def.xp,
      color: def.color, shape: def.shape,
      vx: 0, vy: 0,       // knockback velocity
      orbitCd: 0,         // per-enemy cooldown vs orbit tools (MFA / Shredder / TLS Arc)
      hitFlash: 0,        // brief white flash when struck
      wob: Math.random() * 6.28,
    });
  }

  // Weighted random threat type (Daily Simulations bias certain threats).
  function pickType(types) {
    const w = CDL.S.dailyMods.weights;
    if (!w) return types[(Math.random() * types.length) | 0];
    let total = 0;
    for (const t of types) total += (w[t] || 1);
    let r = Math.random() * total;
    for (const t of types) { r -= (w[t] || 1); if (r <= 0) return t; }
    return types[types.length - 1];
  }

  function spawnTick() {
    const types = allowedTypes(CDL.S.wave);
    const batch = spawnBatch();
    for (let i = 0; i < batch; i++) {
      const type = pickType(types);
      if (type === "bruteforce") {
        const n = 3 + ((Math.random() * 3) | 0);   // swarm cluster
        for (let k = 0; k < n; k++) spawnEnemy("bruteforce");
      } else {
        spawnEnemy(type);
      }
    }
  }

  // Wave-intro banner text. Keyed to the threat introduced that wave.
  function bannerText(w) {
    const sub = {
      1: "Malware activity detected",
      2: "Phishing attempts inbound",
      3: "Brute-force swarm probing",
      4: "Ransomware activity detected",
      5: "Credential theft underway",
      6: "Command-and-control beacons active",
      7: "Data exfiltration attempts observed",
    };
    return {
      title: "WAVE " + w + (w === 1 ? "" : " INCOMING"),
      sub: sub[w] || "Mixed threats — difficulty rising",
    };
  }

  // Advance to the next wave: announce the wave just survived, heal via
  // Backup Restore, then announce the incoming wave.
  function nextWave() {
    const S = CDL.S, p = S.player;
    CDL.UI.feedMsg("Wave " + S.wave + " contained.", "good", 0);

    S.wave++;
    S.waveTimer = WC.duration;

    // Backup Restore (passive) heals on surviving a wave (Backup Drill boosts it).
    if (p.backupHeal > 0 && p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + p.backupHeal * (S.dailyMods.backupBoost || 1));
    }
    announce(S.wave);
  }

  function announce(w) {
    const b = bannerText(w);
    CDL.UI.banner(b.title, b.sub);
  }

  CDL.Waves = {
    allowedTypes, healthMul, speedMul, damageMul, spawnInterval, spawnBatch,
    spawnEnemy, spawnTick, nextWave, bannerText, announce,
  };
})(window.CDL);
