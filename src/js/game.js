/* ============================================================
   game.js — main controller (loaded LAST)
   ------------------------------------------------------------
   Owns: input, the state machine, the animation loop, run setup,
   level-up flow, the post-run incident report, and wiring the
   menu/pause/game-over buttons.

   State machine (CDL.S.state):
     menu → playing ⇄ paused
            playing → levelup → playing
            playing → gameover → (restart|menu)

   ★ Difficulty/balance numbers: src/js/config.js
   ★ New threats: src/js/enemies.js + src/js/waves.js
   ★ New tools:   src/js/tools.js + src/js/upgrades.js
   ============================================================ */

(function (CDL) {
  "use strict";

  const S = CDL.S;
  const $ = (id) => document.getElementById(id);

  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");

  /* ---- Input ---- */
  CDL.input = { up: false, down: false, left: false, right: false };
  const MOVE_KEYS = {
    KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
    KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
  };
  window.addEventListener("keydown", (e) => {
    if (MOVE_KEYS[e.code]) { CDL.input[MOVE_KEYS[e.code]] = true; e.preventDefault(); }
    if (e.code === "Space") {
      e.preventDefault();
      if (S.state === "playing") setPaused(true);
      else if (S.state === "paused") setPaused(false);
    }
  });
  window.addEventListener("keyup", (e) => {
    if (MOVE_KEYS[e.code]) { CDL.input[MOVE_KEYS[e.code]] = false; e.preventDefault(); }
  });

  /* ---- Run setup / state transitions ---- */
  function newGame() {
    S.player = CDL.Player.create();
    S.enemies = []; S.projectiles = []; S.pickups = [];
    S.pulses = []; S.fields = []; S.decoys = []; S.particles = [];
    S.mines = []; S.walls = [];
    S.wave = 1;
    S.waveTimer = CDL.CONFIG.waves.duration;
    S.spawnTimer = 0;
    S.runTime = 0;
    S.shake = 0;
    S.pendingLevelUps = 0;
    S.bestScore = CDL.Save.data.bestScore;
    S.stats = CDL.freshStats();
    CDL.UI.resetFeed();
    CDL.UI.syncHud();
  }

  // Start a normal run → choose a starting damage tool, then begin.
  function startGame() {
    S.mode = "normal"; S.daily = null; S.dailyMods = {};
    enterStartTool();
  }

  // Start today's Daily Simulation (modifiers applied for the run).
  function startDaily() {
    const d = CDL.Progression.todayDaily();
    S.mode = "daily"; S.daily = d; S.dailyMods = d.mods;
    enterStartTool();
  }

  // Shared: reset the world and open the starting-tool chooser.
  function enterStartTool() {
    CDL.UI.setPauseVisible(false);
    CDL.UI.hideUpgrades();
    newGame();
    S.state = "starttool";
    CDL.UI.showStartTools(CDL.starterChoices(), beginRun);
  }

  // Apply the chosen starter and drop into wave 1.
  function beginRun(def) {
    CDL.grantTool(S.player, def.id);
    CDL.UI.feedMsg("Acquired: " + def.name, "good", 0);
    CDL.UI.showScreen("game");
    CDL.Waves.announce(1);
    CDL.UI.syncHud();
    S.state = "playing";
  }

  function setPaused(on) {
    if (on && S.state === "playing") { S.state = "paused"; CDL.UI.setPauseVisible(true); }
    else if (!on && S.state === "paused") { S.state = "playing"; CDL.UI.setPauseVisible(false); }
  }

  function toMenu() {
    S.state = "menu";
    CDL.UI.setPauseVisible(false);
    CDL.UI.hideUpgrades();
    CDL.UI.setMenuBest(CDL.Save.data.bestScore);
    CDL.UI.showScreen("menu");
  }

  // Game over: fold the run into the persistent save (best score, lifetime
  // stats, unlocks, achievements, lab items, incident archive), then show the
  // incident report with anything newly earned this run.
  function endGame() {
    S.state = "gameover";
    const p = S.player, st = S.stats;
    const isBest = p.score > S.bestScore;

    const topTool = argmax(st.killsByTool);
    const topThreat = argmax(st.dmgByThreat) || argmax(st.killsByType);
    const toolName = topTool ? (CDL.TOOL_META[topTool] || topTool)
      : (p.toolOrder[0] ? CDL.TOOL_META[p.toolOrder[0]] : "—");
    const threatName = topThreat ? CDL.ENEMY_TYPES[topThreat].label : "None — defenses held";
    const reco = topThreat ? CDL.ENEMY_TYPES[topThreat].reco
      : "Defenses held this run. Keep layering controls — defense in depth buys time.";
    const modeLabel = (S.mode === "daily" && S.daily) ? ("Daily · " + S.daily.name) : CDL.diff().label;

    const record = {
      date: new Date().toISOString().slice(0, 10),
      mode: S.mode, modeLabel, daily: S.daily ? S.daily.day : null,
      score: p.score, wave: S.wave, level: p.level, loadout: p.toolOrder.length,
      telemetry: st.telemetry, threats: st.kills,
      killsByType: st.killsByType, dmgByThreat: st.dmgByThreat,
      encounteredThreats: st.encounteredThreats, killsByTool: st.killsByTool,
      firstWaveByType: st.firstWaveByType, ownedTools: p.toolOrder.slice(),
      tool: toolName, threat: threatName, reco,
    };
    const gains = CDL.Progression.applyRun(record);
    S.bestScore = CDL.Save.data.bestScore;

    const breakdown = CDL.THREAT_ORDER.map((k) => ({
      label: CDL.ENEMY_TYPES[k].label, count: st.killsByType[k] || 0,
    }));
    CDL.UI.showIncidentReport({
      score: p.score, wave: S.wave, level: p.level, best: S.bestScore,
      threats: st.kills, telemetry: st.telemetry, difficulty: modeLabel,
      tool: toolName, threat: threatName, reco, breakdown, isBest,
      unlocks: formatGains(gains),
    });
  }

  // Turn newly-earned unlocks/achievements/lab items into display lines.
  function formatGains(g) {
    const out = [];
    for (const id of g.newTools) out.push("🔓 New tool: " + (CDL.TOOL_META[id] || id));
    for (const id of g.newAch) out.push("🏆 Achievement: " + CDL.Progression.ACH_MAP[id].name);
    for (const id of g.newLab) out.push("🧩 Lab item: " + CDL.Progression.LAB_MAP[id].name);
    return out;
  }

  function argmax(map) {
    let bestKey = null, bestVal = -Infinity;
    for (const k in map) if (map[k] > bestVal) { bestVal = map[k]; bestKey = k; }
    return bestKey;
  }

  /* ---- Level-up flow ---- */
  function openLevelUp() {
    S.state = "levelup";
    CDL.UI.openUpgrades(S.player.level, CDL.buildChoices(), chooseUpgrade);
  }
  function chooseUpgrade(u) {
    u.apply(S.player);
    if (u.kind === "unlock") CDL.UI.feedMsg("Acquired: " + u.name, "good", 0);
    S.pendingLevelUps--;
    CDL.UI.hideUpgrades();
    CDL.UI.syncHud();
    if (S.pendingLevelUps > 0) openLevelUp();
    else S.state = "playing";
  }

  /* ---- Main loop ---- */
  let lastTime = 0;
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000 || 0, 0.05);
    lastTime = now;

    if (S.state === "playing") update(dt);
    if (S.state === "playing" || S.state === "paused" || S.state === "levelup") render();

    requestAnimationFrame(frame);
  }

  function update(dt) {
    S.runTime += dt;

    CDL.Player.update(dt);
    CDL.Tools.update(dt);
    CDL.Enemies.update(dt);
    CDL.Tools.updateProjectiles(dt);
    CDL.Player.updatePickups(dt);
    CDL.Tools.updateEffects(dt);
    CDL.Effects.update(dt);

    // Waves: spawn on a shrinking timer, advance when the clock runs out.
    S.waveTimer -= dt;
    S.spawnTimer -= dt;
    if (S.spawnTimer <= 0) { CDL.Waves.spawnTick(); S.spawnTimer = CDL.Waves.spawnInterval(); }
    if (S.waveTimer <= 0) CDL.Waves.nextWave();

    if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 60);

    CDL.UI.feedTick(dt);
    CDL.UI.syncHud();

    // Open the upgrade chooser for any level-ups earned this frame.
    if (S.pendingLevelUps > 0 && S.state === "playing") openLevelUp();
  }

  /* ---- Rendering (z-ordered layers) ---- */
  function render() {
    ctx.save();
    if (S.shake > 0) ctx.translate(CDL.rand(-S.shake, S.shake), CDL.rand(-S.shake, S.shake));

    drawBackground();
    CDL.Tools.drawGround(ctx);     // sinkhole fields, decoys
    CDL.Player.drawTelemetry(ctx); // telemetry pickups
    CDL.Tools.drawAuras(ctx);      // SIEM ring, quarantine beam
    CDL.Tools.drawPulses(ctx);     // firewall pulses
    CDL.Enemies.draw(ctx);         // threats
    CDL.Tools.drawOver(ctx);       // EDR projectiles, MFA nodes
    CDL.Effects.draw(ctx);         // death bursts, telemetry pops
    CDL.Player.draw(ctx);          // the defender packet

    ctx.restore();
  }

  function drawBackground() {
    const W = CDL.W, H = CDL.H;
    ctx.fillStyle = "#05080f";
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.strokeStyle = "rgba(56,189,248,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
    ctx.strokeStyle = "rgba(56,189,248,0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, W - 4, H - 4);
  }

  // Show the Daily Simulation briefing (name + modifiers), then Begin.
  function dailyIntro() { CDL.Hub.showDailyIntro(CDL.Progression.todayDaily()); }

  // Reset Progress — wipe the save, but only after explicit confirmation.
  function resetProgress() {
    if (!window.confirm("Reset ALL progress?\n\nThis permanently clears unlocks, achievements, lab items, best scores, and incident history. This cannot be undone.")) return;
    CDL.Save.reset();
    S.bestScore = 0;
    CDL.UI.setMenuBest(0);
    if (CDL.Hub && CDL.Hub.refresh) CDL.Hub.refresh();
  }

  /* ---- Button wiring (optional-safe: only binds buttons that exist) ---- */
  function wireUI() {
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
    on("btn-start", startGame);
    on("btn-daily", dailyIntro);
    on("btn-hub", () => CDL.Hub.show("hub"));
    on("btn-howto", () => CDL.UI.showScreen("howto"));
    on("btn-howto-back", () => CDL.UI.showScreen("menu"));
    on("btn-reset", resetProgress);
    document.querySelectorAll(".diff-btn").forEach((b) => {
      b.addEventListener("click", () => CDL.UI.selectDifficulty(b.dataset.diff));
    });
    on("btn-pause", () => setPaused(S.state !== "paused"));
    on("btn-resume", () => setPaused(false));
    on("btn-pause-restart", startGame);
    on("btn-quit", toMenu);
    on("btn-restart", startGame);
    on("btn-menu", toMenu);
    // SOC Hub sub-navigation + Daily begin/back (screens added in hub.js).
    on("btn-hub-library", () => CDL.Hub.show("library"));
    on("btn-hub-intel", () => CDL.Hub.show("threatdb"));
    on("btn-hub-ach", () => CDL.Hub.show("achievements"));
    on("btn-hub-lab", () => CDL.Hub.show("lab"));
    on("btn-hub-archive", () => CDL.Hub.show("archive"));
    on("btn-hub-daily", dailyIntro);
    on("btn-daily-begin", startDaily);
    // Generic "back" buttons carry data-back="menu" or a hub-screen name.
    document.querySelectorAll("[data-back]").forEach((b) => {
      b.addEventListener("click", () => {
        const t = b.getAttribute("data-back");
        if (t === "menu") CDL.UI.showScreen("menu");
        else CDL.Hub.show(t);
      });
    });
  }

  // Expose what other modules call back into.
  CDL.Game = { over: endGame, startNormal: startGame, startDaily, dailyIntro };

  /* ---- Boot ---- */
  function boot() {
    CDL.UI.init();
    CDL.Save.load();
    S.bestScore = CDL.Save.data.bestScore;
    CDL.UI.setMenuBest(S.bestScore);
    wireUI();
    CDL.UI.selectDifficulty(CDL.CONFIG.defaultDifficulty);
    CDL.UI.showScreen("menu");
    requestAnimationFrame(frame);
  }

  boot();
})(window.CDL);
