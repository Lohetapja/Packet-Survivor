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

  CDL.UI = {
    init() {
      R = {
        screens: { menu: $("screen-menu"), howto: $("screen-howto"), game: $("screen-game"), gameover: $("screen-gameover") },
        hpFill: $("hp-fill"), hpText: $("hp-text"),
        xpFill: $("xp-fill"), xpText: $("xp-text"),
        level: $("stat-level"), wave: $("stat-wave"), score: $("stat-score"), best: $("stat-best"),
        menuBest: $("menu-best"),
        feed: $("event-feed"),
        waveBanner: $("wave-banner"),
        overlayPause: $("overlay-pause"),
        overlayLevelup: $("overlay-levelup"),
        levelupCards: $("levelup-cards"), levelupLevel: $("levelup-level"),
        // game over + incident report
        goScore: $("go-score"), goWave: $("go-wave"), goLevel: $("go-level"), goBest: $("go-best"),
        goThreats: $("go-threats"), goTool: $("go-tool"), goThreat: $("go-threat"), goReco: $("go-reco"),
        goNewBest: $("go-newbest"),
      };
    },

    /* ---- Screens ---- */
    showScreen(name) {
      for (const k in R.screens) R.screens[k].classList.toggle("hidden", k !== name);
    },

    setMenuBest(v) { R.menuBest.textContent = v; },

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
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML =
          '<div class="card-icon">' + u.icon + "</div>" +
          '<div class="card-name">' + u.name + "</div>" +
          '<div class="card-desc">' + u.desc + "</div>" +
          '<div class="card-tag ' + tag.cls + '">' + tag.label + "</div>" +
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
      R.goTool.textContent = rep.tool;
      R.goThreat.textContent = rep.threat;
      R.goReco.textContent = rep.reco;
      R.goNewBest.classList.toggle("hidden", !rep.isBest);
      CDL.UI.showScreen("gameover");
    },
  };
})(window.CDL);
