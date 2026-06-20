/* ============================================================
   progression.js — unlocks, achievements, lab room, dailies
   ------------------------------------------------------------
   v0.6.0. Pure data + evaluation over CDL.Save.data. Loaded after
   abilities.js + enemies.js (it reads ability/threat metadata).
   applyRun() folds a finished run into the save and returns what
   was newly unlocked/earned for the post-run summary.
   ============================================================ */

(function (CDL) {
  "use strict";

  /* ---------------- Tool unlock rules ----------------
     Tools NOT listed here are unlocked by default (see save.js
     DEFAULT_UNLOCKED). Unlock variety, not permanent power. */
  const TOOL_UNLOCKS = {
    packetstorm: { kind: "wave", n: 3, text: "Reach Wave 3" },
    soar:        { kind: "wave", n: 4, text: "Reach Wave 4" },
    sandbox:     { kind: "wave", n: 4, text: "Reach Wave 4" },
    drone:       { kind: "wave", n: 5, text: "Reach Wave 5" },
    ztring:      { kind: "wave", n: 5, text: "Reach Wave 5" },
    ndrsweep:    { kind: "wave", n: 6, text: "Reach Wave 6" },
    dlp:         { kind: "wave", n: 7, text: "Reach Wave 7" },
    yara:        { kind: "wave", n: 8, text: "Reach Wave 8" },
    tlsarc:      { kind: "wave", n: 9, text: "Reach Wave 9" },
    segwall:     { kind: "wave", n: 10, text: "Reach Wave 10" },
    idsneedle:   { kind: "contain", n: 50, text: "Contain 50 threats" },
    shredder:    { kind: "contain", n: 100, text: "Contain 100 threats" },
    mine:        { kind: "threat", type: "ransomware", n: 25, text: "Contain 25 Ransomware Cubes" },
    memscan:     { kind: "telemetry", n: 1000, text: "Collect 1000 lifetime telemetry" },
    lance:       { kind: "telemetry", n: 2000, text: "Collect 2000 lifetime telemetry" },
  };

  const threatN = (s, t) => (s.threatStats[t] ? s.threatStats[t].contained : 0) || 0;
  const dailyN = (s) => Object.keys(s.dailyCompletions).length;

  function condMet(u, s) {
    switch (u.kind) {
      case "wave": return s.bestWave >= u.n;
      case "contain": return s.lifetimeContained >= u.n;
      case "telemetry": return s.lifetimeTelemetry >= u.n;
      case "threat": return threatN(s, u.type) >= u.n;
    }
    return false;
  }

  function isToolUnlocked(id) {
    return CDL.Save.data.unlockedTools.indexOf(id) !== -1;
  }
  function toolUnlockText(id) {
    return TOOL_UNLOCKS[id] ? TOOL_UNLOCKS[id].text : "Available from the start";
  }

  // Add any tools whose condition is now satisfied. Returns newly-unlocked ids.
  function evalUnlocks() {
    const s = CDL.Save.data, added = [];
    for (const id in TOOL_UNLOCKS) {
      if (s.unlockedTools.indexOf(id) === -1 && condMet(TOOL_UNLOCKS[id], s)) {
        s.unlockedTools.push(id); added.push(id);
      }
    }
    return added;
  }

  /* ---------------- Achievements ---------------- */
  const ACHIEVEMENTS = [
    { id: "first_containment", name: "First Containment", desc: "Contain 10 threats", prog: (s) => [Math.min(s.lifetimeContained, 10), 10] },
    { id: "telemetry_collector", name: "Telemetry Collector", desc: "Collect 500 lifetime telemetry", prog: (s) => [Math.min(s.lifetimeTelemetry, 500), 500] },
    { id: "soc_analyst", name: "SOC Analyst", desc: "Reach Wave 5", prog: (s) => [Math.min(s.bestWave, 5), 5] },
    { id: "incident_commander", name: "Incident Commander", desc: "Reach Wave 10", prog: (s) => [Math.min(s.bestWave, 10), 10] },
    { id: "six_tool", name: "Six Tool Loadout", desc: "Fill all 6 tool slots in a run", prog: (s) => [Math.min(s.maxLoadout, 6), 6] },
    { id: "ransomware_response", name: "Ransomware Response", desc: "Contain 25 Ransomware Cubes", prog: (s) => [Math.min(threatN(s, "ransomware"), 25), 25] },
    { id: "beacon_hunter", name: "Beacon Hunter", desc: "Contain 25 Beacon Signals", prog: (s) => [Math.min(threatN(s, "beacon"), 25), 25] },
    { id: "exfil_watch", name: "Exfiltration Watch", desc: "Contain 25 Exfiltration Drones", prog: (s) => [Math.min(threatN(s, "exfil"), 25), 25] },
    { id: "daily_defender", name: "Daily Defender", desc: "Complete one Daily Simulation", prog: (s) => [Math.min(dailyN(s), 1), 1] },
    { id: "weekly_rotation", name: "Weekly Rotation", desc: "Complete all 7 Daily Simulations", prog: (s) => [Math.min(dailyN(s), 7), 7] },
    { id: "no_backend", name: "No Backend Needed", desc: "Complete a run in static mode", prog: (s) => [Math.min(s.totalRuns, 1), 1] },
    { id: "tool_collector", name: "Tool Collector", desc: "Unlock 10 tools", prog: (s) => [Math.min(s.unlockedTools.length, 10), 10] },
    { id: "full_arsenal", name: "Full Arsenal", desc: "Unlock all tools", prog: (s) => [Math.min(s.unlockedTools.length, CDL.ABILITIES.length), CDL.ABILITIES.length] },
    { id: "threat_researcher", name: "Threat Researcher", desc: "Discover all threat types", prog: (s) => [Math.min(s.discoveredThreats.length, CDL.THREAT_ORDER.length), CDL.THREAT_ORDER.length] },
  ];
  const ACH_MAP = {};
  for (const a of ACHIEVEMENTS) ACH_MAP[a.id] = a;
  const isAchieved = (a, s) => { const p = a.prog(s); return p[0] >= p[1]; };

  function evalAchievements() {
    const s = CDL.Save.data, added = [];
    for (const a of ACHIEVEMENTS) {
      if (s.achievements.indexOf(a.id) === -1 && isAchieved(a, s)) { s.achievements.push(a.id); added.push(a.id); }
    }
    return added;
  }

  /* ---------------- Cyber Defense Lab Room (50 items) ---------------- */
  const cRuns = (n) => (s) => s.totalRuns >= n;
  const cWave = (n) => (s) => s.bestWave >= n;
  const cTele = (n) => (s) => s.lifetimeTelemetry >= n;
  const cCon = (n) => (s) => s.lifetimeContained >= n;
  const cTool = (id) => (s) => s.unlockedTools.indexOf(id) !== -1;
  const cThr = (t) => (s) => s.discoveredThreats.indexOf(t) !== -1;
  const cThrN = (t, n) => (s) => threatN(s, t) >= n;
  const cAllThr = (s) => s.discoveredThreats.length >= CDL.THREAT_ORDER.length;
  const cDaily = (n) => (s) => dailyN(s) >= n;
  const cAch = (id) => (s) => s.achievements.indexOf(id) !== -1;

  const LAB_ITEMS = [
    // --- SOC Desk (10) ---
    { id: "desk_monitor", cat: "SOC Desk", name: "Second Monitor", icon: "🖥️", cond: cRuns(1), text: "Finish 1 run" },
    { id: "desk_threatmap", cat: "SOC Desk", name: "Threat Map Screen", icon: "🗺️", cond: cWave(3), text: "Reach Wave 3" },
    { id: "desk_mug", cat: "SOC Desk", name: "Coffee Mug", icon: "☕", cond: cRuns(2), text: "Finish 2 runs" },
    { id: "desk_keyboard", cat: "SOC Desk", name: "Keyboard Glow", icon: "⌨️", cond: cTele(200), text: "200 lifetime telemetry" },
    { id: "desk_notebook", cat: "SOC Desk", name: "Incident Notebook", icon: "📓", cond: cRuns(3), text: "Finish 3 runs" },
    { id: "desk_rack", cat: "SOC Desk", name: "Mini Server Rack", icon: "🗄️", cond: cTele(500), text: "500 lifetime telemetry" },
    { id: "desk_sticker", cat: "SOC Desk", name: "Blue Team Sticker", icon: "🔷", cond: cRuns(5), text: "Finish 5 runs" },
    { id: "desk_visualizer", cat: "SOC Desk", name: "Packet Visualizer", icon: "📊", cond: cWave(5), text: "Reach Wave 5" },
    { id: "desk_terminal", cat: "SOC Desk", name: "Telemetry Terminal", icon: "💻", cond: cTele(1000), text: "1000 lifetime telemetry" },
    { id: "desk_lamp", cat: "SOC Desk", name: "Desk Lamp", icon: "💡", cond: cRuns(1), text: "Finish 1 run" },
    // --- Wall Board (10) ---
    { id: "board_network", cat: "Wall Board", name: "Network Diagram", icon: "🕸️", cond: cWave(2), text: "Reach Wave 2" },
    { id: "board_patchcal", cat: "Wall Board", name: "Patch Calendar", icon: "📅", cond: cDaily(1), text: "Complete a daily" },
    { id: "board_rules", cat: "Wall Board", name: "Detection Rule Board", icon: "📋", cond: cCon(50), text: "Contain 50 threats" },
    { id: "board_timeline", cat: "Wall Board", name: "Incident Timeline", icon: "📈", cond: cRuns(4), text: "Finish 4 runs" },
    { id: "board_risk", cat: "Wall Board", name: "Risk Matrix", icon: "🎚️", cond: cWave(6), text: "Reach Wave 6" },
    { id: "board_ransom", cat: "Wall Board", name: "Ransomware Response Board", icon: "🔒", cond: cThrN("ransomware", 25), text: "Contain 25 Ransomware" },
    { id: "board_phish", cat: "Wall Board", name: "Phishing Campaign Board", icon: "🎣", cond: cThrN("phishing", 25), text: "Contain 25 Phishing" },
    { id: "board_pins", cat: "Wall Board", name: "Threat Actor Pins", icon: "📌", cond: cAllThr, text: "Discover all threats" },
    { id: "board_dailycal", cat: "Wall Board", name: "Daily Simulation Calendar", icon: "🗓️", cond: cDaily(3), text: "Complete 3 dailies" },
    { id: "board_mitre", cat: "Wall Board", name: "Tactic Board", icon: "🧩", cond: cDaily(7), text: "Complete all 7 dailies" },
    // --- Tool Cabinet (10) ---
    { id: "cab_firewall", cat: "Tool Cabinet", name: "Firewall Module", icon: "🔥", cond: cTool("firewall"), text: "Unlock Firewall Pulse" },
    { id: "cab_edr", cat: "Tool Cabinet", name: "EDR Module", icon: "✳️", cond: cTool("edr"), text: "Unlock EDR Burst" },
    { id: "cab_siem", cat: "Tool Cabinet", name: "SIEM Module", icon: "📡", cond: cTool("siem"), text: "Unlock SIEM Scanner" },
    { id: "cab_dlp", cat: "Tool Cabinet", name: "DLP Module", icon: "🕸️", cond: cTool("dlp"), text: "Unlock DLP Net" },
    { id: "cab_ndr", cat: "Tool Cabinet", name: "NDR Module", icon: "〰️", cond: cTool("ndrsweep"), text: "Unlock NDR Sweep" },
    { id: "cab_backup", cat: "Tool Cabinet", name: "Backup Module", icon: "💾", cond: cWave(4), text: "Reach Wave 4" },
    { id: "cab_honeypot", cat: "Tool Cabinet", name: "Honeypot Module", icon: "🍯", cond: cWave(5), text: "Reach Wave 5" },
    { id: "cab_sandbox", cat: "Tool Cabinet", name: "Sandbox Module", icon: "🧪", cond: cTool("sandbox"), text: "Unlock Sandbox Trap" },
    { id: "cab_yara", cat: "Tool Cabinet", name: "YARA Module", icon: "🔬", cond: cTool("yara"), text: "Unlock YARA Strike" },
    { id: "cab_soar", cat: "Tool Cabinet", name: "SOAR Module", icon: "🛰️", cond: cTool("soar"), text: "Unlock SOAR Volley" },
    // --- Threat Intel (10) ---
    { id: "intel_malware", cat: "Threat Intel", name: "Malware Sample Card", icon: "🟠", cond: cThr("malware"), text: "Discover Malware Blob" },
    { id: "intel_ransom", cat: "Threat Intel", name: "Ransomware Case File", icon: "🟥", cond: cThr("ransomware"), text: "Discover Ransomware Cube" },
    { id: "intel_beacon", cat: "Threat Intel", name: "Beacon Signal Report", icon: "🟡", cond: cThr("beacon"), text: "Discover Beacon Signal" },
    { id: "intel_exfil", cat: "Threat Intel", name: "Exfiltration Report", icon: "➤", cond: cThr("exfil"), text: "Discover Exfiltration Drone" },
    { id: "intel_cred", cat: "Threat Intel", name: "Credential Abuse Report", icon: "⬟", cond: cThr("credential"), text: "Discover Credential Thief" },
    { id: "intel_brute", cat: "Threat Intel", name: "Brute Force Report", icon: "🔻", cond: cThr("bruteforce"), text: "Discover Brute Force Swarm" },
    { id: "intel_phish", cat: "Threat Intel", name: "Phishing Report", icon: "🔺", cond: cThr("phishing"), text: "Discover Phishing Hook" },
    { id: "intel_lateral", cat: "Threat Intel", name: "Lateral Movement Report", icon: "🧭", cond: cAllThr, text: "Discover all threats" },
    { id: "intel_patch", cat: "Threat Intel", name: "Patch Tuesday Report", icon: "🩹", cond: cDaily(2), text: "Complete 2 dailies" },
    { id: "intel_daily", cat: "Threat Intel", name: "Daily Challenge Report", icon: "📰", cond: cDaily(1), text: "Complete a daily" },
    // --- Trophies (10) ---
    { id: "tro_first", cat: "Trophies", name: "First Run Trophy", icon: "🥉", cond: cRuns(1), text: "Finish 1 run" },
    { id: "tro_wave5", cat: "Trophies", name: "Wave 5 Trophy", icon: "🏅", cond: cWave(5), text: "Reach Wave 5" },
    { id: "tro_wave10", cat: "Trophies", name: "Wave 10 Trophy", icon: "🥈", cond: cWave(10), text: "Reach Wave 10" },
    { id: "tro_100", cat: "Trophies", name: "100 Threats Trophy", icon: "🛡️", cond: cCon(100), text: "Contain 100 threats" },
    { id: "tro_1000tele", cat: "Trophies", name: "1000 Telemetry Trophy", icon: "📦", cond: cTele(1000), text: "1000 lifetime telemetry" },
    { id: "tro_daily1", cat: "Trophies", name: "First Daily Trophy", icon: "🗓️", cond: cDaily(1), text: "Complete a daily" },
    { id: "tro_daily7", cat: "Trophies", name: "7 Daily Trophy", icon: "🏆", cond: cDaily(7), text: "Complete all 7 dailies" },
    { id: "tro_sixtool", cat: "Trophies", name: "Six Tool Trophy", icon: "🧰", cond: (s) => s.maxLoadout >= 6, text: "Fill all 6 tool slots" },
    { id: "tro_ic", cat: "Trophies", name: "Incident Commander Trophy", icon: "🎖️", cond: cAch("incident_commander"), text: "Earn Incident Commander" },
    { id: "tro_alltools", cat: "Trophies", name: "All Tools Trophy", icon: "🥇", cond: (s) => s.unlockedTools.length >= CDL.ABILITIES.length, text: "Unlock all tools" },
  ];
  const LAB_MAP = {};
  for (const it of LAB_ITEMS) LAB_MAP[it.id] = it;
  const LAB_CATEGORIES = ["SOC Desk", "Wall Board", "Tool Cabinet", "Threat Intel", "Trophies"];

  function evalLab() {
    const s = CDL.Save.data, added = [];
    for (const it of LAB_ITEMS) {
      if (s.labRoomUnlocks.indexOf(it.id) === -1 && it.cond(s)) { s.labRoomUnlocks.push(it.id); added.push(it.id); }
    }
    return added;
  }

  /* ---------------- Daily Simulations (local day-of-week) ---------------- */
  const DAILIES = [
    { day: "Sunday", name: "Threat Hunt", theme: "Quiet-day hunting / low-noise investigation.",
      summary: ["Fewer threats overall", "Stronger Beacon Signals", "SIEM Scanner & Threat Hunter Drone +30%", "Score bonus for Beacon containment"],
      mods: { spawnMult: 0.7, weights: { beacon: 1.8 }, enemyHpFor: { beacon: 1.4 }, score: { beacon: 1.6 }, toolBuffs: { siem: 1.3, drone: 1.3 } } },
    { day: "Monday", name: "Inbox Triage", theme: "Monday email backlog & phishing risk.",
      summary: ["More Phishing Hooks", "Phishing telemetry +30%", "MFA Shield +20%"],
      mods: { weights: { phishing: 2.5, credential: 1.3 }, telemetry: { phishing: 1.3 }, toolBuffs: { mfa: 1.2 } } },
    { day: "Tuesday", name: "Patch Tuesday", theme: "Patch & vulnerability management.",
      summary: ["More Malware Blobs", "Enemies +12% health", "Telemetry +15%", "Patch Wave +30%"],
      mods: { weights: { malware: 2.2 }, enemyHp: 1.12, telemetryAll: 1.15, toolBuffs: { patchwave: 1.3 } } },
    { day: "Wednesday", name: "Web Exposure Review", theme: "Midweek web / app exposure checks.",
      summary: ["More Exfiltration & Malware", "Firewall Pulse & DLP Net +20%"],
      mods: { weights: { exfil: 1.6, malware: 1.4 }, toolBuffs: { firewall: 1.2, dlp: 1.2 } } },
    { day: "Thursday", name: "Identity Review", theme: "IAM, access review, brute-force monitoring.",
      summary: ["More Credential Thieves & Brute Force", "MFA Shield & Zero Trust Ring +30%"],
      mods: { weights: { credential: 2.0, bruteforce: 1.8 }, toolBuffs: { mfa: 1.3, ztring: 1.3 } } },
    { day: "Friday", name: "Exfiltration Watch", theme: "End-of-week data movement risk.",
      summary: ["More Exfiltration Drones", "DLP Net & Segmentation Wall stronger", "Score bonus for Exfil containment"],
      mods: { weights: { exfil: 2.2 }, toolBuffs: { dlp: 1.3, segwall: 1.2 }, score: { exfil: 1.5 } } },
    { day: "Saturday", name: "Backup Drill", theme: "Maintenance, backup & recovery testing.",
      summary: ["More Ransomware Cubes", "Ransomware telemetry +50%", "Backup Restore stronger"],
      mods: { weights: { ransomware: 2.0 }, telemetry: { ransomware: 1.5 }, backupBoost: 1.5 } },
  ];
  const todayDaily = () => DAILIES[new Date().getDay()];

  /* ---------------- Fold a finished run into the save ---------------- */
  function applyRun(r) {
    const s = CDL.Save.data;
    s.totalRuns++;
    s.lifetimeTelemetry += r.telemetry;
    s.bestScore = Math.max(s.bestScore, r.score);
    s.bestWave = Math.max(s.bestWave, r.wave);
    s.bestLevel = Math.max(s.bestLevel, r.level);
    s.maxLoadout = Math.max(s.maxLoadout, r.loadout);
    s.lifetimeContained += r.threats;

    const ensure = (t, fw) => s.threatStats[t] || (s.threatStats[t] = { contained: 0, damage: 0, firstWave: fw });
    for (const t in r.killsByType) ensure(t, r.firstWaveByType[t] || r.wave).contained += r.killsByType[t];
    for (const t in r.dmgByThreat) {
      const st = ensure(t, r.firstWaveByType[t] || r.wave);
      st.damage += Math.round(r.dmgByThreat[t]);
      if (st.firstWave == null) st.firstWave = r.firstWaveByType[t] || r.wave;
    }
    for (const t in r.encounteredThreats) if (s.discoveredThreats.indexOf(t) === -1) s.discoveredThreats.push(t);
    for (const id in r.killsByTool) (s.toolStats[id] || (s.toolStats[id] = { contained: 0 })).contained += r.killsByTool[id];
    for (const id of r.ownedTools) if (s.discoveredTools.indexOf(id) === -1) s.discoveredTools.push(id);

    if (r.mode === "daily" && r.daily && r.wave >= 3) s.dailyCompletions[r.daily] = true;

    s.incidentArchive.unshift({
      date: r.date, mode: r.modeLabel, score: r.score, wave: r.wave, level: r.level,
      threats: r.threats, telemetry: r.telemetry, tool: r.tool, threat: r.threat, reco: r.reco,
    });
    if (s.incidentArchive.length > 10) s.incidentArchive.length = 10;
    s.lastPlayedDate = r.date;

    const newTools = evalUnlocks();
    const newAch = evalAchievements();
    const newLab = evalLab();
    CDL.Save.save();
    return { newTools, newAch, newLab };
  }

  CDL.Progression = {
    TOOL_UNLOCKS, ACHIEVEMENTS, ACH_MAP, LAB_ITEMS, LAB_MAP, LAB_CATEGORIES, DAILIES,
    isToolUnlocked, toolUnlockText, isAchieved, todayDaily, applyRun,
    evalUnlocks, evalAchievements, evalLab,
  };
})(window.CDL);
