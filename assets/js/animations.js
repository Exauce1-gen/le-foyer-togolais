/* ==========================================================================
   ANIMATIONS.JS
   Ajoute la classe "is-visible" aux éléments portant un attribut
   [data-animate] lorsqu'ils entrent dans le viewport. Léger et performant :
   utilise Intersection Observer plutôt qu'un écouteur de scroll.
   ========================================================================== */

(function () {
  'use strict';

  const animatedElements = document.querySelectorAll('[data-animate]');

  if (!animatedElements.length) return;

  // Si l'utilisateur préfère un mouvement réduit, on affiche tout directement
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    animatedElements.forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target); // animation jouée une seule fois
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -60px 0px'
    }
  );

  animatedElements.forEach(function (el) {
    observer.observe(el);
  });
})();
