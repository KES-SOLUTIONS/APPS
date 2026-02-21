/**
 * sync-tech.js (SAFE)
 * Objectif: empêcher les erreurs de déploiement si le fichier est référencé,
 * sans modifier ton design ni ta logique.
 * Tu pourras brancher plus tard une vraie synchro (API/Firebase/WebSocket).
 */
(function () {
  "use strict";

  // Vérifie que le script est bien chargé en prod
  console.log("[sync-tech] loaded ✅");

  // Optionnel: expose un petit namespace sans casser ton app
  window.KES_SYNC = window.KES_SYNC || {
    enabled: false,
    start() {
      this.enabled = true;
      console.log("[sync-tech] start()");
    },
    stop() {
      this.enabled = false;
      console.log("[sync-tech] stop()");
    },
  };

  // Ne touche à rien d’autre.
})();