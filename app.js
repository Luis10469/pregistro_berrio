/**
 * =============================================================================
 * PBERRIO - Lógica y Comportamiento de la Lista de Espera
 * =============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos del Formulario
  const form = document.getElementById('waitlist-form');
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnIcon = submitBtn.querySelector('.btn-icon');
  const btnSpinner = submitBtn.querySelector('.btn-spinner');

  // Elementos de Error
  const nameError = document.getElementById('name-error');
  const phoneError = document.getElementById('phone-error');
  const emailError = document.getElementById('email-error');

  // Estado de Éxito
  const successState = document.getElementById('success-state');
  const registeredUserName = document.getElementById('registered-user-name');
  const whatsappShareBtn = document.getElementById('whatsapp-share-btn');
  const registerAnotherBtn = document.getElementById('register-another-btn');

  // Admin Modal
  const openAdminBtn = document.getElementById('open-admin-btn');
  const closeAdminBtn = document.getElementById('close-admin-btn');
  const adminModal = document.getElementById('admin-modal');
  const leadsCountBadge = document.getElementById('leads-count-badge');
  const statTotalLeads = document.getElementById('stat-total-leads');
  const statSyncStatus = document.getElementById('stat-sync-status');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const clearLeadsBtn = document.getElementById('clear-leads-btn');
  const leadsTableBody = document.getElementById('leads-table-body');

  // Inicializar contador de leads
  updateLeadsCounter();

  // Validación en tiempo real al escribir
  nameInput.addEventListener('input', () => clearError(nameInput, nameError));
  phoneInput.addEventListener('input', (e) => {
    // Formatear automáticamente dígitos
    clearError(phoneInput, phoneError);
  });
  emailInput.addEventListener('input', () => clearError(emailInput, emailError));

  // Envío del Formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim().replace(/\s+/g, ' ');
    const email = emailInput.value.trim().toLowerCase();

    // Validaciones
    let isValid = true;

    if (name.length < 2) {
      showError(nameInput, nameError, 'Por favor escribe tu nombre completo.');
      isValid = false;
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    if (cleanPhoneDigits.length < 7 || cleanPhoneDigits.length > 12) {
      showError(phoneInput, phoneError, 'Ingresa un número de celular o WhatsApp válido.');
      isValid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError(emailInput, emailError, 'Ingresa un correo electrónico válido (ej: nombre@gmail.com).');
      isValid = false;
    }

    if (!isValid) return;

    // Estado cargando en el botón
    setLoading(true);

    const now = new Date();
    const lead = {
      id: 'pb_' + Date.now(),
      name: name,
      phone: '+57 ' + cleanPhoneDigits,
      rawPhone: '57' + cleanPhoneDigits,
      email: email,
      createdAt: now.toISOString(),
      formattedDate: now.toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Bogota'
      }),
      source: 'PBerrio Web Landing'
    };

    // 1. Guardar en LocalStorage
    saveLeadLocally(lead);

    // 2. Sincronizar con Google Sheets (si está configurada la URL)
    if (APP_CONFIG.GOOGLE_SHEET_WEBHOOK_URL && APP_CONFIG.GOOGLE_SHEET_WEBHOOK_URL.trim() !== '') {
      try {
        await fetch(APP_CONFIG.GOOGLE_SHEET_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          },
          body: JSON.stringify(lead)
        });
      } catch (webhookErr) {
        console.warn('No se pudo contactar el webhook de Google Sheets, el registro quedó a salvo en local.', webhookErr);
      }
    }

    // Pequeño retardo simulado para una experiencia fluida
    setTimeout(() => {
      setLoading(false);
      showSuccess(lead);
    }, 600);
  });

  // Mostrar Éxito
  function showSuccess(lead) {
    form.style.display = 'none';
    successState.style.display = 'block';

    const firstName = lead.name.split(' ')[0] || lead.name;
    registeredUserName.textContent = firstName;

    // Configurar enlace de compartir en WhatsApp
    const currentUrl = window.location.href;
    const shareMessage = encodeURIComponent(`${APP_CONFIG.SHARE_TEXT}\n${currentUrl}`);
    whatsappShareBtn.href = `https://api.whatsapp.com/send?text=${shareMessage}`;

    // Disparar Confetti festivo
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#0052ff', '#00d4ff', '#ff5400', '#ffffff']
      });
    }

    // Actualizar badge
    updateLeadsCounter();
  }

  // Registrar a otra persona
  registerAnotherBtn.addEventListener('click', () => {
    form.reset();
    form.style.display = 'flex';
    successState.style.display = 'none';
    nameInput.focus();
  });

  // Funciones de validación
  function showError(input, errorElement, message) {
    errorElement.textContent = message;
    errorElement.classList.add('active');
    input.closest('.input-wrapper').style.borderColor = '#dc2626';
  }

  function clearError(input, errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('active');
    input.closest('.input-wrapper').style.borderColor = '';
  }

  function setLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      btnText.textContent = 'Guardando tu lugar...';
      btnIcon.style.display = 'none';
      btnSpinner.style.display = 'block';
    } else {
      submitBtn.disabled = false;
      btnText.textContent = 'Quiero unirme';
      btnIcon.style.display = 'block';
      btnSpinner.style.display = 'none';
    }
  }

  // Almacenamiento Local
  function getLeads() {
    try {
      const data = localStorage.getItem(APP_CONFIG.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLeadLocally(lead) {
    const leads = getLeads();
    leads.unshift(lead); // Más reciente primero
    localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(leads));
  }

  function updateLeadsCounter() {
    const leads = getLeads();
    const count = leads.length;
    if (leadsCountBadge) leadsCountBadge.textContent = count;
    if (statTotalLeads) statTotalLeads.textContent = count;
  }

  // ==========================================================================
  // Panel de Administración (Modal & Exportar CSV)
  // ==========================================================================

  function renderLeadsTable() {
    const leads = getLeads();
    updateLeadsCounter();

    if (statSyncStatus) {
      statSyncStatus.textContent = APP_CONFIG.GOOGLE_SHEET_WEBHOOK_URL ? 'Conectado a Google' : 'Local / Navegador';
    }

    if (leads.length === 0) {
      leadsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-table-msg">No hay registros aún. Sé el primero en inscribirte.</td>
        </tr>
      `;
      return;
    }

    leadsTableBody.innerHTML = leads.map((item, index) => {
      const waNumber = item.rawPhone || item.phone.replace(/\D/g, '');
      const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent('¡Hola ' + item.name + '! Te saludamos de PBerrio.')}`;

      return `
        <tr>
          <td><strong>${leads.length - index}</strong></td>
          <td>${item.formattedDate || item.createdAt.split('T')[0]}</td>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>
            <a href="${waLink}" target="_blank" class="wa-table-link">
              <i data-lucide="message-circle" style="width:14px; height:14px;"></i>
              ${escapeHtml(item.phone)}
            </a>
          </td>
          <td>${escapeHtml(item.email)}</td>
          <td>
            <button class="secondary-btn" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="deleteLead('${item.id}')">
              Eliminar
            </button>
          </td>
        </tr>
      `;
    }).join('');

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Función global para eliminar registro individual
  window.deleteLead = function(id) {
    if (!confirm('¿Deseas eliminar este registro de la lista local?')) return;
    let leads = getLeads();
    leads = leads.filter(l => l.id !== id);
    localStorage.setItem(APP_CONFIG.STORAGE_KEY, JSON.stringify(leads));
    renderLeadsTable();
  };

  // Abrir / Cerrar Admin
  openAdminBtn.addEventListener('click', () => {
    renderLeadsTable();
    adminModal.style.display = 'flex';
  });

  closeAdminBtn.addEventListener('click', () => {
    adminModal.style.display = 'none';
  });

  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      adminModal.style.display = 'none';
    }
  });

  // Atajo de teclado: Ctrl + Shift + L para abrir el panel de leads
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
      renderLeadsTable();
      adminModal.style.display = 'flex';
    }
    if (e.key === 'Escape' && adminModal.style.display === 'flex') {
      adminModal.style.display = 'none';
    }
  });

  // Exportar a CSV (Compatible con Microsoft Excel de Latinoamérica con acentos)
  exportCsvBtn.addEventListener('click', () => {
    const leads = getLeads();
    if (leads.length === 0) {
      alert('No hay registros guardados para exportar.');
      return;
    }

    let csvContent = '\uFEFF'; // BOM para que Excel respete tildes y caracteres en español
    csvContent += 'ID;Fecha y Hora;Nombre Completo;WhatsApp;Correo Electronico;Origen\n';

    leads.forEach((l, index) => {
      const row = [
        l.id || (index + 1),
        `"${(l.formattedDate || l.createdAt).replace(/"/g, '""')}"`,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${(l.phone || '').replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.source || 'PBerrio Web').replace(/"/g, '""')}"`
      ];
      csvContent += row.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PBerrio_Lista_Espera_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Limpiar todos los registros
  clearLeadsBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas borrar TODOS los registros locales? Esta acción no se puede deshacer.')) {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEY);
      renderLeadsTable();
    }
  });

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
});
