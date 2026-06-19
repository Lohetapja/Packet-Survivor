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
    S.pulses = []; S.fields = []; S.decoys = [];
    S.wave = 1;
    S.waveTimer = CDL.CONFIG.waves.duration;
    S.spawnTimer = 0;
    S.runTime = 0;
    S.shake = 0;
    S.pendingLevelUps = 0;
    S.bestScore = CDL.Storage.loadBest();
    S.stats = CDL.freshStats();
    CDL.UI.resetFeed();
    CDL.Waves.announce(1);
    CDL.UI.syncHud();
  }

  function startGame() {
    CDL.UI.setPauseVisible(false);
    CDL.UI.hideUpgrades();
    newGame();
    CDL.UI.showScreen("game");
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
    CDL.UI.setMenuBest(CDL.Storage.loadBest());
    CDL.UI.showScreen("menu");
  }

  // Game over: persist best, build the incident report, show the screen.
  function endGame() {
    S.state = "gameover";
    const p = S.player;
    const isBest = p.score > S.bestScore;
    if (isBest) { S.bestScore = p.score; CDL.Storage.saveBest(S.bestScore); }
    CDL.UI.showIncidentReport(buildIncidentReport(isBest));
  }

  // Post-run summary: which tool carried, which threat hurt most, and
  // an abstract defensive recommendation tied to that threat.
  function buildIncidentReport(isBest) {
    const p = S.player, st = S.stats;

    const topTool = argmax(st.killsByTool);
    const topThreat = argmax(st.dmgByThreat);

    const tool = topTool ? (CDL.TOOL_META[topTool] || topTool) : "Firewall Pulse";
    const threat = topThreat ? CDL.ENEMY_TYPES[topThreat].label : "None — defenses held";
    const reco = topThreat
      ? CDL.ENEMY_TYPES[topThreat].tip
      : "Defenses held this run. Keep layering controls — defense in depth buys time.";

    return {
      score: p.score, wave: S.wave, level: p.level, best: S.bestScore,
      threats: st.kills, tool, threat, reco, isBest,
    };
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
    u.apply(S.player, S.player.tools);
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

  /* ---- Button wiring ---- */
  function wireUI() {
    $("btn-start").addEventListener("click", startGame);
    $("btn-howto").addEventListener("click", () => CDL.UI.showScreen("howto"));
    $("btn-howto-back").addEventListener("click", () => CDL.UI.showScreen("menu"));
    $("btn-reset").addEventListener("click", () => {
      CDL.Storage.saveBest(0);
      S.bestScore = 0;
      CDL.UI.setMenuBest(0);
    });
    $("btn-pause").addEventListener("click", () => setPaused(S.state !== "paused"));
    $("btn-resume").addEventListener("click", () => setPaused(false));
    $("btn-pause-restart").addEventListener("click", startGame);
    $("btn-quit").addEventListener("click", toMenu);
    $("btn-restart").addEventListener("click", startGame);
    $("btn-menu").addEventListener("click", toMenu);
  }

  // Expose only what other modules need to call back into.
  CDL.Game = { over: endGame };

  /* ---- Boot ---- */
  function boot() {
    CDL.UI.init();
    S.bestScore = CDL.Storage.loadBest();
    CDL.UI.setMenuBest(S.bestScore);
    wireUI();
    CDL.UI.showScreen("menu");
    requestAnimationFrame(frame);
  }

  boot();
})(window.CDL);
