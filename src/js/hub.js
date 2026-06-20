/* ============================================================
   hub.js — SOC Hub & meta screens (Library / Intel / Achievements
   / Lab Room / Incident Archive / Daily intro)
   ------------------------------------------------------------
   Read-only views over CDL.Save.data + the registries. The only
   module besides ui.js that builds DOM; it renders into static
   containers in index.html and uses CDL.UI.showScreen to switch.
   ============================================================ */

(function (CDL) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let current = null;

  // Tool role derived from its archetype (for the Library cards).
  const ROLE = {
    pulse: "Area control", radial: "Swarm clear", projectile: "Single target",
    ring: "Area control", orbit: "Close guard", beam: "Focus fire",
    field: "Slow & trap", companion: "Auto-hunt", mine: "Area denial", wall: "Choke control",
  };

  // Recommended defensive tools per threat (Threat Intel database).
  const RECO_TOOLS = {
    malware: ["EDR Burst", "Patch Wave", "Packet Storm"],
    phishing: ["MFA Shield", "SIEM Scanner"],
    bruteforce: ["Zero Trust Ring", "MFA Shield"],
    ransomware: ["EDR Burst", "Backup Restore", "Patch Wave"],
    credential: ["MFA Shield", "Zero Trust Ring"],
    beacon: ["SIEM Scanner", "Threat Hunter Drone", "Memory Scanner"],
    exfil: ["DLP Net", "Network Segmentation Wall", "Quarantine Beam"],
  };

  const headline = (b) => {
    const dmg = b.dps != null ? "Damage/s: " + b.dps : "Damage: " + b.damage;
    let cd = "";
    if (b.interval != null) cd = " · Cooldown: " + b.interval.toFixed(2) + "s";
    else if (b.fireInterval != null) cd = " · Fire rate: " + b.fireInterval.toFixed(2) + "s";
    else cd = " · Continuous";
    return dmg + cd;
  };

  /* ---------------- SOC Hub dashboard ---------------- */
  function renderHub() {
    const s = CDL.Save.data;
    const tile = (k, v) => '<div class="hub-tile"><span class="hub-tile-v">' + v + '</span><span class="hub-tile-k">' + k + "</span></div>";
    $("hub-stats").innerHTML =
      tile("Total Runs", s.totalRuns) +
      tile("Best Score", s.bestScore) +
      tile("Best Wave", s.bestWave) +
      tile("Best Level", s.bestLevel) +
      tile("Lifetime Telemetry", s.lifetimeTelemetry) +
      tile("Threats Contained", s.lifetimeContained) +
      tile("Tools Unlocked", s.unlockedTools.length + " / " + CDL.ABILITIES.length) +
      tile("Threats Discovered", s.discoveredThreats.length + " / " + CDL.THREAT_ORDER.length) +
      tile("Achievements", s.achievements.length + " / " + CDL.Progression.ACHIEVEMENTS.length) +
      tile("Lab Items", s.labRoomUnlocks.length + " / " + CDL.Progression.LAB_ITEMS.length);

    const last = s.incidentArchive[0];
    $("hub-last").innerHTML = last
      ? '<div class="hub-last-title">LAST INCIDENT — ' + last.date + " · " + last.mode + "</div>" +
        '<div class="hub-last-row">Score <b>' + last.score + "</b> · Wave <b>" + last.wave +
        "</b> · Threats contained <b>" + last.threats + "</b></div>" +
        '<div class="hub-last-row muted">Most effective: ' + last.tool + " · Highest-risk: " + last.threat + "</div>"
      : '<div class="hub-last-row muted">No incidents yet — start a run to build your history.</div>';
  }

  /* ---------------- Tool Library ---------------- */
  function renderLibrary() {
    const s = CDL.Save.data, host = $("library-cards");
    host.innerHTML = "";
    for (const id of CDL.TOOL_ORDER) {
      const def = CDL.ABILITY_MAP[id];
      const unlocked = s.unlockedTools.indexOf(id) !== -1;
      const used = s.discoveredTools.indexOf(id) !== -1;
      const contained = s.toolStats[id] ? s.toolStats[id].contained : 0;
      const el = document.createElement("div");
      el.className = "lib-card" + (unlocked ? "" : " locked");
      if (unlocked) {
        el.innerHTML =
          '<div class="lib-head"><span class="lib-ic">' + def.icon + "</span>" +
            '<span class="lib-name">' + def.name + "</span>" +
            '<span class="lib-status ' + (used ? "st-used" : "st-unlocked") + '">' + (used ? "USED" : "UNLOCKED") + "</span></div>" +
          '<div class="lib-meta"><span class="chip">' + def.range + '</span><span class="chip">' + (ROLE[def.archetype] || "Defense") + "</span></div>" +
          '<div class="lib-stat">' + headline(def.base) + "</div>" +
          '<div class="lib-desc">' + def.desc + "</div>" +
          '<div class="lib-foot">Unlock: ' + CDL.Progression.toolUnlockText(id) +
            (contained ? ' · Contained: <b>' + contained + "</b>" : "") + "</div>";
      } else {
        el.innerHTML =
          '<div class="lib-head"><span class="lib-ic locked-ic">🔒</span>' +
            '<span class="lib-name">' + def.name + "</span>" +
            '<span class="lib-status st-locked">LOCKED</span></div>' +
          '<div class="lib-meta"><span class="chip">' + def.range + "</span></div>" +
          '<div class="lib-foot">🔒 ' + CDL.Progression.toolUnlockText(id) + "</div>";
      }
      host.appendChild(el);
    }
  }

  /* ---------------- Threat Intel database ---------------- */
  function renderThreatDb() {
    const s = CDL.Save.data, host = $("threatdb-cards");
    const DANGER_CLS = { Low: "danger-low", Medium: "danger-med", High: "danger-high", Critical: "danger-crit" };
    host.innerHTML = "";
    for (const type of CDL.THREAT_ORDER) {
      const d = CDL.ENEMY_TYPES[type];
      const found = s.discoveredThreats.indexOf(type) !== -1;
      const ts = s.threatStats[type] || {};
      const el = document.createElement("div");
      el.className = "intel-item" + (found ? "" : " locked");
      if (found) {
        el.innerHTML =
          '<div class="intel-head"><span class="intel-name">' + d.label + "</span>" +
            '<span class="intel-danger ' + (DANGER_CLS[d.danger] || "danger-med") + '">' + d.danger + "</span></div>" +
          '<div class="intel-statline">First seen: Wave ' + (ts.firstWave || "—") +
            " · Contained: <b>" + (ts.contained || 0) + "</b> · Damage caused: <b>" + (ts.damage || 0) + "</b></div>" +
          '<div class="intel-behavior">' + d.behavior + "</div>" +
          '<div class="intel-tip">' + d.tip + "</div>" +
          '<div class="intel-reco">Recommended: ' + (RECO_TOOLS[type] || []).join(", ") + "</div>";
      } else {
        el.innerHTML =
          '<div class="intel-head"><span class="intel-name">Unknown Threat</span>' +
            '<span class="intel-danger danger-med">???</span></div>' +
          '<div class="intel-tip">Encounter this threat in a run to reveal its intel.</div>';
      }
      host.appendChild(el);
    }
  }

  /* ---------------- Achievements ---------------- */
  function renderAch() {
    const s = CDL.Save.data, host = $("ach-cards");
    host.innerHTML = "";
    for (const a of CDL.Progression.ACHIEVEMENTS) {
      const earned = s.achievements.indexOf(a.id) !== -1;
      const p = a.prog(s);
      const pct = Math.min(100, Math.round((p[0] / p[1]) * 100));
      const el = document.createElement("div");
      el.className = "ach-card" + (earned ? " earned" : "");
      el.innerHTML =
        '<div class="ach-top"><span class="ach-name">' + a.name + "</span>" +
          '<span class="ach-badge">' + (earned ? "✓ EARNED" : "LOCKED") + "</span></div>" +
        '<div class="ach-desc">' + a.desc + "</div>" +
        '<div class="ach-bar"><div class="ach-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="ach-prog">' + p[0] + " / " + p[1] + "</div>";
      host.appendChild(el);
    }
  }

  /* ---------------- Cyber Defense Lab Room ---------------- */
  function renderLab() {
    const s = CDL.Save.data, host = $("lab-content");
    host.innerHTML = "";
    for (const cat of CDL.Progression.LAB_CATEGORIES) {
      const items = CDL.Progression.LAB_ITEMS.filter((i) => i.cat === cat);
      const have = items.filter((i) => s.labRoomUnlocks.indexOf(i.id) !== -1).length;
      const sec = document.createElement("div");
      sec.className = "lab-section";
      let html = '<div class="lab-cat-head">' + cat + ' <span class="lab-cat-count">' + have + " / " + items.length + "</span></div>" +
        '<div class="lab-grid">';
      for (const it of items) {
        const unlocked = s.labRoomUnlocks.indexOf(it.id) !== -1;
        html += '<div class="lab-item' + (unlocked ? "" : " locked") + '" title="' + (unlocked ? it.name : it.text) + '">' +
          '<div class="lab-ic">' + (unlocked ? it.icon : "🔒") + "</div>" +
          '<div class="lab-iname">' + it.name + "</div>" +
          '<div class="lab-cond">' + (unlocked ? "Unlocked" : it.text) + "</div></div>";
      }
      html += "</div>";
      sec.innerHTML = html;
      host.appendChild(sec);
    }
  }

  /* ---------------- Incident Archive ---------------- */
  function renderArchive() {
    const s = CDL.Save.data, host = $("archive-list");
    host.innerHTML = "";
    if (!s.incidentArchive.length) {
      host.innerHTML = '<div class="muted" style="text-align:center;padding:24px">No incidents recorded yet.</div>';
      return;
    }
    for (const r of s.incidentArchive) {
      const el = document.createElement("div");
      el.className = "arch-row";
      el.innerHTML =
        '<div class="arch-main"><span class="arch-date">' + r.date + "</span>" +
          '<span class="arch-mode">' + r.mode + "</span></div>" +
        '<div class="arch-stats">Score <b>' + r.score + "</b> · Wave <b>" + r.wave +
          "</b> · Lvl <b>" + r.level + "</b> · Contained <b>" + r.threats + "</b> · Telemetry <b>" + r.telemetry + "</b></div>" +
        '<div class="arch-foot muted">Top tool: ' + r.tool + " · Worst threat: " + r.threat + "</div>";
      host.appendChild(el);
    }
  }

  /* ---------------- Daily Simulation briefing ---------------- */
  function renderDaily(daily) {
    const s = CDL.Save.data;
    const done = !!s.dailyCompletions[daily.day];
    let html =
      '<div class="daily-day">' + daily.day + "</div>" +
      '<div class="daily-name">' + daily.name + (done ? ' <span class="daily-done">✓ COMPLETED</span>' : "") + "</div>" +
      '<div class="daily-theme">' + daily.theme + "</div>" +
      '<div class="daily-mods-title">SIMULATION MODIFIERS</div><ul class="daily-mods">';
    for (const line of daily.summary) html += "<li>" + line + "</li>";
    html += "</ul>" +
      '<div class="daily-note muted">Complete = reach Wave 3. Progress is saved locally.</div>';
    $("daily-content").innerHTML = html;
  }

  CDL.Hub = {
    show(name) {
      switch (name) {
        case "hub": renderHub(); break;
        case "library": renderLibrary(); break;
        case "threatdb": renderThreatDb(); break;
        case "achievements": renderAch(); break;
        case "lab": renderLab(); break;
        case "archive": renderArchive(); break;
        default: return;
      }
      current = name;
      CDL.UI.showScreen(name);
    },
    showDailyIntro(daily) {
      CDL.Hub._daily = daily;
      renderDaily(daily);
      current = "daily";
      CDL.UI.showScreen("daily");
    },
    refresh() { if (current && current !== "daily") CDL.Hub.show(current); },
  };
})(window.CDL);
