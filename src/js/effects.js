/* ============================================================
   effects.js — lightweight juice: death bursts & pickup pops
   ------------------------------------------------------------
   Pure cosmetic particles. Kept cheap (short-lived dots + the odd
   ring) so a busy screen never tanks performance. Enemy *hit*
   feedback is a per-enemy flash handled in enemies.js, not here,
   so continuous damage (e.g. the Quarantine Beam) can't spam
   particles.
   ============================================================ */

(function (CDL) {
  "use strict";

  const { rand } = CDL;
  const MAX = 220; // hard cap on live particles (safety valve)

  function add(p) {
    const arr = CDL.S.particles;
    if (arr.length < MAX) arr.push(p);
  }

  CDL.Effects = {
    reset() { CDL.S.particles.length = 0; },

    // Burst when a threat is contained.
    death(x, y, color) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + rand(-0.3, 0.3);
        const sp = rand(60, 170);
        add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
              life: rand(0.3, 0.5), max: 0.5, r: rand(1.6, 3), color });
      }
      // A single quick expanding ring reads as "neutralized".
      add({ x, y, vx: 0, vy: 0, life: 0.3, max: 0.3, ring: true, rr: 4, color });
    },

    // Small green pop when telemetry is collected.
    pickup(x, y) {
      for (let i = 0; i < 4; i++) {
        add({ x, y, vx: rand(-40, 40), vy: rand(-70, -20),
              life: rand(0.2, 0.32), max: 0.32, r: rand(1.4, 2.4), color: "#34d399" });
      }
    },

    update(dt) {
      const arr = CDL.S.particles;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.life -= dt;
        if (p.life <= 0) { arr.splice(i, 1); continue; }
        if (p.ring) { p.rr += dt * 130; }
        else {
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.vx *= 0.9; p.vy *= 0.9;
        }
      }
    },

    draw(ctx) {
      for (const p of CDL.S.particles) {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        if (p.ring) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.rr, 0, Math.PI * 2);
          ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color; ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
})(window.CDL);
