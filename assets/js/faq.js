/* ==========================================================================
   FAQ.JS
   La FAQ fonctionne nativement grâce aux balises <details>/<summary>
   (accessible, sans JS requis). Ce script ajoute uniquement un confort :
   fermer les autres questions quand on en ouvre une nouvelle.
   ========================================================================== */

(function () {
  'use strict';

  const faqItems = document.querySelectorAll('.faq-item');

  if (!faqItems.length) return;

  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) {
            other.open = false;
          }
        });
      }
    });
  });
})();
