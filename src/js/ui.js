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
  let lastFeed = {}; // feed throttle memory — reset each run

  const DANGER_CLS = { Low: "danger-low", Medium: "danger-med", High: "danger-high", Critical: "danger-crit" };

  // Shared card markup (used by level-up + start-tool cards).
  function cardInner(c) {
    const tag = CDL.UPGRADE_TAGS[c.kind] || CDL.UPGRADE_TAGS.upgrade;
    const rar = CDL.UPGRADE_RARITY[c.rarity] || CDL.UPGRADE_RARITY.common;
    let html =
      '<div class="card-badges">' +
        '<span class="card-tag ' + tag.cls + '">' + tag.label + "</span>" +
        '<span class="card-rarity ' + rar.cls + '">' + rar.label + "</span>" +
      "</div>" +
      '<div class="card-icon">' + c.icon + "</div>" +
      '<div class="card-name">' + c.name + "</div>";
    if (c.range) html += '<div class="card-range">' + c.range + "</div>";
    if (c.desc) html += '<div class="card-desc">' + c.desc + "</div>";
    if (c.stats && c.stats.length) {
      html += '<div class="card-stats">';
      for (const s of c.stats) html += '<div class="card-stat">' + s + "</div>";
      html += "</div>";
    }
    html += '<button class="btn btn-primary">' + (c.btn || "Select") + "</button>";
    return html;
  }

  CDL.UI = {
    init() {
      R = {
        screens: {
          menu: $("screen-menu"), howto: $("screen-howto"), starttool: $("screen-starttool"),
          game: $("screen-game"), gameover: $("screen-gameover"),
          hub: $("screen-hub"), library: $("screen-library"), threatdb: $("screen-threatdb"),
          achievements: $("screen-achievements"), lab: $("screen-lab"), archive: $("screen-archive"),
          daily: $("screen-daily"),
        },
        hpFill: $("hp-fill"), hpText: $("hp-text"),
        xpFill: $("xp-fill"), xpText: $("xp-text"),
        level: $("stat-level"), wave: $("stat-wave"), score: $("stat-score"), best: $("stat-best"),
        hudDifficulty: $("hud-difficulty"), loadout: $("hud-loadout"),
        menuBest: $("menu-best"),
        feed: $("event-feed"),
        waveBanner: $("wave-banner"),
        damageFlash: $("damage-flash"),
        overlayPause: $("overlay-pause"),
        overlayLevelup: $("overlay-levelup"),
        levelupCards: $("levelup-cards"), levelupLevel: $("levelup-level"),
        startToolCards: $("starttool-cards"),
        diffBtns: Array.prototype.slice.call(document.querySelectorAll(".diff-btn")),
        diffDesc: $("diff-desc"),
        threatIntel: $("threat-intel-list"), toolGuide: $("tools-list"),
        goScore: $("go-score"), goWave: $("go-wave"), goLevel: $("go-level"), goBest: $("go-best"),
        goThreats: $("go-threats"), goTelemetry: $("go-telemetry"), goDifficulty: $("go-difficulty"),
        goTool: $("go-tool"), goThreat: $("go-threat"), goReco: $("go-reco"),
        goBreakdown: $("go-breakdown"), goNewBest: $("go-newbest"), goUnlocks: $("go-unlocks"),
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

    /* ---- Starting tool choice ---- */
    showStartTools(choices, onPick) {
      R.startToolCards.innerHTML = "";
      for (const def of choices) {
        const d = CDL.toolCardData(def);
        const card = document.createElement("div");
        card.className = "card rarity-rare";
        card.innerHTML = cardInner({ kind: "unlock", rarity: "rare", icon: d.icon, name: def.name, range: d.range, desc: d.desc, stats: d.stats });
        card.addEventListener("click", () => onPick(def));
        R.startToolCards.appendChild(card);
      }
      CDL.UI.showScreen("starttool");
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
      const icons = p.toolOrder.map((id) => CDL.ABILITY_MAP[id].icon).join("");
      R.loadout.innerHTML =
        '<span class="ld-count">Tools ' + p.toolOrder.length + " / " + CDL.CONFIG.maxTools + "</span>" +
        '<span class="ld-icons">' + icons + "</span>";
    },

    /* ---- Player damage flash ---- */
    flashDamage() {
      const el = R.damageFlash;
      el.classList.remove("flash");
      void el.offsetWidth;
      el.classList.add("flash");
    },

    /* ---- Event feed (quiet: important messages only, fast fade) ---- */
    resetFeed() { lastFeed = {}; CDL.S.feed.length = 0; R.feed.innerHTML = ""; },

    feedMsg(text, kind, minGap = 2.5) {
      const S = CDL.S, now = S.runTime;
      if (lastFeed[text] !== undefined && now - lastFeed[text] < minGap) return;
      lastFeed[text] = now;
      S.feed.push({ text, kind: kind || "", life: 2.2 });
      if (S.feed.length > 2) S.feed.shift();
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
      R.waveBanner.innerHTML = '<div class="wb-title">' + title + "</div>" + '<div class="wb-sub">' + sub + "</div>";
      R.waveBanner.classList.remove("hidden");
      R.waveBanner.classList.remove("show"); void R.waveBanner.offsetWidth; R.waveBanner.classList.add("show");
      clearTimeout(CDL.UI._bannerT);
      CDL.UI._bannerT = setTimeout(() => R.waveBanner.classList.add("hidden"), 2000);
    },

    /* ---- Pause ---- */
    setPauseVisible(on) { R.overlayPause.classList.toggle("hidden", !on); },

    /* ---- Level-up cards ---- */
    openUpgrades(level, choices, onPick) {
      R.levelupLevel.textContent = level;
      R.levelupCards.innerHTML = "";
      for (const c of choices) {
        const rar = CDL.UPGRADE_RARITY[c.rarity] || CDL.UPGRADE_RARITY.common;
        const card = document.createElement("div");
        card.className = "card rarity-" + rar.cls;
        card.innerHTML = cardInner(c);
        card.addEventListener("click", () => onPick(c));
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
      R.goBreakdown.innerHTML = "";
      for (const row of rep.breakdown) {
        const el = document.createElement("div");
        el.className = "ibd-row" + (row.count > 0 ? "" : " ibd-zero");
        el.innerHTML = '<span class="ibd-name">' + row.label + "</span>" + '<span class="ibd-count">' + row.count + "</span>";
        R.goBreakdown.appendChild(el);
      }
      // Newly earned this run (tools / achievements / lab items).
      R.goUnlocks.innerHTML = "";
      if (rep.unlocks && rep.unlocks.length) {
        const head = document.createElement("div");
        head.className = "go-unlocks-title";
        head.textContent = "▸ UNLOCKED THIS RUN";
        R.goUnlocks.appendChild(head);
        for (const line of rep.unlocks) {
          const el = document.createElement("div");
          el.className = "go-unlock-row";
          el.textContent = line;
          R.goUnlocks.appendChild(el);
        }
        R.goUnlocks.classList.remove("hidden");
      } else {
        R.goUnlocks.classList.add("hidden");
      }

      R.goNewBest.classList.toggle("hidden", !rep.isBest);
      CDL.UI.showScreen("gameover");
    },
  };

  /* ---- Static info guides (built once at init) ---- */
  function buildThreatIntel() {
    R.threatIntel.innerHTML = "";
    for (const key of CDL.THREAT_ORDER) {
      const d = CDL.ENEMY_TYPES[key];
      const el = document.createElement("div");
      el.className = "intel-item";
      el.innerHTML =
        '<div class="intel-head"><span class="intel-name">' + d.label + "</span>" +
          '<span class="intel-danger ' + (DANGER_CLS[d.danger] || "danger-med") + '">' + d.danger + "</span></div>" +
        '<div class="intel-behavior">' + d.behavior + "</div>" +
        '<div class="intel-tip">' + d.tip + "</div>";
      R.threatIntel.appendChild(el);
    }
  }

  function buildToolGuide() {
    R.toolGuide.innerHTML = "";
    for (const key of CDL.TOOL_ORDER) {
      const t = CDL.TOOL_INFO[key], def = CDL.ABILITY_MAP[key], b = def.base;
      const dmg = b.dps != null ? b.dps + "/s" : b.damage;
      const el = document.createElement("div");
      el.className = "tool-item";
      el.innerHTML =
        '<div class="tool-head"><span class="tool-ic">' + t.icon + "</span>" +
          '<span class="tool-name">' + t.name + "</span>" +
          '<span class="tool-range">' + def.range + "</span></div>" +
        '<div class="tool-stat">⚔ ' + dmg + "</div>" +
        '<div class="tool-behavior">' + t.behavior + "</div>" +
        '<div class="tool-explain">' + t.explain + "</div>";
      R.toolGuide.appendChild(el);
    }
  }
})(window.CDL);
