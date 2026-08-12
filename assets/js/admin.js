/* ==========================================================================
   ADMIN.JS
   Gère l'espace d'administration : connexion (Supabase Auth), formulaire
   d'ajout d'annonce avec upload de photos (Supabase Storage), et liste des
   annonces déjà ajoutées via cet espace (avec suppression).
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
  const formError = document.getElementById('formError');
  const formSuccess = document.getElementById('formSuccess');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitBtn = document.getElementById('submitBtn');

  const conditionsContainer = document.getElementById('conditionsContainer');
  const addConditionBtn = document.getElementById('addConditionBtn');

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const previewsContainer = document.getElementById('previewsContainer');

  const listingsList = document.getElementById('listingsList');

  let selectedFiles = [];

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

  // Vérifie si une session existe déjà au chargement de la page
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
  // 2. CONDITIONS DYNAMIQUES (avance, caution, visite...)
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

  // Une première ligne vide par défaut
  addConditionRow('');

  // ==========================================================================
  // 3. UPLOAD DE PHOTOS (sélection + prévisualisation)
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

  // ==========================================================================
  // 4. SOUMISSION DU FORMULAIRE (upload photos + insertion en base)
  // ==========================================================================
  listingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    formError.classList.remove('is-visible');
    formSuccess.classList.remove('is-visible');

    if (!selectedFiles.length) {
      formError.textContent = 'Ajoute au moins une photo avant de publier.';
      formError.classList.add('is-visible');
      return;
    }

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
      price_label: document.getElementById('fieldPriceLabel').value.trim(),
      sort_price: Number(document.getElementById('fieldSortPrice').value) || 0,
      description: document.getElementById('fieldDescription').value.trim(),
      conditions: conditions
    };

    submitBtn.disabled = true;
    submitSpinner.classList.add('is-visible');

    uploadAllPhotos(selectedFiles)
      .then(function (urls) {
        payload.images = urls;
        return sb.from('properties').insert(payload);
      })
      .then(function (result) {
        if (result.error) throw result.error;
        formSuccess.textContent = 'Annonce publiée avec succès ! Elle est déjà visible sur le site.';
        formSuccess.classList.add('is-visible');
        listingForm.reset();
        selectedFiles = [];
        renderPreviews();
        conditionsContainer.innerHTML = '';
        addConditionRow('');
        loadListings();
      })
      .catch(function (err) {
        console.error(err);
        formError.textContent = 'Une erreur est survenue lors de la publication. Réessaie.';
        formError.classList.add('is-visible');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitSpinner.classList.remove('is-visible');
      });
  });

  // Upload chaque photo vers Supabase Storage et retourne les URLs publiques
  function uploadAllPhotos(files) {
    const uploads = files.map(function (file, index) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '-');
      const path = 'listings/' + Date.now() + '-' + index + '-' + cleanName;
      return sb.storage.from('property-images').upload(path, file)
        .then(function (result) {
          if (result.error) throw result.error;
          const publicUrl = sb.storage.from('property-images').getPublicUrl(path).data.publicUrl;
          return publicUrl;
        });
    });
    return Promise.all(uploads);
  }

  // ==========================================================================
  // 5. LISTE DES ANNONCES AJOUTÉES (gestion / suppression)
  // ==========================================================================
  function loadListings() {
    listingsList.innerHTML = '<p class="admin-empty">Chargement...</p>';

    sb.from('properties').select('*').order('created_at', { ascending: false })
      .then(function (result) {
        if (result.error) throw result.error;
        renderListings(result.data);
      })
      .catch(function (err) {
        console.error(err);
        listingsList.innerHTML = '<p class="admin-empty">Impossible de charger les annonces.</p>';
      });
  }

  function renderListings(rows) {
    if (!rows.length) {
      listingsList.innerHTML = '<p class="admin-empty">Aucune annonce ajoutée pour l\'instant depuis cet espace.</p>';
      return;
    }

    listingsList.innerHTML = '';
    rows.forEach(function (row) {
      const thumb = (row.images && row.images[0]) || '';
      const div = document.createElement('div');
      div.className = 'admin-listing-row';
      div.innerHTML =
        (thumb ? '<img src="' + thumb + '" alt="">' : '') +
        '<div class="admin-listing-row__info">' +
          '<p class="admin-listing-row__title">' + row.title + '</p>' +
          '<p class="admin-listing-row__meta">' + row.location + ' · ' + row.price_label + '</p>' +
        '</div>' +
        '<button type="button" class="btn-delete">Supprimer</button>';

      div.querySelector('.btn-delete').addEventListener('click', function () {
        if (!confirm('Supprimer définitivement cette annonce ?')) return;
        sb.from('properties').delete().eq('id', row.id).then(function (result) {
          if (result.error) {
            alert('Erreur lors de la suppression.');
            return;
          }
          loadListings();
        });
      });

      listingsList.appendChild(div);
    });
  }
})();
