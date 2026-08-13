/* ==========================================================================
   ADMIN.JS
   Gère l'espace d'administration : connexion (Supabase Auth), formulaire
   d'ajout/modification d'annonce avec upload de photos compressées
   (Supabase Storage), et liste des annonces déjà ajoutées via cet espace
   (avec modification et suppression).
   ========================================================================== */

(function () {
  'use strict';

  const { createClient } = window.supabase;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ---------- Références DOM ----------
  const loginSection = document.getElementById('adminLogin');
  const dashboardSection = document.getElementById('adminDashboard');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  const listingForm = document.getElementById('listingForm');
  const formTitle = document.getElementById('formTitle');
  const formError = document.getElementById('formError');
  const formSuccess = document.getElementById('formSuccess');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');

  const conditionsContainer = document.getElementById('conditionsContainer');
  const addConditionBtn = document.getElementById('addConditionBtn');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const previewsContainer = document.getElementById('previewsContainer');
  const existingPreviewsWrap = document.getElementById('existingPreviewsWrap');
  const existingPreviewsContainer = document.getElementById('existingPreviewsContainer');

  const priceAmountInput = document.getElementById('fieldPriceAmount');
  const priceFrequencySelect = document.getElementById('fieldPriceFrequency');
  const pricePreview = document.getElementById('pricePreview');

  const listingsList = document.getElementById('listingsList');

  let selectedFiles = [];      // nouvelles photos ajoutées (File[])
  let existingImages = [];     // photos déjà en ligne conservées (URLs), utilisé en mode édition
  let editingId = null;        // null = mode ajout, sinon id de l'annonce en cours de modification

  // ==========================================================================
  // 1. AUTHENTIFICATION
  // ==========================================================================
  function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.classList.add('is-visible');
    loadListings();
  }

  function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.classList.remove('is-visible');
  }

  sb.auth.getSession().then(function (result) {
    if (result.data.session) {
      showDashboard();
    } else {
      showLogin();
    }
  });

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.classList.remove('is-visible');

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    sb.auth.signInWithPassword({ email: email, password: password })
      .then(function (result) {
        if (result.error) {
          loginError.textContent = 'Connexion impossible : email ou mot de passe incorrect.';
          loginError.classList.add('is-visible');
          return;
        }
        showDashboard();
      });
  });

  logoutBtn.addEventListener('click', function () {
    sb.auth.signOut().then(function () {
      showLogin();
    });
  });

  // ==========================================================================
  // 2. PRIX AUTOMATIQUE (montant + type de tarif -> "FCFA" ajouté automatiquement)
  // ==========================================================================
  function formatPriceLabel(amount, frequency) {
    if (!amount) return '';
    const formatted = Number(amount).toLocaleString('fr-FR').replace(/\u202f/g, ' ');
    const suffixes = { fixed: '', month: ' / mois', night: ' / nuit', week: ' / semaine' };
    return formatted + ' FCFA' + (suffixes[frequency] || '');
  }

  function updatePricePreview() {
    const amount = priceAmountInput.value;
    const frequency = priceFrequencySelect.value;
    pricePreview.textContent = amount ? formatPriceLabel(amount, frequency) : '—';
  }

  priceAmountInput.addEventListener('input', updatePricePreview);
  priceFrequencySelect.addEventListener('change', updatePricePreview);

  // ==========================================================================
  // 3. CONDITIONS DYNAMIQUES (avance, caution, visite...)
  // ==========================================================================
  function addConditionRow(value) {
    const row = document.createElement('div');
    row.className = 'admin-condition-row';
    row.innerHTML =
      '<input type="text" class="condition-input" placeholder="Ex: Caution : 50 000 FCFA" value="' + (value || '').replace(/"/g, '&quot;') + '">' +
      '<button type="button" aria-label="Retirer">✕</button>';
    row.querySelector('button').addEventListener('click', function () {
      row.remove();
    });
    conditionsContainer.appendChild(row);
  }

  addConditionBtn.addEventListener('click', function () {
    addConditionRow('');
  });

  addConditionRow('');

  // ==========================================================================
  // 4. PHOTOS : nouvelles sélections + photos existantes (mode édition)
  // ==========================================================================
  dropzone.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    selectedFiles = selectedFiles.concat(Array.from(fileInput.files));
    renderPreviews();
    fileInput.value = '';
  });

  function renderPreviews() {
    previewsContainer.innerHTML = '';
    selectedFiles.forEach(function (file, index) {
      const url = URL.createObjectURL(file);
      const div = document.createElement('div');
      div.className = 'admin-preview';
      div.innerHTML = '<img src="' + url + '" alt="Photo ' + (index + 1) + '"><button type="button" aria-label="Retirer">✕</button>';
      div.querySelector('button').addEventListener('click', function () {
        selectedFiles.splice(index, 1);
        renderPreviews();
      });
      previewsContainer.appendChild(div);
    });
  }

  function renderExistingPreviews() {
    if (!editingId || !existingImages.length) {
      existingPreviewsWrap.style.display = 'none';
      return;
    }
    existingPreviewsWrap.style.display = 'block';
    existingPreviewsContainer.innerHTML = '';
    existingImages.forEach(function (url, index) {
      const div = document.createElement('div');
      div.className = 'admin-preview';
      div.innerHTML = '<img src="' + url + '" alt="Photo existante ' + (index + 1) + '"><button type="button" aria-label="Retirer">✕</button>';
      div.querySelector('button').addEventListener('click', function () {
        existingImages.splice(index, 1);
        renderExistingPreviews();
      });
      existingPreviewsContainer.appendChild(div);
    });
  }

  // ==========================================================================
  // 5. MODE ÉDITION (remplir le formulaire avec une annonce existante)
  // ==========================================================================
  function enterEditMode(row) {
    editingId = row.id;
    formTitle.textContent = 'Modifier l\'annonce';
    submitBtn.textContent = 'Enregistrer les modifications';
    cancelEditBtn.style.display = 'inline-flex';

    document.getElementById('fieldTitle').value = row.title || '';
    document.getElementById('fieldRef').value = row.ref || '';
    document.getElementById('fieldType').value = row.type || 'villa';
    document.getElementById('fieldOperation').value = row.operation || 'location';
    document.getElementById('fieldFurnished').checked = !!row.furnished;
    document.getElementById('fieldLocation').value = row.location || '';
    document.getElementById('fieldDescription').value = row.description || '';

    // Le montant est fiable (toujours numérique) ; le type de tarif est
    // déduit du libellé enregistré (best-effort pour les anciennes annonces).
    priceAmountInput.value = row.sort_price || '';
    if (row.price_label && row.price_label.includes('/ mois')) priceFrequencySelect.value = 'month';
    else if (row.price_label && row.price_label.includes('/ nuit')) priceFrequencySelect.value = 'night';
    else if (row.price_label && row.price_label.includes('/ semaine')) priceFrequencySelect.value = 'week';
    else priceFrequencySelect.value = 'fixed';
    updatePricePreview();

    conditionsContainer.innerHTML = '';
    (row.conditions && row.conditions.length ? row.conditions : ['']).forEach(function (c) {
      addConditionRow(c);
    });

    existingImages = (row.images || []).slice();
    selectedFiles = [];
    renderPreviews();
    renderExistingPreviews();

    formError.classList.remove('is-visible');
    formSuccess.classList.remove('is-visible');
    listingForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exitEditMode() {
    editingId = null;
    formTitle.textContent = 'Ajouter une nouvelle annonce';
    submitBtn.textContent = 'Publier l\'annonce';
    cancelEditBtn.style.display = 'none';
    existingImages = [];
    selectedFiles = [];
    listingForm.reset();
    conditionsContainer.innerHTML = '';
    addConditionRow('');
    renderPreviews();
    renderExistingPreviews();
    updatePricePreview();
  }

  cancelEditBtn.addEventListener('click', exitEditMode);

  // ==========================================================================
  // 6. SOUMISSION DU FORMULAIRE (ajout OU modification)
  // ==========================================================================
  listingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.classList.remove('is-visible');
    formSuccess.classList.remove('is-visible');

    const totalPhotos = existingImages.length + selectedFiles.length;
    if (!totalPhotos) {
      formError.textContent = 'Ajoute au moins une photo avant de publier.';
      formError.classList.add('is-visible');
      return;
    }

    const amount = priceAmountInput.value;
    const frequency = priceFrequencySelect.value;

    const conditions = Array.from(document.querySelectorAll('.condition-input'))
      .map(function (input) { return input.value.trim(); })
      .filter(Boolean);

    const payload = {
      title: document.getElementById('fieldTitle').value.trim(),
      ref: document.getElementById('fieldRef').value.trim() || null,
      type: document.getElementById('fieldType').value,
      operation: document.getElementById('fieldOperation').value,
      furnished: document.getElementById('fieldFurnished').checked,
      location: document.getElementById('fieldLocation').value.trim(),
      price_label: formatPriceLabel(amount, frequency),
      sort_price: Number(amount) || 0,
      description: document.getElementById('fieldDescription').value.trim(),
      conditions: conditions
    };

    submitBtn.disabled = true;
    submitSpinner.classList.add('is-visible');

    uploadAllPhotos(selectedFiles)
      .then(function (newUrls) {
        payload.images = existingImages.concat(newUrls);
        if (editingId) {
          return sb.from('properties').update(payload).eq('id', editingId);
        }
        return sb.from('properties').insert(payload);
      })
      .then(function (result) {
        if (result.error) throw result.error;
        formSuccess.textContent = editingId
          ? 'Annonce mise à jour avec succès !'
          : 'Annonce publiée avec succès ! Elle est déjà visible sur le site.';
        formSuccess.classList.add('is-visible');
        exitEditMode();
        loadListings();
      })
      .catch(function (err) {
        console.error(err);
        formError.textContent = 'Une erreur est survenue. Réessaie.';
        formError.classList.add('is-visible');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitSpinner.classList.remove('is-visible');
      });
  });

  // Compresse une image dans le navigateur avant upload (redimensionne à
  // 1600px de large max, réencode en JPEG qualité 0.8). Réduit le poids
  // d'une photo de téléphone (souvent 2-5 Mo) à environ 80-150 Ko, ce qui
  // multiplie par 15-20 la capacité du quota gratuit Supabase (1 Go).
  const MAX_WIDTH = 1600;
  const JPEG_QUALITY = 0.8;

  function compressImage(file) {
    return new Promise(function (resolve) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = function () {
        URL.revokeObjectURL(objectUrl);

        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          function (blob) { resolve(blob || file); },
          'image/jpeg',
          JPEG_QUALITY
        );
      };

      img.onerror = function () {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  }

  function uploadAllPhotos(files) {
    const uploads = files.map(function (file, index) {
      return compressImage(file).then(function (compressedBlob) {
        const path = 'listings/' + Date.now() + '-' + index + '.jpg';
        return sb.storage.from('property-images').upload(path, compressedBlob, { contentType: 'image/jpeg' })
          .then(function (result) {
            if (result.error) throw result.error;
            return sb.storage.from('property-images').getPublicUrl(path).data.publicUrl;
          });
      });
    });
    return Promise.all(uploads);
  }

  // ==========================================================================
  // 7. LISTE DES ANNONCES AJOUTÉES (gestion : modifier / supprimer)
  // ==========================================================================
  function loadListings() {
    listingsList.innerHTML = '<p class="admin-empty">Chargement...</p>';

    Promise.all([
      sb.from('properties').select('*').order('created_at', { ascending: false }),
      sb.from('property_views').select('property_id,views')
    ])
      .then(function (results) {
        if (results[0].error) throw results[0].error;
        const viewsMap = {};
        (results[1].data || []).forEach(function (row) { viewsMap[row.property_id] = row.views; });
        renderListings(results[0].data, viewsMap);
      })
      .catch(function (err) {
        console.error(err);
        listingsList.innerHTML = '<p class="admin-empty">Impossible de charger les annonces.</p>';
      });
  }

  function renderListings(rows, viewsMap) {
    if (!rows.length) {
      listingsList.innerHTML = '<p class="admin-empty">Aucune annonce ajoutée pour l\'instant depuis cet espace.</p>';
      return;
    }

    listingsList.innerHTML = '';
    rows.forEach(function (row) {
      const thumb = (row.images && row.images[0]) || '';
      const views = (viewsMap && viewsMap['sb-' + row.id]) || 0;
      const div = document.createElement('div');
      div.className = 'admin-listing-row';
      div.innerHTML =
        (thumb ? '<img src="' + thumb + '" alt="">' : '') +
        '<div class="admin-listing-row__info">' +
          '<p class="admin-listing-row__title">' + row.title + '</p>' +
          '<p class="admin-listing-row__meta">' + row.location + ' · ' + row.price_label + ' · 👁 ' + views + ' vue' + (views === 1 ? '' : 's') + '</p>' +
        '</div>' +
        '<div class="admin-listing-row__actions">' +
          '<button type="button" class="btn btn-outline-navy" style="padding:0.5rem 1rem; font-size: var(--fs-xs);">Modifier</button>' +
          '<button type="button" class="btn-delete">Supprimer</button>' +
        '</div>';
div.querySelector('.btn-outline-navy').addEventListener('click', function () {
        enterEditMode(row);
      });

      div.querySelector('.btn-delete').addEventListener('click', function () {
        if (!confirm('Supprimer définitivement cette annonce ?')) return;
        sb.from('properties').delete().eq('id', row.id).then(function (result) {
          if (result.error) {
            alert('Erreur lors de la suppression.');
            return;
          }
          if (editingId === row.id) exitEditMode();
          loadListings();
        });
      });

      listingsList.appendChild(div);
    });
  }
})();
