/* ============================================================
   enemies.js — threat definitions + behaviour + rendering
   ------------------------------------------------------------
   ★ TO ADD A NEW THREAT:
     1. Add an entry to CDL.ENEMY_TYPES below (stats + shape + tip).
     2. Add a `case` for its `shape` in drawEnemy() if it needs a
        new silhouette.
     3. Make it appear in a wave via CDL.Waves.allowedTypes()
        (see waves.js).
   All threats are ABSTRACT, defensive teaching props — no real
   malware, payloads, or attack steps are modelled anywhere.
   ============================================================ */

(function (CDL) {
  "use strict";

  const { dist2, rand } = CDL;

  // Sources that deal damage every frame (beams / fields). They skip the
  // per-enemy hit flash so a threat isn't held permanently white.
  const CONTINUOUS_SRC = { quarantine: 1, dlp: 1, sandbox: 1, memory: 1 };

  /* Base stats are scaled per-wave at spawn time (see waves.js).
     Extra fields power the in-game info screens & incident report:
       behavior  short in-game behaviour (Threat Intel)
       danger    relative threat rating (Low / Medium / High / Critical)
       tip       abstract cyber explanation (Threat Intel)
       reco      defensive recommendation if this was the worst threat
     Stable display order lives in CDL.THREAT_ORDER below. */
  CDL.ENEMY_TYPES = {
    malware: {
      r: 14, hp: 26, speed: 60, damage: 8, score: 10, xp: 2,
      color: "#f97316", shape: "blob", label: "Malware Blob", danger: "Low",
      behavior: "Drifts toward you at a steady pace.",
      tip: "Patching and endpoint detection limit how far malware can spread.",
      reco: "Improve endpoint detection and response coverage.",
    },
    phishing: {
      r: 10, hp: 14, speed: 122, damage: 6, score: 12, xp: 2,
      color: "#fb7185", shape: "hook", label: "Phishing Hook", danger: "Low",
      behavior: "Fragile, but rushes in fast.",
      tip: "User awareness and inbound filtering blunt phishing before it lands.",
      reco: "Reinforce email filtering and user-awareness training.",
    },
    bruteforce: {
      r: 8, hp: 9, speed: 88, damage: 4, score: 6, xp: 1,
      color: "#f43f5e", shape: "diamond", label: "Brute Force Swarm", danger: "Medium",
      behavior: "Weak alone, but arrives in swarms.",
      tip: "Rate limiting, lockouts, and strong credentials defeat brute force.",
      reco: "Enforce rate limiting, lockouts, and strong unique credentials.",
    },
    ransomware: {
      r: 22, hp: 130, speed: 34, damage: 20, score: 32, xp: 5,
      color: "#ef4444", shape: "cube", label: "Ransomware Cube", danger: "Critical",
      behavior: "Slow and tanky, but hits very hard.",
      tip: "Offline backups and segmentation are what let you survive ransomware.",
      reco: "Improve endpoint containment and backup recovery coverage.",
    },
    credential: {
      r: 11, hp: 26, speed: 134, damage: 9, score: 16, xp: 3,
      color: "#e879f9", shape: "penta", label: "Credential Thief", danger: "High",
      behavior: "Fast, and weaves as it closes in.",
      tip: "MFA means stolen credentials alone aren't enough to get in.",
      reco: "Strengthen identity controls and MFA coverage.",
    },
    beacon: {
      r: 9, hp: 20, speed: 72, damage: 6, score: 18, xp: 3,
      color: "#fbbf24", shape: "beacon", label: "Beacon Signal", danger: "Medium",
      behavior: "Small and persistent; appears later.",
      tip: "Watch outbound traffic and sinkhole suspicious C2 domains.",
      reco: "Hunt for command-and-control traffic and sinkhole malicious domains.",
    },
    exfil: {
      r: 12, hp: 44, speed: 152, damage: 10, score: 44, xp: 6,
      color: "#fb923c", shape: "drone", label: "Exfiltration Drone", danger: "High",
      behavior: "Very fast; worth bonus score.",
      tip: "Spot unusual outbound transfers with data-loss prevention.",
      reco: "Improve network monitoring and outbound traffic detection.",
    },
  };

  // Stable display order for info screens & the incident report breakdown.
  CDL.THREAT_ORDER = ["malware", "phishing", "bruteforce", "ransomware", "credential", "beacon", "exfil"];

  /* ---- Damage + death (called by tools.js and projectiles) ----
     `source` is the tool key responsible, used for kill credit and
     contextual feed messages. Returns true if the threat died. */
  CDL.damageEnemy = function (e, dmg, source) {
    const S = CDL.S;
    e.hp -= dmg;

    // Hit flash (cheap, per-enemy). Skipped for continuous-damage sources.
    if (!CONTINUOUS_SRC[source]) e.hitFlash = 0.12;

    if (e.hp > 0) return false;

    S.player.score += e.score;
    S.stats.kills++;
    if (source) S.stats.killsByTool[source] = (S.stats.killsByTool[source] || 0) + 1;
    S.stats.killsByType[e.type] = (S.stats.killsByType[e.type] || 0) + 1;
    CDL.Effects.death(e.x, e.y, e.color);

    // Telemetry drop (SIEM grants a small bonus).
    S.pickups.push({
      x: e.x, y: e.y, r: 5,
      value: e.xp + (source === "siem" ? 1 : 0),
      vx: rand(-30, 30), vy: rand(-30, 30),
      bob: Math.random() * 6.28,
    });

    // Contextual, throttled feedback.
    const feed = CDL.UI.feedMsg;
    if (source === "edr" && (e.type === "malware" || e.type === "ransomware")) feed("EDR contained malware.", "good");
    else if (source === "siem") feed("SIEM detected suspicious activity.", "good");
    else if (source === "firewall") feed("Firewall Pulse blocked hostile traffic.", "good");
    else if (source === "quarantine") feed("Quarantine Beam isolated a threat.", "good");
    else if (source === "mfa") feed("MFA Shield repelled an intruder.", "good");
    else if (e.type === "exfil") feed("Exfiltration Drone intercepted!", "good");

    const idx = S.enemies.indexOf(e);
    if (idx !== -1) S.enemies.splice(idx, 1);
    return true;
  };

  /* Up to `count` nearest living threats within `range` of the player. */
  CDL.Enemies = {
    nearest(count, range) {
      const S = CDL.S, p = S.player, rr = range * range;
      const scored = [];
      for (const e of S.enemies) {
        const d = dist2(e.x, e.y, p.x, p.y);
        if (d <= rr) scored.push({ e, d });
      }
      scored.sort((a, b) => a.d - b.d);
      return scored.slice(0, count).map((s) => s.e);
    },

    update(dt) {
      const S = CDL.S, p = S.player;

      // Honeypot decoys expire.
      for (let i = S.decoys.length - 1; i >= 0; i--) {
        S.decoys[i].life -= dt;
        if (S.decoys[i].life <= 0) S.decoys.splice(i, 1);
      }

      for (let i = S.enemies.length - 1; i >= 0; i--) {
        const e = S.enemies[i];
        if (e.shieldCd > 0) e.shieldCd -= dt;
        if (e.shredCd > 0) e.shredCd -= dt;
        if (e.hitFlash > 0) e.hitFlash -= dt;

        // Target the nearest honeypot decoy if one exists, else the player.
        let tx = p.x, ty = p.y;
        if (S.decoys.length) {
          let best = null, bd = Infinity;
          for (const d of S.decoys) {
            const dd = dist2(e.x, e.y, d.x, d.y);
            if (dd < bd) { bd = dd; best = d; }
          }
          if (best) { tx = best.x; ty = best.y; }
        }

        const ang = Math.atan2(ty - e.y, tx - e.x);

        // Fields: take the strongest slow + the strongest damage-over-time.
        let minSlow = 1, fdps = 0, fsrc = null;
        for (const f of S.fields) {
          if (dist2(e.x, e.y, f.x, f.y) <= f.r * f.r) {
            if (f.slow < minSlow) minSlow = f.slow;
            if (f.dps) {
              let d = f.dps;
              if (f.kind === "dlp" && e.type === "exfil") d *= 2; // DLP counters exfiltration
              if (d > fdps) { fdps = d; fsrc = f.kind === "sandbox" ? "sandbox" : "dlp"; }
            }
          }
        }
        const sp = e.speed * minSlow;

        // Credential Thief weaves as it closes in.
        let move = ang;
        if (e.type === "credential") move += Math.sin(S.runTime * 4 + e.wob) * 0.5;

        e.x += Math.cos(move) * sp * dt + e.vx * dt;
        e.y += Math.sin(move) * sp * dt + e.vy * dt;
        e.vx *= 0.86; e.vy *= 0.86;   // decay knockback

        // Contact damage to the player.
        const rad = e.r + p.r;
        if (p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) <= rad * rad) {
          CDL.Player.hit(e);
        }

        // Field damage-over-time (DLP / Sandbox) — may defeat the threat.
        if (fdps > 0 && CDL.damageEnemy(e, fdps * dt, fsrc)) continue;
      }
    },

    draw(ctx) {
      const S = CDL.S;
      for (const e of S.enemies) drawEnemy(ctx, e, S.runTime);
    },
  };

  function drawEnemy(ctx, e, t) {
    const flashing = e.hitFlash > 0;
    const fill = flashing ? "#ffffff" : e.color;
    // A consistent darker outline on every threat sharpens silhouettes.
    const outline = "rgba(8,12,20,0.65)";

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = fill;
    ctx.strokeStyle = flashing ? "#ffffff" : outline;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.shadowColor = e.color;
    ctx.shadowBlur = flashing ? 16 : 8;
    const r = e.r;

    switch (e.shape) {
      case "cube": {
        // Ransomware: locked block — body + outline + a keyhole/lock mark.
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.fillRect(-r, -r, r * 2, r * 0.4);
        ctx.fillStyle = "rgba(8,12,20,0.8)"; // padlock hint
        ctx.fillRect(-r * 0.18, -r * 0.1, r * 0.36, r * 0.5);
        ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.28, Math.PI, 0); ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(8,12,20,0.8)"; ctx.stroke();
        break;
      }
      case "diamond":
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        break;
      case "hook":
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(r, r); ctx.lineTo(-r, r);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      case "penta": {
        // Credential thief: pentagon + a small "key bow" dot.
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          const x = Math.cos(a) * r, y = Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case "drone": {
        // Exfil drone: chevron + a short motion trail.
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.6);
        ctx.lineTo(-r * 1.6, 0); ctx.lineTo(-r * 0.7, r * 0.6);
        ctx.fillStyle = e.color; ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowColor = e.color; ctx.shadowBlur = flashing ? 16 : 8;
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r);
        ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r * 0.7, r);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case "beacon": {
        // C2 beacon: pulsing core + a broadcasting ring.
        const pulse = 1 + Math.sin(t * 6 + e.wob) * 0.25;
        ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, 0, r * pulse + 6, 0, Math.PI * 2);
        ctx.strokeStyle = e.color; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1;
        break;
      }
      default: { // malware blob — wobbling globule
        const wob = Math.sin(t * 5 + e.wob) * 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r + wob, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();

    // Health bar for tougher threats.
    if (e.maxHp > 40 && e.hp < e.maxHp) {
      const w = e.r * 2;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(e.x - e.r, e.y - e.r - 8, w, 3);
      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(e.x - e.r, e.y - e.r - 8, w * (e.hp / e.maxHp), 3);
    }
  }
})(window.CDL);
