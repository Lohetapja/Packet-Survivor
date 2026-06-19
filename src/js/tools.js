/* ============================================================
   tools.js — defensive tools: state, auto-activation, rendering
   ------------------------------------------------------------
   Every tool is DEFENSIVE / detection / containment themed. They
   auto-activate; the player never aims.

   ★ TO ADD A NEW TOOL:
     1. Add default state to freshTools() below.
     2. Add its behaviour to CDL.Tools.update() (cooldown + effect).
     3. Add any visuals to the draw* helpers.
     4. Add unlock + upgrade cards in upgrades.js.
     5. Add a display name to CDL.TOOL_META (incident-report credit)
        and an entry to CDL.TOOL_INFO + CDL.TOOL_ORDER (the guide).

   Shared primitives used by several tools:
     • S.projectiles items carry { source, color, bonus? } so kill
       credit, tint, and the EDR anti-malware bonus all work.
     • S.pulses items carry an optional { color } ("r,g,b").
     • S.fields items carry { kind, slow, dps? } — dps fields deal
       damage-over-time (applied in enemies.js).
   ============================================================ */

(function (CDL) {
  "use strict";

  const { dist2, clamp } = CDL;

  // Human-readable names (used by the post-run incident report).
  CDL.TOOL_META = {
    firewall: "Firewall Pulse",
    edr: "EDR Burst",
    siem: "SIEM Scanner",
    dns: "DNS Sinkhole Field",
    mfa: "MFA Shield",
    honeypot: "Honeypot Decoy",
    quarantine: "Quarantine Beam",
    backup: "Backup Restore",
    packetstorm: "Packet Storm",
    drone: "Threat Hunter Drone",
    patchwave: "Patch Wave",
    dlp: "DLP Net",
    shredder: "Log Shredder",
    sandbox: "Sandbox Trap",
  };

  // Info for the "Defensive Tools" guide on the How to Play screen.
  //   icon / name / behavior (what it does in-game) / explain (defensive idea)
  // Stable display order in CDL.TOOL_ORDER.
  CDL.TOOL_ORDER = [
    "firewall", "edr", "siem", "dns", "mfa", "honeypot", "quarantine", "backup",
    "packetstorm", "drone", "patchwave", "dlp", "shredder", "sandbox",
  ];
  CDL.TOOL_INFO = {
    firewall:   { icon: "🔥", name: "Firewall Pulse",
                  behavior: "Auto-pulses nearby, damaging and shoving threats back.",
                  explain: "Filters and blocks hostile traffic at the perimeter." },
    edr:        { icon: "✳️", name: "EDR Burst",
                  behavior: "Fires tracking bursts; extra-strong vs Malware & Ransomware.",
                  explain: "Endpoint Detection & Response finds and removes threats on hosts." },
    siem:       { icon: "📡", name: "SIEM Scanner",
                  behavior: "A scan ring damages threats and grants bonus telemetry.",
                  explain: "Security analytics correlate logs to surface suspicious activity." },
    dns:        { icon: "🕳️", name: "DNS Sinkhole Field",
                  behavior: "Drops a zone that slows threats caught inside it.",
                  explain: "Redirects malicious domain lookups into a harmless sinkhole." },
    mfa:        { icon: "🛡️", name: "MFA Shield",
                  behavior: "Rotating shields block and damage threats that touch you.",
                  explain: "Multi-factor auth stops stolen credentials from being enough." },
    honeypot:   { icon: "🍯", name: "Honeypot Decoy",
                  behavior: "Deploys a lure that distracts threats away from you.",
                  explain: "A decoy system draws attackers away from real assets." },
    quarantine: { icon: "🎯", name: "Quarantine Beam",
                  behavior: "Locks the closest threat with steady damage over time.",
                  explain: "Isolates a compromised element so it can't spread." },
    backup:     { icon: "💾", name: "Backup Restore",
                  behavior: "Passively restores health after each wave you survive.",
                  explain: "Reliable backups let you recover after an incident." },
    packetstorm:{ icon: "💠", name: "Packet Storm",
                  behavior: "Periodically burst-fires packets in all directions.",
                  explain: "Saturates the segment to clear weak, swarming traffic." },
    drone:      { icon: "🚁", name: "Threat Hunter Drone",
                  behavior: "An orbiting drone auto-shoots the nearest threat.",
                  explain: "Proactive threat hunting that seeks out intrusions." },
    patchwave:  { icon: "🩹", name: "Patch Wave",
                  behavior: "Releases an expanding remediation wave around you.",
                  explain: "Rolling patches remediate weaknesses across range." },
    dlp:        { icon: "🕸️", name: "DLP Net",
                  behavior: "Drops a net that slows + damages threats; great vs Exfiltration.",
                  explain: "Data-loss prevention catches data on its way out." },
    shredder:   { icon: "🌀", name: "Log Shredder",
                  behavior: "A telemetry shard orbits you, shredding threats it touches.",
                  explain: "Turns collected logs into an active defensive barrier." },
    sandbox:    { icon: "🧪", name: "Sandbox Trap",
                  behavior: "Deploys a containment zone that slows and saps threats.",
                  explain: "Detonates suspicious activity safely in isolation." },
  };

  // Default tool loadout. Player starts with Firewall Pulse only.
  // (v0.4.0: base damage on the existing tools bumped ~12–20%.)
  CDL.freshTools = function () {
    return {
      firewall:   { owned: true,  level: 1, cd: 0, interval: 0.85, range: 92,  damage: 16, knockback: 220 },
      edr:        { owned: false, level: 0, cd: 0, interval: 0.75, damage: 15, projectiles: 1, pspeed: 480, range: 340 },
      siem:       { owned: false, level: 0, cd: 0, interval: 1.3,  radius: 120, damage: 11, flash: 0 },
      dns:        { owned: false, level: 0, cd: 0, interval: 4.5,  duration: 3.2, radius: 95, slow: 0.45 },
      mfa:        { owned: false, level: 0, count: 2, radius: 58,  rotSpeed: 2.6, damage: 14, angle: 0 },
      honeypot:   { owned: false, level: 0, cd: 0, interval: 9,   duration: 4 },
      quarantine: { owned: false, level: 0, dps: 30, range: 270, target: null },
      backup:     { owned: false, level: 0, amount: 10 },

      // --- v0.4.0 new tools ---
      packetstorm:{ owned: false, level: 0, cd: 0, interval: 2.2, damage: 9, count: 6, pspeed: 300, life: 0.85 },
      drone:      { owned: false, level: 0, count: 1, damage: 10, fireInterval: 0.6, fireCd: 0, fireRange: 300, radius: 46, angle: 0, pspeed: 460 },
      patchwave:  { owned: false, level: 0, cd: 0, interval: 2.6, radius: 118, damage: 14 },
      dlp:        { owned: false, level: 0, cd: 0, interval: 6, duration: 3.5, radius: 90, slow: 0.5, dps: 10 },
      shredder:   { owned: false, level: 0, count: 1, damage: 11, rotSpeed: 3.0, radius: 70, size: 13, angle: 0 },
      sandbox:    { owned: false, level: 0, cd: 0, interval: 7, duration: 3, radius: 82, slow: 0.3, dps: 8 },
    };
  };

  CDL.Tools = {
    /* ---- Active-tool logic, run every frame while playing ---- */
    update(dt) {
      const S = CDL.S, p = S.player, t = p.tools;
      const feed = CDL.UI.feedMsg, dmg = CDL.damageEnemy, near = CDL.Enemies.nearest;

      // Firewall Pulse — periodic short-range AoE + knockback.
      if (t.firewall.owned) {
        t.firewall.cd -= dt;
        if (t.firewall.cd <= 0) {
          t.firewall.cd = t.firewall.interval;
          S.pulses.push({ x: p.x, y: p.y, r: 0, maxR: t.firewall.range, life: 0.32, maxLife: 0.32 });
          const rr = t.firewall.range * t.firewall.range;
          for (let i = S.enemies.length - 1; i >= 0; i--) {
            const e = S.enemies[i];
            if (dist2(e.x, e.y, p.x, p.y) <= rr) {
              const ang = Math.atan2(e.y - p.y, e.x - p.x);
              e.vx += Math.cos(ang) * t.firewall.knockback;
              e.vy += Math.sin(ang) * t.firewall.knockback;
              dmg(e, t.firewall.damage, "firewall");
            }
          }
        }
      }

      // EDR Burst — fire tracking projectiles at nearest threats.
      if (t.edr.owned) {
        t.edr.cd -= dt;
        if (t.edr.cd <= 0) {
          t.edr.cd = t.edr.interval;
          for (const e of near(t.edr.projectiles, t.edr.range)) {
            const ang = Math.atan2(e.y - p.y, e.x - p.x);
            S.projectiles.push({
              x: p.x, y: p.y,
              vx: Math.cos(ang) * t.edr.pspeed,
              vy: Math.sin(ang) * t.edr.pspeed,
              dmg: t.edr.damage, r: 5, life: 1.4, source: "edr", bonus: true, color: "#7dd3fc",
            });
          }
        }
      }

      // SIEM Scanner — periodic ring scan + bonus telemetry.
      if (t.siem.owned) {
        t.siem.cd -= dt;
        if (t.siem.flash > 0) t.siem.flash -= dt;
        if (t.siem.cd <= 0) {
          t.siem.cd = t.siem.interval;
          t.siem.flash = 0.3;
          const rr = t.siem.radius * t.siem.radius;
          for (let i = S.enemies.length - 1; i >= 0; i--) {
            const e = S.enemies[i];
            if (dist2(e.x, e.y, p.x, p.y) <= rr) dmg(e, t.siem.damage, "siem");
          }
        }
      }

      // DNS Sinkhole — periodically drop a slowing field on a cluster.
      if (t.dns.owned) {
        t.dns.cd -= dt;
        if (t.dns.cd <= 0 && S.enemies.length) {
          t.dns.cd = t.dns.interval;
          const target = S.enemies[(Math.random() * S.enemies.length) | 0];
          S.fields.push({ x: target.x, y: target.y, r: t.dns.radius, slow: t.dns.slow, life: t.dns.duration, maxLife: t.dns.duration, kind: "dns" });
          feed("DNS Sinkhole slowing traffic.", "good", 5);
        }
      }

      // MFA Shield — rotating damage nodes.
      if (t.mfa.owned) {
        t.mfa.angle += t.mfa.rotSpeed * dt;
        const step = (Math.PI * 2) / t.mfa.count;
        for (let n = 0; n < t.mfa.count; n++) {
          const a = t.mfa.angle + step * n;
          const ox = p.x + Math.cos(a) * t.mfa.radius;
          const oy = p.y + Math.sin(a) * t.mfa.radius;
          for (let i = S.enemies.length - 1; i >= 0; i--) {
            const e = S.enemies[i];
            if (e.shieldCd > 0) continue;
            const rad = e.r + 9;
            if (dist2(e.x, e.y, ox, oy) <= rad * rad) {
              e.shieldCd = 0.35;
              const ang = Math.atan2(e.y - p.y, e.x - p.x);
              e.vx += Math.cos(ang) * 90;
              e.vy += Math.sin(ang) * 90;
              dmg(e, t.mfa.damage, "mfa");
            }
          }
        }
      }

      // Honeypot Decoy — periodically deploy a distraction.
      if (t.honeypot.owned) {
        t.honeypot.cd -= dt;
        if (t.honeypot.cd <= 0) {
          t.honeypot.cd = t.honeypot.interval;
          const a = Math.random() * Math.PI * 2;
          S.decoys.push({
            x: clamp(p.x + Math.cos(a) * 130, 20, CDL.W - 20),
            y: clamp(p.y + Math.sin(a) * 130, 20, CDL.H - 20),
            r: 12, life: t.honeypot.duration,
          });
          feed("Honeypot distracted attacker.", "good", 4);
        }
      }

      // Quarantine Beam — lock the closest threat, steady damage over time.
      if (t.quarantine.owned) {
        t.quarantine.target = null;
        const list = near(1, t.quarantine.range);
        if (list.length) {
          t.quarantine.target = list[0];
          dmg(list[0], t.quarantine.dps * dt, "quarantine");
        }
      }

      // Packet Storm — radial burst of short-range packets (anti-swarm).
      if (t.packetstorm.owned) {
        t.packetstorm.cd -= dt;
        if (t.packetstorm.cd <= 0) {
          t.packetstorm.cd = t.packetstorm.interval;
          const n = t.packetstorm.count, off = S.runTime; // rotate each volley
          for (let k = 0; k < n; k++) {
            const a = (Math.PI * 2 * k) / n + off;
            S.projectiles.push({
              x: p.x, y: p.y, vx: Math.cos(a) * t.packetstorm.pspeed, vy: Math.sin(a) * t.packetstorm.pspeed,
              dmg: t.packetstorm.damage, r: 4, life: t.packetstorm.life, source: "packetstorm", color: "#67e8f9",
            });
          }
        }
      }

      // Threat Hunter Drone — orbiting companion that auto-fires at threats.
      if (t.drone.owned) {
        t.drone.angle += 1.4 * dt;
        t.drone.fireCd -= dt;
        if (t.drone.fireCd <= 0) {
          const targets = near(t.drone.count, t.drone.fireRange);
          if (targets.length) {
            t.drone.fireCd = t.drone.fireInterval;
            const step = (Math.PI * 2) / t.drone.count;
            for (let n = 0; n < t.drone.count; n++) {
              const a = t.drone.angle + step * n;
              const ox = p.x + Math.cos(a) * t.drone.radius, oy = p.y + Math.sin(a) * t.drone.radius;
              const e = targets[n % targets.length];
              const ang = Math.atan2(e.y - oy, e.x - ox);
              S.projectiles.push({
                x: ox, y: oy, vx: Math.cos(ang) * t.drone.pspeed, vy: Math.sin(ang) * t.drone.pspeed,
                dmg: t.drone.damage, r: 4, life: 1.2, source: "drone", color: "#93c5fd",
              });
            }
          }
        }
      }

      // Patch Wave — periodic expanding remediation ring.
      if (t.patchwave.owned) {
        t.patchwave.cd -= dt;
        if (t.patchwave.cd <= 0) {
          t.patchwave.cd = t.patchwave.interval;
          S.pulses.push({ x: p.x, y: p.y, r: 0, maxR: t.patchwave.radius, life: 0.5, maxLife: 0.5, color: "45,212,191" });
          const rr = t.patchwave.radius * t.patchwave.radius;
          for (let i = S.enemies.length - 1; i >= 0; i--) {
            const e = S.enemies[i];
            if (dist2(e.x, e.y, p.x, p.y) <= rr) dmg(e, t.patchwave.damage, "patchwave");
          }
        }
      }

      // DLP Net — slowing + damaging field; counters Exfiltration Drone.
      if (t.dlp.owned) {
        t.dlp.cd -= dt;
        if (t.dlp.cd <= 0 && S.enemies.length) {
          t.dlp.cd = t.dlp.interval;
          const target = S.enemies[(Math.random() * S.enemies.length) | 0];
          S.fields.push({ x: target.x, y: target.y, r: t.dlp.radius, slow: t.dlp.slow, dps: t.dlp.dps, life: t.dlp.duration, maxLife: t.dlp.duration, kind: "dlp" });
          feed("DLP Net deployed.", "good", 5);
        }
      }

      // Log Shredder — orbiting telemetry shard that shreds on contact.
      if (t.shredder.owned) {
        t.shredder.angle += t.shredder.rotSpeed * dt;
        const step = (Math.PI * 2) / t.shredder.count;
        for (let nidx = 0; nidx < t.shredder.count; nidx++) {
          const a = t.shredder.angle + step * nidx;
          const ox = p.x + Math.cos(a) * t.shredder.radius, oy = p.y + Math.sin(a) * t.shredder.radius;
          for (let i = S.enemies.length - 1; i >= 0; i--) {
            const e = S.enemies[i];
            if (e.shredCd > 0) continue;
            const rad = e.r + t.shredder.size;
            if (dist2(e.x, e.y, ox, oy) <= rad * rad) {
              e.shredCd = 0.3;
              dmg(e, t.shredder.damage, "shredder");
            }
          }
        }
      }

      // Sandbox Trap — containment zone: strong slow + light damage.
      if (t.sandbox.owned) {
        t.sandbox.cd -= dt;
        if (t.sandbox.cd <= 0 && S.enemies.length) {
          t.sandbox.cd = t.sandbox.interval;
          const target = S.enemies[(Math.random() * S.enemies.length) | 0];
          S.fields.push({ x: target.x, y: target.y, r: t.sandbox.radius, slow: t.sandbox.slow, dps: t.sandbox.dps, life: t.sandbox.duration, maxLife: t.sandbox.duration, kind: "sandbox" });
          feed("Sandbox Trap isolated a cluster.", "good", 5);
        }
      }
    },

    /* ---- Projectiles (EDR, Packet Storm, Threat Hunter Drone) ---- */
    updateProjectiles(dt) {
      const S = CDL.S;
      for (let i = S.projectiles.length - 1; i >= 0; i--) {
        const pr = S.projectiles[i];
        pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.life -= dt;
        let hit = false;
        if (pr.x < -20 || pr.x > CDL.W + 20 || pr.y < -20 || pr.y > CDL.H + 20) hit = true;
        else {
          for (const e of S.enemies) {
            const rad = e.r + pr.r;
            if (dist2(e.x, e.y, pr.x, pr.y) <= rad * rad) {
              let d = pr.dmg;
              if (pr.bonus && (e.type === "malware" || e.type === "ransomware")) d *= 1.5; // EDR strong vs these
              CDL.damageEnemy(e, d, pr.source || "edr");
              hit = true;
              break;
            }
          }
        }
        if (hit || pr.life <= 0) S.projectiles.splice(i, 1);
      }
    },

    /* ---- Transient visual effects: pulses + field timers ---- */
    updateEffects(dt) {
      const S = CDL.S;
      for (let i = S.pulses.length - 1; i >= 0; i--) {
        const p = S.pulses[i];
        p.life -= dt;
        p.r = p.maxR * (1 - p.life / p.maxLife);
        if (p.life <= 0) S.pulses.splice(i, 1);
      }
      for (let i = S.fields.length - 1; i >= 0; i--) {
        S.fields[i].life -= dt;
        if (S.fields[i].life <= 0) S.fields.splice(i, 1);
      }
    },

    /* ---- Rendering, split by z-layer (called from game.js render) ---- */

    // Below enemies: fields (DNS / DLP / Sandbox) + honeypot decoys.
    drawGround(ctx) {
      const S = CDL.S;
      for (const f of S.fields) {
        const a = 0.12 + 0.1 * (f.life / f.maxLife);
        if (f.kind === "sandbox") {
          // Containment square with a bright outline.
          ctx.fillStyle = "rgba(167,139,250," + a + ")";
          ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
          ctx.strokeStyle = "rgba(167,139,250,0.7)"; ctx.lineWidth = 2;
          ctx.strokeRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
        } else if (f.kind === "dlp") {
          // Net: faint fill + crosshatch clipped to the circle.
          ctx.fillStyle = "rgba(52,211,153," + (a * 0.8) + ")";
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
          ctx.save();
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.clip();
          ctx.strokeStyle = "rgba(52,211,153,0.4)"; ctx.lineWidth = 1;
          for (let g = -f.r; g <= f.r; g += 12) {
            ctx.beginPath(); ctx.moveTo(f.x + g, f.y - f.r); ctx.lineTo(f.x + g, f.y + f.r); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(f.x - f.r, f.y + g); ctx.lineTo(f.x + f.r, f.y + g); ctx.stroke();
          }
          ctx.restore();
          ctx.strokeStyle = "rgba(52,211,153,0.6)"; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
        } else {
          // DNS sinkhole (default).
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(56,189,248," + a + ")"; ctx.fill();
          ctx.strokeStyle = "rgba(56,189,248,0.5)";
          ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      for (const d of S.decoys) {
        const pulse = 1 + Math.sin(S.runTime * 8) * 0.12;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(251,191,36,0.25)"; ctx.fill();
        ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#fbbf24"; ctx.font = "12px monospace"; ctx.textAlign = "center";
        ctx.fillText("🍯", d.x, d.y + 4);
      }
    },

    // Player-centred auras: SIEM ring + quarantine beam.
    drawAuras(ctx) {
      const S = CDL.S, p = S.player, t = p.tools;
      if (t.siem.owned) {
        ctx.beginPath(); ctx.arc(p.x, p.y, t.siem.radius, 0, Math.PI * 2);
        ctx.strokeStyle = t.siem.flash > 0 ? "rgba(34,211,238,0.85)" : "rgba(34,211,238,0.28)";
        ctx.lineWidth = t.siem.flash > 0 ? 3 : 1.5; ctx.stroke();
      }
      if (t.quarantine.owned && t.quarantine.target && S.enemies.indexOf(t.quarantine.target) !== -1) {
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(t.quarantine.target.x, t.quarantine.target.y);
        ctx.strokeStyle = "rgba(56,189,248,0.85)"; ctx.lineWidth = 3;
        ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0;
      }
    },

    drawPulses(ctx) {
      for (const p of CDL.S.pulses) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(" + (p.color || "56,189,248") + "," + (p.life / p.maxLife) + ")";
        ctx.lineWidth = 4; ctx.stroke();
      }
    },

    // Above enemies: projectiles, MFA nodes, hunter drones, shredder shards.
    drawOver(ctx) {
      const S = CDL.S, p = S.player, t = p.tools;

      for (const pr of S.projectiles) {
        const c = pr.color || "#7dd3fc";
        ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
        ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      }

      if (t.mfa.owned) {
        const step = (Math.PI * 2) / t.mfa.count;
        for (let n = 0; n < t.mfa.count; n++) {
          const a = t.mfa.angle + step * n;
          const ox = p.x + Math.cos(a) * t.mfa.radius;
          const oy = p.y + Math.sin(a) * t.mfa.radius;
          ctx.beginPath(); ctx.arc(ox, oy, 7, 0, Math.PI * 2);
          ctx.fillStyle = "#a5f3fc"; ctx.shadowColor = "#22d3ee"; ctx.shadowBlur = 10;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      if (t.drone.owned) {
        const step = (Math.PI * 2) / t.drone.count;
        for (let n = 0; n < t.drone.count; n++) {
          const a = t.drone.angle + step * n;
          const ox = p.x + Math.cos(a) * t.drone.radius, oy = p.y + Math.sin(a) * t.drone.radius;
          ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#93c5fd"; ctx.shadowColor = "#3b82f6"; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(ox, oy, 8, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(147,197,253,0.5)"; ctx.lineWidth = 1; ctx.stroke();
        }
      }

      if (t.shredder.owned) {
        const step = (Math.PI * 2) / t.shredder.count;
        for (let n = 0; n < t.shredder.count; n++) {
          const a = t.shredder.angle + step * n;
          const ox = p.x + Math.cos(a) * t.shredder.radius, oy = p.y + Math.sin(a) * t.shredder.radius;
          ctx.save(); ctx.translate(ox, oy); ctx.rotate(a);
          ctx.fillStyle = "#5eead4"; ctx.shadowColor = "#5eead4"; ctx.shadowBlur = 10;
          const s = t.shredder.size;
          ctx.fillRect(-s * 0.5, -s * 0.5, s, s);
          ctx.restore(); ctx.shadowBlur = 0;
        }
      }
    },
  };
})(window.CDL);
