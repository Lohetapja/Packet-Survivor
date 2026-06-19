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

  /* Base stats are scaled per-wave at spawn time (see waves.js).
     `tip` is the abstract defensive takeaway shown in the incident
     report if this threat ends up being the most dangerous. */
  CDL.ENEMY_TYPES = {
    malware: {
      r: 14, hp: 30, speed: 60, damage: 8, score: 10, xp: 2,
      color: "#f97316", shape: "blob", label: "Malware Blob",
      tip: "Keep endpoint detection (EDR) running and patch systems to limit how far malware spreads.",
    },
    phishing: {
      r: 10, hp: 16, speed: 122, damage: 6, score: 12, xp: 2,
      color: "#fb7185", shape: "hook", label: "Phishing Hook",
      tip: "User awareness and inbound message filtering blunt phishing before it reaches a target.",
    },
    bruteforce: {
      r: 8, hp: 10, speed: 88, damage: 4, score: 6, xp: 1,
      color: "#f43f5e", shape: "diamond", label: "Brute Force Swarm",
      tip: "Rate limiting, lockouts, and strong unique credentials defeat brute-force swarms.",
    },
    ransomware: {
      r: 22, hp: 130, speed: 34, damage: 20, score: 32, xp: 5,
      color: "#ef4444", shape: "cube", label: "Ransomware Cube",
      tip: "Offline backups and network segmentation are what let you survive ransomware.",
    },
    credential: {
      r: 11, hp: 26, speed: 134, damage: 9, score: 16, xp: 3,
      color: "#e879f9", shape: "penta", label: "Credential Thief",
      tip: "Multi-factor authentication means stolen credentials alone aren't enough to get in.",
    },
    beacon: {
      r: 9, hp: 20, speed: 72, damage: 6, score: 18, xp: 3,
      color: "#fbbf24", shape: "beacon", label: "Beacon Signal",
      tip: "Monitor outbound traffic and sinkhole suspicious command-and-control domains.",
    },
    exfil: {
      r: 12, hp: 44, speed: 152, damage: 10, score: 44, xp: 6,
      color: "#fb923c", shape: "drone", label: "Exfiltration Drone",
      tip: "Watch for unusual outbound transfers; data-loss prevention helps stop exfiltration.",
    },
  };

  /* ---- Damage + death (called by tools.js and projectiles) ----
     `source` is the tool key responsible, used for kill credit and
     contextual feed messages. Returns true if the threat died. */
  CDL.damageEnemy = function (e, dmg, source) {
    const S = CDL.S;
    e.hp -= dmg;
    if (e.hp > 0) return false;

    S.player.score += e.score;
    S.stats.kills++;
    if (source) S.stats.killsByTool[source] = (S.stats.killsByTool[source] || 0) + 1;

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
        let sp = e.speed;
        // DNS sinkhole slow.
        for (const f of S.fields) {
          if (dist2(e.x, e.y, f.x, f.y) <= f.r * f.r) { sp *= f.slow; break; }
        }
        // Credential Thief weaves as it closes in.
        let move = ang;
        if (e.type === "credential") move += Math.sin(S.runTime * 4 + e.wob) * 0.5;

        e.x += Math.cos(move) * sp * dt + e.vx * dt;
        e.y += Math.sin(move) * sp * dt + e.vy * dt;
        e.vx *= 0.86; e.vy *= 0.86;   // decay knockback

        // Contact damage.
        const rad = e.r + p.r;
        if (p.invuln <= 0 && dist2(e.x, e.y, p.x, p.y) <= rad * rad) {
          CDL.Player.hit(e);
        }
      }
    },

    draw(ctx) {
      const S = CDL.S;
      for (const e of S.enemies) drawEnemy(ctx, e, S.runTime);
    },
  };

  function drawEnemy(ctx, e, t) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.fillStyle = e.color;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 8;
    const r = e.r;

    switch (e.shape) {
      case "cube":
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(-r, -r, r * 2, r * 0.4);
        break;
      case "diamond":
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-r, -r, r * 2, r * 2);
        break;
      case "hook":
        ctx.beginPath();
        ctx.moveTo(0, -r); ctx.lineTo(r, r); ctx.lineTo(-r, r);
        ctx.closePath(); ctx.fill();
        break;
      case "penta":
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
          const x = Math.cos(a) * r, y = Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill();
        break;
      case "drone":
        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(-r * 0.7, -r);
        ctx.lineTo(-r * 0.3, 0); ctx.lineTo(-r * 0.7, r);
        ctx.closePath(); ctx.fill();
        break;
      case "beacon": {
        const pulse = 1 + Math.sin(t * 6 + e.wob) * 0.25;
        ctx.beginPath(); ctx.arc(0, 0, r * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, 0, r * pulse + 5, 0, Math.PI * 2);
        ctx.strokeStyle = e.color; ctx.globalAlpha = 0.5; ctx.stroke();
        break;
      }
      default: { // blob
        const wob = Math.sin(t * 5 + e.wob) * 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r + wob, 0, Math.PI * 2); ctx.fill();
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
