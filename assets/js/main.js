/* ==========================================================================
   MAIN.JS
   Point d'entrée. Les modules spécifiques (nav.js, animations.js, filters.js,
   faq.js, form-validation.js) s'auto-initialisent chacun de leur côté ;
   ce fichier ne gère que les petits détails globaux communs à tout le site.
   ========================================================================== */

(function () {
  'use strict';

  // Met à jour automatiquement l'année du copyright dans le footer
  const yearEl = document.querySelector('[data-current-year]');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();
