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

  // Per-wave scaling multipliers.
  const healthMul = () => 1 + (CDL.S.wave - 1) * WC.healthScale;
  const speedMul  = () => Math.min(WC.speedCap, 1 + (CDL.S.wave - 1) * WC.speedScale);
  const damageMul = () => 1 + (CDL.S.wave - 1) * WC.damageScale;
  const spawnInterval = () => Math.max(WC.spawnMin, WC.spawnBase - CDL.S.wave * WC.spawnStep);
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

    const hp = Math.round(def.hp * healthMul());
    S.enemies.push({
      type, x, y, r: def.r,
      hp, maxHp: hp,
      speed: def.speed * speedMul(),
      damage: def.damage * damageMul(),
      score: def.score, xp: def.xp,
      color: def.color, shape: def.shape,
      vx: 0, vy: 0,       // knockback velocity
      shieldCd: 0,        // per-enemy cooldown vs MFA shield
      wob: Math.random() * 6.28,
    });
  }

  function spawnTick() {
    const types = allowedTypes(CDL.S.wave);
    const batch = spawnBatch();
    for (let i = 0; i < batch; i++) {
      const type = types[(Math.random() * types.length) | 0];
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

  // Advance to the next wave: heal via Backup Restore, then announce.
  function nextWave() {
    const S = CDL.S;
    S.wave++;
    S.waveTimer = WC.duration;

    const bk = S.player.tools.backup;
    if (bk.owned && S.player.hp < S.player.maxHp) {
      S.player.hp = Math.min(S.player.maxHp, S.player.hp + bk.amount);
      CDL.UI.feedMsg("Backup Restore recovered health.", "good");
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
