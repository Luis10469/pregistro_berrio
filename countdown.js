/**
 * =============================================================================
 * PBERRIO - Cuenta regresiva oficial de lanzamiento
 * =============================================================================
 * Fecha objetivo: 15 de noviembre de 2026, 00:00:00, America/Bogota (UTC-5).
 *
 * Decisiones técnicas
 * -------------------
 * 1. El objetivo se guarda como un instante absoluto en UTC:
 *    15/11/2026 00:00 en Bogotá (UTC-5, sin horario de verano) = 15/11/2026 05:00 UTC.
 *    Así el resultado es idéntico en cualquier navegador, locale o zona horaria,
 *    sin depender de new Date('2026-11-15T00:00:00') (que interpretaría la hora
 *    local del usuario).
 * 2. Cada tick recalcula desde Date.now(); nunca se resta 1 al valor anterior.
 *    Si el navegador suspende el intervalo (pestaña en segundo plano, equipo
 *    dormido), al volver se recalcula y la cuenta sigue exacta.
 * 3. Un único setInterval se libera al llegar a cero, al ocultar la pestaña y
 *    al descargar la página (sin memory leaks ni timers huérfanos).
 * 4. Módulo aislado: no modifica ni depende de la lógica del prerregistro
 *    (app.js / config.js), endpoints, almacenamiento o estado de lanzamiento.
 * =============================================================================
 */
(function (global) {
  'use strict';

  // 2026-11-15T05:00:00Z === 15/11/2026 00:00:00 en America/Bogota (UTC-5)
  var TARGET_UTC_MS = Date.UTC(2026, 10, 15, 5, 0, 0);
  var TICK_INTERVAL_MS = 1000;

  var MS_PER_SECOND = 1000;
  var SECONDS_PER_MINUTE = 60;
  var SECONDS_PER_HOUR = 3600;
  var SECONDS_PER_DAY = 86400;

  var LAUNCH_MESSAGE = '¡Llegó el gran día de PBerrio!';

  // Relación unidad lógica -> id en el DOM
  var UNIT_IDS = {
    days: 'countdown-days',
    hours: 'countdown-hours',
    minutes: 'countdown-minutes',
    seconds: 'countdown-seconds'
  };

  /**
   * Calcula el tiempo restante para el lanzamiento.
   * @param {number} nowMs Marca de tiempo actual en milisegundos.
   * @returns {{days:number,hours:number,minutes:number,seconds:number,totalMs:number,isComplete:boolean}}
   *          Valores siempre >= 0. `isComplete` es true al alcanzar la fecha.
   */
  function computeRemaining(nowMs) {
    var diffMs = TARGET_UTC_MS - nowMs;

    // La comparación !(diffMs > 0) también cubre NaN / valores inválidos,
    // garantizando que nunca se muestren números negativos.
    if (!(diffMs > 0)) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, isComplete: true };
    }

    var totalSeconds = Math.floor(diffMs / MS_PER_SECOND);

    return {
      days: Math.floor(totalSeconds / SECONDS_PER_DAY),
      hours: Math.floor((totalSeconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR),
      minutes: Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
      seconds: totalSeconds % SECONDS_PER_MINUTE,
      totalMs: diffMs,
      isComplete: false
    };
  }

  /** Rellena a dos dígitos: 7 -> "07". Días con más de 2 dígitos se muestran completos. */
  function pad2(value) {
    var n = Math.floor(value);
    return n < 10 ? '0' + n : String(n);
  }

  /** Texto para lectores de pantalla; se actualiza por minuto, no cada segundo. */
  function buildAnnouncement(remaining) {
    if (remaining.isComplete) return LAUNCH_MESSAGE;

    var parts = [];

    if (remaining.days > 0) {
      parts.push(remaining.days + (remaining.days === 1 ? ' día' : ' días'));
    }
    parts.push(remaining.hours + (remaining.hours === 1 ? ' hora' : ' horas'));
    parts.push(remaining.minutes + (remaining.minutes === 1 ? ' minuto' : ' minutos'));

    return 'Faltan ' + parts.join(', ') + ' para el lanzamiento de PBerrio.';
  }

  /* =========================================================================
     Inicialización en el DOM
     ========================================================================= */

  var initialized = false;

  function init() {
    if (initialized) return; // Idempotente: evita timers duplicados si el script se carga dos veces.

    var card = document.getElementById('countdown');
    if (!card) return; // La sección no está en esta página: salir sin efectos.

    initialized = true;

    var valueEls = {};
    var missingNode = false;

    Object.keys(UNIT_IDS).forEach(function (unit) {
      var el = document.getElementById(UNIT_IDS[unit]);
      if (el) {
        valueEls[unit] = el;
      } else {
        missingNode = true;
      }
    });

    if (missingNode) return; // Markup incompleto: no rompemos el resto de la página.

    var announcementEl = document.getElementById('countdown-accessible');
    var launchMessageEl = document.getElementById('countdown-launch-message');

    var intervalId = null;
    var hasLaunched = false;
    var lastAnnouncement = '';
    var reduceMotionQuery = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    function prefersReducedMotion() {
      return !!(reduceMotionQuery && reduceMotionQuery.matches);
    }

    /**
     * Animación discreta al cambiar un número (Web Animations API:
     * se ejecuta en compositor, no provoca reflows y se omite si el usuario
     * pidió menos movimiento).
     */
    function animateValue(el) {
      if (prefersReducedMotion() || typeof el.animate !== 'function') return;

      el.animate(
        [
          { transform: 'translateY(-0.16em)', opacity: 0.35 },
          { transform: 'translateY(0)', opacity: 1 }
        ],
        { duration: 320, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      );
    }

    /** Escribe el valor solo si cambió (evita repintados innecesarios). */
    function updateValue(unit, value) {
      var el = valueEls[unit];
      var text = pad2(value);

      if (el.textContent === text) return;

      el.textContent = text;
      animateValue(el);
    }

    function updateAnnouncement(remaining) {
      if (!announcementEl) return;

      var text = buildAnnouncement(remaining);
      if (text === lastAnnouncement) return;

      lastAnnouncement = text;
      announcementEl.textContent = text;
    }

    function render(remaining) {
      updateValue('days', remaining.days);
      updateValue('hours', remaining.hours);
      updateValue('minutes', remaining.minutes);
      updateValue('seconds', remaining.seconds);
      updateAnnouncement(remaining);
    }

    function stop() {
      if (intervalId === null) return;

      global.clearInterval(intervalId);
      intervalId = null;
    }

    /**
     * Estado final: detiene el contador y muestra el mensaje.
     * No activa funcionalidades, no cambia el estado de lanzamiento y no
     * redirige a nadie.
     */
    function handleLaunch() {
      if (hasLaunched) return;

      hasLaunched = true;
      stop();

      card.classList.add('is-launched');
      card.setAttribute('data-countdown-state', 'launched');

      if (launchMessageEl) {
        launchMessageEl.textContent = LAUNCH_MESSAGE;
        launchMessageEl.hidden = false;
      }

      if (announcementEl) {
        lastAnnouncement = LAUNCH_MESSAGE;
        announcementEl.textContent = LAUNCH_MESSAGE;
      }
    }

    function tick() {
      var remaining = computeRemaining(Date.now());

      render(remaining);

      if (remaining.isComplete) handleLaunch();
    }

    function start() {
      if (hasLaunched) return;

      // Render inmediato y resincronización con el reloj real: si la pestaña
      // estuvo suspendida, no se espera al siguiente tick para corregir.
      tick();

      if (intervalId === null && !hasLaunched) {
        intervalId = global.setInterval(tick, TICK_INTERVAL_MS);
      }
    }

    // Pausa el timer cuando la pestaña no es visible (ahorro de CPU/batería)
    // y lo retoma recalculando desde la hora real.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    global.addEventListener('pageshow', start);
    global.addEventListener('pagehide', stop);

    start();
  }

  /* API mínima expuesta para pruebas y depuración. */
  global.PBerrioCountdown = {
    TARGET_UTC_MS: TARGET_UTC_MS,
    TICK_INTERVAL_MS: TICK_INTERVAL_MS,
    LAUNCH_MESSAGE: LAUNCH_MESSAGE,
    computeRemaining: computeRemaining,
    pad2: pad2,
    buildAnnouncement: buildAnnouncement
  };

  if (typeof document === 'undefined') return; // Entorno sin DOM (pruebas en Node).

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
