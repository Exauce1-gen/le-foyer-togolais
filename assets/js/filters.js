/* ==========================================================================
   FILTERS.JS
   Charge les annonces réelles depuis data/properties.json et génère :
   - des cartes avec un carrousel photo (compteur "1/8", flèches, swipe)
   - une lightbox plein écran avec zoom au clic
   - des filtres (Tous/Vente/Location/Meublé/Villa/Appartement/Terrain/Boutique)
   - une recherche par mot-clé (titre, lieu, description)
   - un tri (prix croissant, prix décroissant, plus récents)

   NOTE : nécessite que le site soit servi en http(s) (voir gallery.js) car
   les données sont chargées via fetch().
   ========================================================================== */

(function () {
  'use strict';

  const locationGrid = document.getElementById('locationGrid');
  const venteGrid = document.getElementById('venteGrid');
  if (!locationGrid && !venteGrid) return;

  const locationEmpty = document.getElementById('locationEmpty');
  const venteEmpty = document.getElementById('venteEmpty');
  const locationCount = document.getElementById('locationCount');
  const venteCount = document.getElementById('venteCount');
  const filterButtons = document.querySelectorAll('.properties__filters .gallery-filter');
  const searchInput = document.getElementById('propertiesSearch');
  const sortSelect = document.getElementById('propertiesSort');

  const IMG_BASE = 'assets/images/properties/';
  const LOCATION_ICON = '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.5 7-11.5a7 7 0 10-14 0C5 14.5 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/></svg>';
  const CHEVRON_LEFT = '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CHEVRON_RIGHT = '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ZOOM_ICON = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" stroke-linecap="round"/></svg>';

  let properties = [];
  let currentFilter = 'all';
  let currentSearch = '';
  let currentSort = 'recent';
  // Etat courant du slide affiché pour chaque carte, indexé par id d'annonce
  const slideIndex = {};

  fetch('data/properties.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Impossible de charger les annonces');
      return res.json();
    })
    .then(function (data) {
      properties = data;
      properties.forEach(function (p) { slideIndex[p.id] = 0; });
      render();
    })
    .catch(function (err) {
      const msg = '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);">Les annonces n\'ont pas pu être chargées. Réessayez plus tard.</p>';
      if (locationGrid) locationGrid.innerHTML = msg;
      if (venteGrid) venteGrid.innerHTML = msg;
      console.error(err);
    });

  // ---------- Filtrage (type/meublé) + recherche combinés, sans le operation (gere separement) ----------
  function getFiltered(operation) {
    let list = properties.filter(function (p) {
      if (p.operation !== operation) return false;
      if (currentFilter === 'all') return true;
      if (currentFilter === 'meuble') return p.furnished === true;
      return p.type === currentFilter;
    });

    if (currentSearch.trim()) {
      const q = currentSearch.trim().toLowerCase();
      list = list.filter(function (p) {
        return (
          p.title.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.ref || '').toLowerCase().includes(q)
        );
      });
    }

    if (currentSort === 'price-asc') {
      list = list.slice().sort(function (a, b) { return a.sortPrice - b.sortPrice; });
    } else if (currentSort === 'price-desc') {
      list = list.slice().sort(function (a, b) { return b.sortPrice - a.sortPrice; });
    } else {
      list = list.slice().sort(function (a, b) { return new Date(b.dateAdded) - new Date(a.dateAdded); });
    }

    return list;
  }

  // ---------- Rendu d'une grille (location ou vente) ----------
  function renderGroup(operation, gridEl, emptyEl, countEl) {
    if (!gridEl) return;
    const list = getFiltered(operation);
    gridEl.innerHTML = '';

    if (countEl) {
      countEl.textContent = list.length + (list.length > 1 ? ' biens trouvés' : ' bien trouvé');
    }

    if (!list.length) {
      if (emptyEl) emptyEl.classList.add('is-visible');
      return;
    }
    if (emptyEl) emptyEl.classList.remove('is-visible');

    list.forEach(function (property) {
      gridEl.appendChild(buildCard(property));
    });
  }

  // ---------- Rendu des deux sections ----------
  function render() {
    renderGroup('location', locationGrid, locationEmpty, locationCount);
    renderGroup('vente', venteGrid, venteEmpty, venteCount);
  }

  function typeLabel(type) {
    const labels = { villa: 'Villa', appartement: 'Appartement', terrain: 'Terrain', boutique: 'Boutique', bureau: 'Bureau' };
    return labels[type] || type;
  }

  function buildCard(property) {
    const card = document.createElement('article');
    card.className = 'property-card';
    card.setAttribute('data-id', property.id);

    const idx = slideIndex[property.id] || 0;
    const total = property.images.length;

    const slidesHtml = property.images.map(function (img, i) {
      // Seule la première image charge en priorité ; les suivantes sont en lazy loading
      const loadingAttr = i === 0 ? '' : ' loading="lazy"';
      return '<div class="property-card__slide"><img src="' + IMG_BASE + img + '" alt="' + property.title + ' - photo ' + (i + 1) + '"' + loadingAttr + ' width="400" height="300"></div>';
    }).join('');

    const whatsappMessage = encodeURIComponent(
      'Bonjour, je suis intéressé(e) par l\'annonce : ' + property.title + ' (' + property.location + (property.ref ? ', réf. ' + property.ref : '') + ').'
    );

    const furnishedBadge = property.furnished ? '<span class="property-card__badge property-card__badge--meuble">Meublé</span>' : '';

    card.innerHTML =
      '<div class="property-card__image-wrap">' +
        '<div class="property-card__slider" data-role="slider">' +
          '<div class="property-card__track" data-role="track" style="transform: translateX(-' + (idx * 100) + '%);">' +
            slidesHtml +
          '</div>' +
          '<div class="property-card__zoom-hint">' + ZOOM_ICON + '</div>' +
        '</div>' +
        '<span class="property-card__badge property-card__badge--' + property.operation + '">' + (property.operation === 'vente' ? 'À vendre' : 'À louer') + '</span>' +
        furnishedBadge +
        (total > 1 ? (
          '<button class="property-card__nav property-card__nav--prev" data-role="prev" aria-label="Photo précédente">' + CHEVRON_LEFT + '</button>' +
          '<button class="property-card__nav property-card__nav--next" data-role="next" aria-label="Photo suivante">' + CHEVRON_RIGHT + '</button>' +
          '<span class="property-card__counter" data-role="counter">' + (idx + 1) + ' / ' + total + '</span>'
        ) : '') +
      '</div>' +
      '<div class="property-card__body">' +
        '<p class="property-card__type">' + typeLabel(property.type) + (property.ref ? ' · Réf. ' + property.ref : '') + '</p>' +
        '<h3 class="property-card__title">' + property.title + '</h3>' +
        '<p class="property-card__location">' + LOCATION_ICON + ' ' + property.location + '</p>' +
        '<div class="property-card__footer">' +
          '<span class="property-card__price">' + property.priceLabel + '</span>' +
          '<a href="https://wa.me/22873079423?text=' + whatsappMessage + '" target="_blank" rel="noopener noreferrer" class="btn btn-whatsapp">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm4.52 14.13c-.25 0-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-1.02-.05-1.15.31-1.15 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74 1.66.72 2.31.65 2.97.54.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29z"/></svg>' +
            'WhatsApp' +
          '</a>' +
        '</div>' +
      '</div>';

    // --- Interactions du carrousel ---
    const track = card.querySelector('[data-role="track"]');
    const counter = card.querySelector('[data-role="counter"]');
    const btnPrev = card.querySelector('[data-role="prev"]');
    const btnNext = card.querySelector('[data-role="next"]');
    const slider = card.querySelector('[data-role="slider"]');

    function updateSlide() {
      const i = slideIndex[property.id];
      track.style.transform = 'translateX(-' + (i * 100) + '%)';
      if (counter) counter.textContent = (i + 1) + ' / ' + total;
    }

    function goTo(delta) {
      const i = slideIndex[property.id];
      slideIndex[property.id] = (i + delta + total) % total;
      updateSlide();
    }

    if (btnPrev) btnPrev.addEventListener('click', function (e) { e.stopPropagation(); goTo(-1); });
    if (btnNext) btnNext.addEventListener('click', function (e) { e.stopPropagation(); goTo(1); });

    // Swipe tactile sur mobile
    let touchStartX = null;
    slider.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 40) goTo(diff < 0 ? 1 : -1);
      touchStartX = null;
    });

    // Clic sur la photo -> ouverture de la lightbox avec zoom, à la photo actuelle
    slider.addEventListener('click', function () {
      openLightbox(property, slideIndex[property.id]);
    });

    return card;
  }

  // ---------- Filtres ----------
  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filterButtons.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      currentFilter = btn.getAttribute('data-filter');
      render();
    });
  });

  // ---------- Recherche ----------
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        currentSearch = searchInput.value;
        render();
      }, 200);
    });
  }

  // ---------- Tri ----------
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      currentSort = sortSelect.value;
      render();
    });
  }

  // ==========================================================================
  // LIGHTBOX (zoom plein écran, réutilise les styles .lightbox de gallery.css)
  // ==========================================================================
  const lightbox = document.getElementById('propertyLightbox');
  const lbMediaWrap = document.getElementById('propertyLightboxMediaWrap');
  const lbCaption = document.getElementById('propertyLightboxCaption');
  const lbClose = document.getElementById('propertyLightboxClose');
  const lbPrev = document.getElementById('propertyLightboxPrev');
  const lbNext = document.getElementById('propertyLightboxNext');

  let lbProperty = null;
  let lbIndex = 0;

  function openLightbox(property, index) {
    lbProperty = property;
    lbIndex = index;
    renderLightbox();
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lbMediaWrap.innerHTML = '';
    document.body.style.overflow = '';
  }

  function renderLightbox() {
    if (!lbProperty) return;
    const total = lbProperty.images.length;
    lbMediaWrap.innerHTML = '<img src="' + IMG_BASE + lbProperty.images[lbIndex] + '" alt="' + lbProperty.title + '">';
    lbCaption.textContent = lbProperty.title + ' — ' + lbProperty.location + ' (' + (lbIndex + 1) + '/' + total + ')';
    // Synchronise aussi le carrousel de la carte pour rester cohérent en refermant la lightbox
    slideIndex[lbProperty.id] = lbIndex;
    const card = document.querySelector('.property-card[data-id="' + lbProperty.id + '"]');
    if (card) {
      const track = card.querySelector('[data-role="track"]');
      const counter = card.querySelector('[data-role="counter"]');
      if (track) track.style.transform = 'translateX(-' + (lbIndex * 100) + '%)';
      if (counter) counter.textContent = (lbIndex + 1) + ' / ' + total;
    }
  }

  function lbNextFn() {
    if (!lbProperty) return;
    lbIndex = (lbIndex + 1) % lbProperty.images.length;
    renderLightbox();
  }

  function lbPrevFn() {
    if (!lbProperty) return;
    lbIndex = (lbIndex - 1 + lbProperty.images.length) % lbProperty.images.length;
    renderLightbox();
  }

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbNext) lbNext.addEventListener('click', lbNextFn);
  if (lbPrev) lbPrev.addEventListener('click', lbPrevFn);

  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') lbNextFn();
    if (e.key === 'ArrowLeft') lbPrevFn();
  });
})();
