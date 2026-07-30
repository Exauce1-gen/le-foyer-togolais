/* ==========================================================================
   NAV.JS
   Gère deux comportements du header :
   1. Ajout de la classe "is-scrolled" quand l'utilisateur descend la page
      (fond opaque, logo qui change de couleur).
   2. Ouverture / fermeture du menu mobile (burger).
   ========================================================================== */

(function () {
  'use strict';

  const header = document.querySelector('.header');
  const navToggle = document.querySelector('.nav__toggle');
  const nav = document.querySelector('.nav');
  const navLinks = document.querySelectorAll('.nav__link');

  if (!header) return;

  // ---------- 1. Header opaque au scroll ----------
  const SCROLL_THRESHOLD = 60; // pixels avant de considérer que la page a scrollé

  function updateHeaderState() {
    if (window.scrollY > SCROLL_THRESHOLD) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }

  // On écoute le scroll avec requestAnimationFrame pour éviter les saccades
  let ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        updateHeaderState();
        ticking = false;
      });
      ticking = true;
    }
  });

  updateHeaderState(); // état initial au chargement

  // ---------- 2. Menu mobile ----------
  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      const isOpen = nav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', isOpen);
      navToggle.setAttribute('aria-expanded', String(isOpen));
      // Empêche le scroll du body quand le menu mobile est ouvert
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Ferme le menu automatiquement quand on clique sur un lien
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ---------- 3. Mise en surbrillance du lien actif selon la section visible ----------
  const sections = document.querySelectorAll('section[id]');

  if (sections.length && navLinks.length) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach(function (link) {
              link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
            });
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' } // se déclenche quand la section traverse le milieu de l'écran
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }
})();
