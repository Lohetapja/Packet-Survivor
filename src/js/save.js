/* ============================================================
   save.js — persistent progression save (localStorage only)
   ------------------------------------------------------------
   v0.6.0. One JSON blob under `packetSurvivorSave`. Everything is
   local — no backend, no accounts, no tracking. Migrates the old
   best-score key and fills in any missing fields safely so older
   saves keep working.
   ============================================================ */

(function (CDL) {
  "use strict";

  const KEY = "packetSurvivorSave";
  const OLD_BEST = "cdl_packet_survivor_best"; // legacy best-score key (pre-0.6)

  // Tools the player owns from the very first run (≥3 damage tools so the
  // starting-tool choice always works). Everything else is unlocked through play.
  const DEFAULT_UNLOCKED = ["firewall", "edr", "siem", "mfa", "quarantine", "patchwave", "dns"];

  function defaults() {
    return {
      version: "0.6.0",
      lifetimeTelemetry: 0,
      totalRuns: 0,
      bestScore: 0,
      bestWave: 0,
      bestLevel: 0,
      lifetimeContained: 0,   // total threats contained across all runs
      maxLoadout: 0,          // most tools owned in any single run
      unlockedTools: DEFAULT_UNLOCKED.slice(),
      discoveredTools: DEFAULT_UNLOCKED.slice(),
      discoveredThreats: [],
      achievements: [],
      threatStats: {},        // type -> { contained, damage, firstWave }
      toolStats: {},          // id   -> { contained }
      incidentArchive: [],    // last 10 run reports (newest first)
      labRoomUnlocks: [],
      dailyCompletions: {},   // weekday name -> true
      lastPlayedDate: null,
    };
  }

  let data = defaults();

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* corrupt/none */ }
    data = defaults();
    if (raw && typeof raw === "object") {
      // Copy over only known fields (defensive against shape drift).
      for (const k in data) if (raw[k] !== undefined && raw[k] !== null) data[k] = raw[k];
    }
    // Migrate the legacy best score if it's higher than what we have.
    try {
      const ob = parseInt(localStorage.getItem(OLD_BEST) || "0", 10);
      if (!isNaN(ob) && ob > data.bestScore) data.bestScore = ob;
    } catch (e) { /* ignore */ }
    // Guarantee the default unlocks are always present.
    for (const id of DEFAULT_UNLOCKED) if (data.unlockedTools.indexOf(id) === -1) data.unlockedTools.push(id);
    data.version = "0.6.0";
    CDL.Save.data = data;
    save();
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage disabled */ }
  }

  // Wipe all progression (used by Reset Progress, after confirmation).
  function reset() {
    data = defaults();
    CDL.Save.data = data;
    try { localStorage.removeItem(OLD_BEST); } catch (e) { /* ignore */ }
    save();
    return data;
  }

  CDL.Save = { data, load, save, reset, DEFAULT_UNLOCKED, KEY };
})(window.CDL);
