/* ==========================================================================
   GALLERY.JS
   Construit la galerie complète à partir de data/properties.json : chaque
   photo de chaque annonce devient une vignette. Filtres par type de bien
   et par opération (vente/location). Lightbox plein écran avec navigation
   précédent/suivant sur l'ensemble des photos filtrées.

   NOTE : nécessite que le site soit servi en http(s) (voir filters.js) car
   les données sont chargées via fetch().
   ========================================================================== */

(function () {
  'use strict';

  const grid = document.getElementById('galleryGrid');
  const emptyState = document.getElementById('galleryEmpty');
  const filterButtons = document.querySelectorAll('.gallery-filter');

  if (!grid) return;

  const IMG_BASE = 'assets/images/properties/';
  const ZOOM_ICON = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>';

  let allPhotos = [];      // toutes les photos, à plat, avec leurs métadonnées d'annonce
  let filteredPhotos = [];
  let currentFilter = 'all';

  fetch('data/properties.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Impossible de charger la galerie');
      return res.json();
    })
    .then(function (data) {
      // Transforme chaque annonce en N photos individuelles pour la galerie
      data.forEach(function (property) {
        property.images.forEach(function (img, i) {
          allPhotos.push({
            src: IMG_BASE + img,
            title: property.title,
            location: property.location,
            type: property.type,
            operation: property.operation,
            photoIndex: i + 1,
            photoTotal: property.images.length
          });
        });
      });
      renderGrid('all');
    })
    .catch(function (err) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);">La galerie n\'a pas pu être chargée. Réessayez plus tard.</p>';
      console.error(err);
    });

  function renderGrid(filter) {
    filteredPhotos = filter === 'all'
      ? allPhotos.slice()
      : allPhotos.filter(function (p) { return p.type === filter || p.operation === filter; });

    grid.innerHTML = '';

    if (!filteredPhotos.length) {
      emptyState.classList.add('is-visible');
      return;
    }
    emptyState.classList.remove('is-visible');

    filteredPhotos.forEach(function (photo, index) {
      const sizeClass = index % 9 === 0 ? ' gallery-item--wide' : (index % 7 === 0 ? ' gallery-item--tall' : '');
      const el = document.createElement('div');
      el.className = 'gallery-item' + sizeClass;
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Voir ' + photo.title);

      el.innerHTML =
        '<img src="' + photo.src + '" alt="' + photo.title + ' - photo ' + photo.photoIndex + '" loading="lazy" width="400" height="300">' +
        '<div class="gallery-item__overlay"><span class="gallery-item__icon">' + ZOOM_ICON + '</span></div>' +
        '<p class="gallery-item__caption">' + photo.title + ' — ' + photo.location + '</p>';

      el.addEventListener('click', function () { openLightbox(index); });
      el.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' || e.key === ' ') openLightbox(index);
      });

      grid.appendChild(el);
    });
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      currentFilter = btn.getAttribute('data-filter');
      renderGrid(currentFilter);
    });
  });

  // ---------- Lightbox ----------
  const lightbox = document.getElementById('lightbox');
  const lightboxMediaWrap = document.getElementById('lightboxMediaWrap');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const btnClose = document.getElementById('lightboxClose');
  const btnPrev = document.getElementById('lightboxPrev');
  const btnNext = document.getElementById('lightboxNext');

  let currentIndex = 0;

  function openLightbox(index) {
    currentIndex = index;
    renderLightboxMedia();
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightboxMediaWrap.innerHTML = '';
    document.body.style.overflow = '';
  }

  function renderLightboxMedia() {
    const photo = filteredPhotos[currentIndex];
    if (!photo) return;
    lightboxMediaWrap.innerHTML = '<img src="' + photo.src + '" alt="' + photo.title + '">';
    lightboxCaption.textContent = photo.title + ' — ' + photo.location + ' (' + photo.photoIndex + '/' + photo.photoTotal + ')';
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % filteredPhotos.length;
    renderLightboxMedia();
  }

  function showPrev() {
    currentIndex = (currentIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
    renderLightboxMedia();
  }

  if (btnClose) btnClose.addEventListener('click', closeLightbox);
  if (btnNext) btnNext.addEventListener('click', showNext);
  if (btnPrev) btnPrev.addEventListener('click', showPrev);

  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });
})();
