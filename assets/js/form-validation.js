/* ==========================================================================
   FORM-VALIDATION.JS
   Validation du formulaire de contact + envoi.

   IMPORTANT (à lire avant mise en production) : ce site est 100% statique
   (HTML/CSS/JS), il n'y a donc pas de serveur pour recevoir et envoyer le
   formulaire par email automatiquement. Ce script valide les champs, puis
   redirige vers WhatsApp avec un message pré-rempli reprenant toutes les
   informations saisies — ce qui correspond au canal de contact principal
   de l'agence.

   Pour recevoir aussi une copie par EMAIL automatiquement plus tard, il
   faudra brancher un service tiers gratuit comme Formspree ou EmailJS
   (quelques lignes à ajouter ici) : dis-le-moi quand tu seras prêt et je
   l'intégrerai.
   ========================================================================== */

(function () {
  'use strict';

  const form = document.getElementById('contactForm');
  if (!form) return;

  const successMessage = document.getElementById('formSuccess');

  const fields = {
    name: { el: document.getElementById('fieldName'), required: true },
    phone: { el: document.getElementById('fieldPhone'), required: true },
    email: { el: document.getElementById('fieldEmail'), required: false },
    subject: { el: document.getElementById('fieldSubject'), required: true },
    message: { el: document.getElementById('fieldMessage'), required: true }
  };

  function showError(fieldGroup, show) {
    fieldGroup.classList.toggle('has-error', show);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    let isValid = true;

    Object.keys(fields).forEach(function (key) {
      const field = fields[key];
      if (!field.el) return;
      const group = field.el.closest('.form-group');
      const value = field.el.value.trim();

      let fieldValid = true;
      if (field.required && !value) {
        fieldValid = false;
      }
      if (key === 'email' && value && !isValidEmail(value)) {
        fieldValid = false;
      }

      showError(group, !fieldValid);
      if (!fieldValid) isValid = false;
    });

    return isValid;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (!validate()) return;

    const name = fields.name.el.value.trim();
    const phone = fields.phone.el.value.trim();
    const email = fields.email.el.value.trim();
    const subject = fields.subject.el.value.trim();
    const message = fields.message.el.value.trim();

    // Construction du message WhatsApp pré-rempli
    let waMessage = 'Bonjour, je vous contacte via le site web.\n';
    waMessage += 'Nom : ' + name + '\n';
    waMessage += 'Téléphone : ' + phone + '\n';
    if (email) waMessage += 'Email : ' + email + '\n';
    waMessage += 'Sujet : ' + subject + '\n';
    waMessage += 'Message : ' + message;

    const whatsappUrl = 'https://wa.me/22870079423?text=' + encodeURIComponent(waMessage);

    // Affiche un message de confirmation avant la redirection
    if (successMessage) {
      successMessage.classList.add('is-visible');
    }

    setTimeout(function () {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      form.reset();
    }, 600);
  });

  // Retire l'état d'erreur dès que l'utilisateur corrige le champ
  Object.keys(fields).forEach(function (key) {
    const field = fields[key];
    if (!field.el) return;
    field.el.addEventListener('input', function () {
      showError(field.el.closest('.form-group'), false);
    });
  });
})();
