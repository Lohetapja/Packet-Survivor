/* ============================================================
   storage.js — best-score persistence (localStorage only)
   ------------------------------------------------------------
   No accounts, no backend, no tracking. The only thing that ever
   leaves memory is a single integer in the browser's localStorage.
   ============================================================ */

(function (CDL) {
  "use strict";

  const KEY = CDL.CONFIG.storageKey;

  CDL.Storage = {
    loadBest() {
      try {
        const v = parseInt(localStorage.getItem(KEY) || "0", 10);
        return isNaN(v) ? 0 : v;
      } catch (e) {
        return 0; // localStorage blocked (e.g. private mode) — fail soft
      }
    },
    saveBest(v) {
      try { localStorage.setItem(KEY, String(v)); } catch (e) { /* ignore */ }
    },
  };
})(window.CDL);
