/* ============================================================
   ui.js — all DOM / HUD / overlay / screen concerns
   ------------------------------------------------------------
   The only module that touches the DOM. Game logic talks to the
   screen exclusively through CDL.UI.
   ============================================================ */

(function (CDL) {
  "use strict";

  const { clamp } = CDL;
  const $ = (id) => document.getElementById(id);

  let R = null; // cached DOM refs (populated by init)

  // Feed throttle memory — reset each run so timestamps don't carry over.
  let lastFeed = {};

  // Danger word -> css class for the Threat Intel badges.
  const DANGER_CLS = { Low: "danger-low", Medium: "danger-med", High: "danger-high", Critical: "danger-crit" };

  CDL.UI = {
    init() {
      R = {
        screens: { menu: $("screen-menu"), howto: $("screen-howto"), game: $("screen-game"), gameover: $("screen-gameover") },
        hpFill: $("hp-fill"), hpText: $("hp-text"),
        xpFill: $("xp-fill"), xpText: $("xp-text"),
        level: $("stat-level"), wave: $("stat-wave"), score: $("stat-score"), best: $("stat-best"),
        hudDifficulty: $("hud-difficulty"),
        menuBest: $("menu-best"),
        feed: $("event-feed"),
        waveBanner: $("wave-banner"),
        damageFlash: $("damage-flash"),
        overlayPause: $("overlay-pause"),
        overlayLevelup: $("overlay-levelup"),
        levelupCards: $("levelup-cards"), levelupLevel: $("levelup-level"),
        // menu difficulty selector
        diffBtns: Array.prototype.slice.call(document.querySelectorAll(".diff-btn")),
        diffDesc: $("diff-desc"),
        // how-to info guides
        threatIntel: $("threat-intel-list"), toolGuide: $("tools-list"),
        // game over + incident report
        goScore: $("go-score"), goWave: $("go-wave"), goLevel: $("go-level"), goBest: $("go-best"),
        goThreats: $("go-threats"), goTelemetry: $("go-telemetry"), goDifficulty: $("go-difficulty"),
        goTool: $("go-tool"), goThreat: $("go-threat"), goReco: $("go-reco"),
        goBreakdown: $("go-breakdown"), goNewBest: $("go-newbest"),
      };
      buildThreatIntel();
      buildToolGuide();
    },

    /* ---- Screens ---- */
    showScreen(name) {
      for (const k in R.screens) R.screens[k].classList.toggle("hidden", k !== name);
    },

    setMenuBest(v) { R.menuBest.textContent = v; },

    /* ---- Difficulty selection (menu) ---- */
    selectDifficulty(key) {
      if (!CDL.CONFIG.difficulties[key]) return;
      CDL.S.difficulty = key;
      for (const b of R.diffBtns) b.classList.toggle("is-active", b.dataset.diff === key);
      R.diffDesc.textContent = CDL.CONFIG.difficulties[key].desc;
    },

    /* ---- HUD ---- */
    syncHud() {
      const S = CDL.S, p = S.player;
      R.hpFill.style.width = clamp((p.hp / p.maxHp) * 100, 0, 100) + "%";
      R.hpText.textContent = Math.ceil(p.hp) + " / " + p.maxHp;
      R.xpFill.style.width = clamp((p.xp / p.xpToNext) * 100, 0, 100) + "%";
      R.xpText.textContent = p.xp + " / " + p.xpToNext;
      R.level.textContent = p.level;
      R.wave.textContent = S.wave;
      R.score.textContent = p.score;
      R.best.textContent = Math.max(S.bestScore, p.score);
      R.hudDifficulty.textContent = CDL.diff().label;
    },

    /* ---- Player damage flash (cheap CSS overlay) ---- */
    flashDamage() {
      const el = R.damageFlash;
      el.classList.remove("flash");
      void el.offsetWidth; // reflow so the animation restarts every hit
      el.classList.add("flash");
    },

    /* ---- Event feed (throttled) ---- */
    resetFeed() { lastFeed = {}; CDL.S.feed.length = 0; R.feed.innerHTML = ""; },

    feedMsg(text, kind, minGap = 2.5) {
      const S = CDL.S, now = S.runTime;
      if (lastFeed[text] !== undefined && now - lastFeed[text] < minGap) return;
      lastFeed[text] = now;
      S.feed.push({ text, kind: kind || "", life: 3.2 });
      if (S.feed.length > 5) S.feed.shift();
      CDL.UI.renderFeed();
    },

    renderFeed() {
      R.feed.innerHTML = "";
      for (const f of CDL.S.feed) {
        const el = document.createElement("div");
        el.className = "feed-item" + (f.kind ? " " + f.kind : "");
        el.textContent = f.text;
        R.feed.appendChild(el);
      }
    },

    // Age feed items each frame; re-render only when one drops off.
    feedTick(dt) {
      const S = CDL.S;
      let changed = false;
      for (let i = S.feed.length - 1; i >= 0; i--) {
        S.feed[i].life -= dt;
        if (S.feed[i].life <= 0) { S.feed.splice(i, 1); changed = true; }
      }
      if (changed) CDL.UI.renderFeed();
    },

    /* ---- Wave banner ---- */
    banner(title, sub) {
      R.waveBanner.innerHTML =
        '<div class="wb-title">' + title + "</div>" +
        '<div class="wb-sub">' + sub + "</div>";
      R.waveBanner.classList.remove("hidden");
      // Re-trigger the entrance animation.
      R.waveBanner.classList.remove("show"); void R.waveBanner.offsetWidth; R.waveBanner.classList.add("show");
      clearTimeout(CDL.UI._bannerT);
      CDL.UI._bannerT = setTimeout(() => R.waveBanner.classList.add("hidden"), 2000);
    },

    /* ---- Pause ---- */
    setPauseVisible(on) { R.overlayPause.classList.toggle("hidden", !on); },

    /* ---- Level-up upgrade cards ---- */
    openUpgrades(level, choices, onPick) {
      R.levelupLevel.textContent = level;
      R.levelupCards.innerHTML = "";
      for (const u of choices) {
        const tag = CDL.UPGRADE_TAGS[u.kind] || CDL.UPGRADE_TAGS.upgrade;
        const rar = CDL.UPGRADE_RARITY[u.rarity] || CDL.UPGRADE_RARITY.common;
        const card = document.createElement("div");
        card.className = "card rarity-" + rar.cls;
        card.innerHTML =
          '<div class="card-badges">' +
            '<span class="card-tag ' + tag.cls + '">' + tag.label + "</span>" +
            '<span class="card-rarity ' + rar.cls + '">' + rar.label + "</span>" +
          "</div>" +
          '<div class="card-icon">' + u.icon + "</div>" +
          '<div class="card-name">' + u.name + "</div>" +
          '<div class="card-desc">' + u.desc + "</div>" +
          '<button class="btn btn-primary">Select</button>';
        card.addEventListener("click", () => onPick(u));
        R.levelupCards.appendChild(card);
      }
      R.overlayLevelup.classList.remove("hidden");
    },
    hideUpgrades() { R.overlayLevelup.classList.add("hidden"); },

    /* ---- Game over + incident report ---- */
    showIncidentReport(rep) {
      R.goScore.textContent = rep.score;
      R.goWave.textContent = rep.wave;
      R.goLevel.textContent = rep.level;
      R.goBest.textContent = rep.best;
      R.goThreats.textContent = rep.threats;
      R.goTelemetry.textContent = rep.telemetry;
      R.goDifficulty.textContent = rep.difficulty;
      R.goTool.textContent = rep.tool;
      R.goThreat.textContent = rep.threat;
      R.goReco.textContent = rep.reco;

      // Per-type threat breakdown (every threat, even 0, in stable order).
      R.goBreakdown.innerHTML = "";
      for (const row of rep.breakdown) {
        const el = document.createElement("div");
        el.className = "ibd-row" + (row.count > 0 ? "" : " ibd-zero");
        el.innerHTML = '<span class="ibd-name">' + row.label + "</span>" +
                       '<span class="ibd-count">' + row.count + "</span>";
        R.goBreakdown.appendChild(el);
      }

      R.goNewBest.classList.toggle("hidden", !rep.isBest);
      CDL.UI.showScreen("gameover");
    },
  };

  /* ---- Static info guides (built once at init from data) ---- */
  function buildThreatIntel() {
    R.threatIntel.innerHTML = "";
    for (const key of CDL.THREAT_ORDER) {
      const d = CDL.ENEMY_TYPES[key];
      const el = document.createElement("div");
      el.className = "intel-item";
      el.innerHTML =
        '<div class="intel-head">' +
          '<span class="intel-name">' + d.label + "</span>" +
          '<span class="intel-danger ' + (DANGER_CLS[d.danger] || "danger-med") + '">' + d.danger + "</span>" +
        "</div>" +
        '<div class="intel-behavior">' + d.behavior + "</div>" +
        '<div class="intel-tip">' + d.tip + "</div>";
      R.threatIntel.appendChild(el);
    }
  }

  function buildToolGuide() {
    R.toolGuide.innerHTML = "";
    for (const key of CDL.TOOL_ORDER) {
      const t = CDL.TOOL_INFO[key];
      const el = document.createElement("div");
      el.className = "tool-item";
      el.innerHTML =
        '<div class="tool-head"><span class="tool-ic">' + t.icon + "</span>" +
          '<span class="tool-name">' + t.name + "</span></div>" +
        '<div class="tool-behavior">' + t.behavior + "</div>" +
        '<div class="tool-explain">' + t.explain + "</div>";
      R.toolGuide.appendChild(el);
    }
  }
})(window.CDL);
