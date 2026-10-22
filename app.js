/**
 * =============================================================================
 * PBERRIO - Lógica y Comportamiento de la Lista de Espera
 * =============================================================================
 * El pre-registro pide solo nombre y correo y los envía a Google Sheets.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos del Formulario
  const form = document.getElementById('waitlist-form');
  const formView = document.getElementById('signup-form-view');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');

  // Elementos de Error
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const formError = document.getElementById('form-error');

  // Estado de Éxito
  const successState = document.getElementById('success-state');
  const successTitle = successState.querySelector('.success-title');
  const registeredUserName = document.getElementById('registered-user-name');
  const registeredUserEmail = document.getElementById('registered-user-email');
  const whatsappShareBtn = document.getElementById('whatsapp-share-btn');
  const registerAnotherBtn = document.getElementById('register-another-btn');

  // Validación en tiempo real al escribir
  nameInput.addEventListener('input', () => clearError(nameInput, nameError));
  emailInput.addEventListener('input', () => clearError(emailInput, emailError));

  // Envío del Formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn.disabled) return;

    formError.textContent = '';

    const name = nameInput.value.trim().replace(/\s+/g, ' ');
    const email = emailInput.value.trim().toLowerCase();

    // Validaciones
    let firstInvalid = null;

    if (name.length < 2) {
      showError(nameInput, nameError, 'Por favor escribe tu nombre.');
      firstInvalid = firstInvalid || nameInput;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError(emailInput, emailError, 'Ingresa un correo electrónico válido (ej: nombre@gmail.com).');
      firstInvalid = firstInvalid || emailInput;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const webhookUrl = (APP_CONFIG.GOOGLE_SHEET_WEBHOOK_URL || '').trim();
    if (!webhookUrl) {
      console.error('Falta GOOGLE_SHEET_WEBHOOK_URL en config.js: el registro no se puede guardar.');
      formError.textContent = 'El registro no está disponible en este momento. Inténtalo más tarde.';
      return;
    }

    const now = new Date();
    const lead = {
      id: 'pb_' + Date.now(),
      name: name,
      email: email,
      createdAt: now.toISOString(),
      formattedDate: now.toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Bogota'
      }),
      source: 'PBerrio Web Landing'
    };

    setLoading(true);

    // Sincronizar con Google Sheets. Con mode 'no-cors' la respuesta es opaca:
    // solo se detecta un fallo de red, y en ese caso no se muestra el éxito.
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(lead)
      });
    } catch (webhookErr) {
      console.warn('Error al contactar Google Sheets:', webhookErr);
      setLoading(false);
      formError.textContent = 'No pudimos guardar tu registro. Revisa tu conexión e inténtalo de nuevo.';
      return;
    }

    setLoading(false);
    showSuccess(lead);
  });

  // Mostrar Éxito
  function showSuccess(lead) {
    formView.hidden = true;
    successState.hidden = false;

    registeredUserName.textContent = lead.name.split(' ')[0] || lead.name;
    registeredUserEmail.textContent = lead.email;

    // Configurar enlace de compartir en WhatsApp
    const pageUrl = window.location.origin + window.location.pathname;
    const shareMessage = encodeURIComponent(`${APP_CONFIG.SHARE_TEXT}\n${pageUrl}`);
    whatsappShareBtn.href = `https://api.whatsapp.com/send?text=${shareMessage}`;

    successTitle.focus();

    // Confetti con los colores de la marca
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#ff7a00', '#ff5f00', '#ffa94d', '#ffffff'],
        disableForReducedMotion: true
      });
    }
  }

  // Registrar a otra persona
  registerAnotherBtn.addEventListener('click', () => {
    form.reset();
    successState.hidden = true;
    formView.hidden = false;
    nameInput.focus();
  });

  // Funciones auxiliares de error y carga
  function showError(input, errorElement, message) {
    errorElement.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.closest('.field').classList.add('is-invalid');
  }

  function clearError(input, errorElement) {
    errorElement.textContent = '';
    input.removeAttribute('aria-invalid');
    input.closest('.field').classList.remove('is-invalid');
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle('is-loading', loading);
    btnText.textContent = loading ? 'Guardando tu lugar...' : 'Quiero unirme';
  }
});
