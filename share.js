/**
 * =============================================================================
 * PBERRIO - Compartir la página y la cuenta regresiva
 * =============================================================================
 * - "Subir a historias": dibuja una imagen vertical (1080x1920) con el conteo
 *   de ese momento y la entrega al menú de compartir del celular (Instagram,
 *   WhatsApp...). Si el navegador no comparte archivos, la descarga.
 * - "Compartir": comparte el enlace con el menú del celular; si el navegador
 *   no lo tiene, copia el enlace.
 * - renderPreview(): dibuja la vista previa del enlace (1200x630). La usa
 *   scripts/vista-previa.html para generar assets/og/*.jpg.
 * Depende de countdown.js (PBerrioCountdown) para la fecha de lanzamiento.
 * =============================================================================
 */
(function (global) {
  'use strict';

  const SITE_URL = 'https://pberrio.com/';
  const LAUNCH_DATE_TEXT = '15 de noviembre de 2026';

  const COLORS = {
    bg: '#0b0a09',
    orange: '#ff7a00',
    orangeStrong: '#ff5f00',
    orangeSoft: '#ffa94d',
    orangeInk: '#1a0b00',
    text: '#f7f3ee',
    muted: '#bdb3a8',
    dim: '#948a80'
  };

  const HEADING = 'Outfit, system-ui, sans-serif';
  const BODY = '"Plus Jakarta Sans", system-ui, sans-serif';

  /* ---------------------------------------------------------------------------
     Carga de recursos
     ------------------------------------------------------------------------- */

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No cargó la imagen ' + src));
      img.src = src;
    });
  }

  // Sin esto el lienzo dibujaría con la letra del sistema si Outfit aún no llegó.
  function loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('900 100px Outfit'),
      document.fonts.load('800 100px Outfit'),
      document.fonts.load('700 100px Outfit'),
      document.fonts.load('700 40px "Plus Jakarta Sans"'),
      document.fonts.load('600 40px "Plus Jakarta Sans"')
    ]).catch(() => {});
  }

  function loadAssets(logoSrc) {
    return Promise.all([loadImage(logoSrc), loadFonts()]).then((res) => ({ logo: res[0] }));
  }

  /* ---------------------------------------------------------------------------
     Dibujo
     ------------------------------------------------------------------------- */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function glow(ctx, x, y, radius, color) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(255, 122, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // Fondo de la página: oscuro, brillos naranja, retícula y líneas de velocidad
  function paintBackground(ctx, w, h) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    glow(ctx, w * 0.9, 0, Math.max(w, h) * 0.75, 'rgba(255, 122, 0, 0.42)');
    glow(ctx, 0, h, Math.max(w, h) * 0.6, 'rgba(255, 95, 0, 0.26)');

    const step = Math.round(Math.min(w, h) / 10);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = step; x < w; x += step) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = step; y < h; y += step) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
    ctx.restore();

    // La retícula se desvanece hacia abajo
    const fade = ctx.createLinearGradient(0, h * 0.35, 0, h);
    fade.addColorStop(0, 'rgba(11, 10, 9, 0)');
    fade.addColorStop(1, 'rgba(11, 10, 9, 0.85)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
  }

  function streak(ctx, x, y, length, thickness) {
    const g = ctx.createLinearGradient(x, 0, x + length, 0);
    g.addColorStop(0, 'rgba(255, 122, 0, 0)');
    g.addColorStop(1, 'rgba(255, 122, 0, 0.55)');
    ctx.fillStyle = g;
    roundRect(ctx, x, y, length, thickness, thickness / 2);
    ctx.fill();
  }

  function setFont(ctx, weight, size, family, spacing) {
    ctx.font = weight + ' ' + size + 'px ' + family;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (spacing || 0) + 'px';
  }

  // Achica la letra hasta que el texto quepa en el ancho dado
  function fitText(ctx, text, weight, size, family, maxWidth) {
    let s = size;
    setFont(ctx, weight, s, family);
    while (s > 12 && ctx.measureText(text).width > maxWidth) {
      s -= 2;
      setFont(ctx, weight, s, family);
    }
    return s;
  }

  function orangeFill(ctx, top, bottom) {
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, COLORS.orangeSoft);
    g.addColorStop(1, COLORS.orangeStrong);
    return g;
  }

  // "PBerrio" con la P naranja, centrado en cx
  function drawWordmark(ctx, cx, baseline, size) {
    setFont(ctx, 900, size, HEADING, -size * 0.02);
    const pWidth = ctx.measureText('P').width;
    const total = pWidth + ctx.measureText('Berrio').width;
    const left = cx - total / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.orange;
    ctx.fillText('P', left, baseline);
    ctx.fillStyle = COLORS.text;
    ctx.fillText('Berrio', left + pWidth, baseline);
    ctx.textAlign = 'center';
  }

  function drawPill(ctx, cx, y, text, size) {
    setFont(ctx, 800, size, HEADING);
    const padX = size * 1.1;
    const h = size * 2.3;
    const w = ctx.measureText(text).width + padX * 2;
    const g = ctx.createLinearGradient(cx - w / 2, y, cx + w / 2, y + h);
    g.addColorStop(0, '#ff9a2e');
    g.addColorStop(0.45, COLORS.orange);
    g.addColorStop(1, COLORS.orangeStrong);
    ctx.save();
    ctx.shadowColor = 'rgba(255, 95, 0, 0.55)';
    ctx.shadowBlur = size;
    ctx.shadowOffsetY = size * 0.35;
    ctx.fillStyle = g;
    roundRect(ctx, cx - w / 2, y, w, h, h / 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = COLORS.orangeInk;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, y + h / 2 + size * 0.04);
    ctx.textBaseline = 'alphabetic';
  }

  function pad2(n) {
    return global.PBerrioCountdown ? global.PBerrioCountdown.pad2(n) : String(n).padStart(2, '0');
  }

  // Imagen vertical para historias (1080x1920). Deja libres las franjas de
  // arriba y abajo, donde Instagram y WhatsApp ponen sus botones.
  function drawStory(ctx, logo, remaining) {
    const W = 1080;
    const H = 1920;
    const cx = W / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    paintBackground(ctx, W, H);
    streak(ctx, 70, 380, 230, 18);
    streak(ctx, 120, 420, 150, 18);
    streak(ctx, 760, 1600, 260, 18);
    streak(ctx, 820, 1640, 170, 18);

    const logoW = 300;
    const logoH = logoW * logo.height / logo.width;
    glow(ctx, cx, 300 + logoH / 2, 320, 'rgba(255, 122, 0, 0.32)');
    ctx.drawImage(logo, cx - logoW / 2, 300, logoW, logoH);

    drawWordmark(ctx, cx, 680, 96);
    setFont(ctx, 600, 34, BODY);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText('Puerto Berrío, Antioquia', cx, 740);

    setFont(ctx, 700, 32, BODY, 7);
    ctx.fillStyle = COLORS.orangeSoft;
    ctx.fillText('CUENTA REGRESIVA OFICIAL', cx, 860);

    if (remaining.isComplete) {
      const size = fitText(ctx, '¡Llegó el gran día!', 900, 150, HEADING, W - 140);
      ctx.fillStyle = orangeFill(ctx, 1150 - size, 1150);
      ctx.fillText('¡Llegó el gran día!', cx, 1150);
      setFont(ctx, 600, 40, BODY);
      ctx.fillStyle = COLORS.muted;
      ctx.fillText('PBerrio ya está en Puerto Berrío', cx, 1260);
    } else {
      setFont(ctx, 800, 74, HEADING, -1);
      ctx.fillStyle = COLORS.text;
      ctx.fillText('Cada vez falta menos', cx, 960);

      const units = [
        [remaining.days, remaining.days === 1 ? 'DÍA' : 'DÍAS'],
        [remaining.hours, 'HORAS'],
        [remaining.minutes, 'MINUTOS']
      ];
      const tileW = 290;
      const tileH = 300;
      const gap = 26;
      const top = 1020;
      let x = cx - (tileW * 3 + gap * 2) / 2;
      units.forEach((unit) => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        roundRect(ctx, x, top, tileW, tileH, 36);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.stroke();

        setFont(ctx, 800, 170, HEADING, -2);
        ctx.fillStyle = orangeFill(ctx, top + 50, top + 200);
        ctx.fillText(pad2(unit[0]), x + tileW / 2, top + 196);
        setFont(ctx, 700, 30, BODY, 4);
        ctx.fillStyle = COLORS.dim;
        ctx.fillText(unit[1], x + tileW / 2, top + 262);
        x += tileW + gap;
      });

      setFont(ctx, 600, 38, BODY);
      ctx.fillStyle = COLORS.muted;
      ctx.fillText('Lanzamiento: ' + LAUNCH_DATE_TEXT, cx, 1410);
    }

    drawPill(ctx, cx, 1470, 'Regístrate en pberrio.com', 46);
  }

  // Vista previa del enlace (1200x630). Lo importante va al centro, porque
  // WhatsApp a veces la recorta en cuadrado.
  function drawPreview(ctx, logo, days) {
    const W = 1200;
    const H = 630;
    const cx = W / 2;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    paintBackground(ctx, W, H);
    streak(ctx, 40, 470, 170, 12);
    streak(ctx, 80, 498, 110, 12);
    streak(ctx, 980, 120, 180, 12);
    streak(ctx, 1030, 148, 120, 12);

    // Logo y nombre en una fila centrada
    const logoW = 92;
    const logoH = logoW * logo.height / logo.width;
    setFont(ctx, 900, 60, HEADING, -1.2);
    const wordW = ctx.measureText('PBerrio').width;
    const rowW = logoW + 18 + wordW;
    const rowLeft = cx - rowW / 2;
    glow(ctx, rowLeft + logoW / 2, 44 + logoH / 2, 120, 'rgba(255, 122, 0, 0.3)');
    ctx.drawImage(logo, rowLeft, 44, logoW, logoH);
    drawWordmark(ctx, rowLeft + logoW + 18 + wordW / 2, 44 + logoH / 2 + 22, 60);

    setFont(ctx, 700, 22, BODY, 5);
    ctx.fillStyle = COLORS.orangeSoft;
    ctx.fillText('CUENTA REGRESIVA OFICIAL', cx, 200);

    const baseline = 410;
    if (days === 'lanzamiento' || days === 0) {
      const text = days === 0 ? 'Hoy a medianoche' : '¡Llegó el gran día!';
      const size = fitText(ctx, text, 900, 130, HEADING, W - 160);
      ctx.fillStyle = orangeFill(ctx, baseline - size * 0.8, baseline);
      ctx.fillText(text, cx, baseline - 10);
    } else {
      // "Faltan 23 días": el número grande y naranja en medio
      const before = days === 1 ? 'Falta' : 'Faltan';
      const after = days === 1 ? 'día' : 'días';
      const number = String(days);
      setFont(ctx, 800, 72, HEADING, -1);
      const beforeW = ctx.measureText(before).width;
      const afterW = ctx.measureText(after).width;
      setFont(ctx, 900, 230, HEADING, -6);
      const numberW = ctx.measureText(number).width;
      const space = 28;
      let x = cx - (beforeW + space + numberW + space + afterW) / 2;

      ctx.textAlign = 'left';
      setFont(ctx, 800, 72, HEADING, -1);
      ctx.fillStyle = COLORS.text;
      ctx.fillText(before, x, baseline);
      x += beforeW + space;
      setFont(ctx, 900, 230, HEADING, -6);
      ctx.fillStyle = orangeFill(ctx, baseline - 170, baseline);
      ctx.fillText(number, x, baseline);
      x += numberW + space;
      setFont(ctx, 800, 72, HEADING, -1);
      ctx.fillStyle = COLORS.text;
      ctx.fillText(after, x, baseline);
      ctx.textAlign = 'center';
    }

    setFont(ctx, 600, 26, BODY);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText('Lanzamiento: ' + LAUNCH_DATE_TEXT + ' · Puerto Berrío', cx, 476);

    drawPill(ctx, cx, 512, 'Regístrate en pberrio.com', 28);
  }

  /* ---------------------------------------------------------------------------
     Compartir desde la página
     ------------------------------------------------------------------------- */

  function shareText() {
    const r = global.PBerrioCountdown.computeRemaining(Date.now());
    let head;
    if (r.isComplete) head = '¡Llegó PBerrio a Puerto Berrío!';
    else if (r.days >= 2) head = '¡Faltan ' + r.days + ' días para PBerrio!';
    else if (r.days === 1) head = '¡Falta 1 día para PBerrio!';
    else head = '¡Hoy a medianoche llega PBerrio!';
    return head + ' Comida a domicilio y mandados en Puerto Berrío. Inscríbete en la lista de espera:';
  }

  // toDataURL es síncrono: así navigator.share se llama dentro del toque del
  // usuario (Safari rechaza compartir si antes hubo una espera asíncrona).
  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(',');
    const type = parts[0].slice(5, parts[0].indexOf(';'));
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: type });
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function initPage() {
    const storyBtn = document.getElementById('share-story-btn');
    const linkBtn = document.getElementById('share-link-btn');
    const statusEl = document.getElementById('share-status');
    if (!storyBtn || !linkBtn || !global.PBerrioCountdown) return;

    let assets = null;
    const assetsPromise = loadAssets('assets/logo-pberrio.png').then((a) => (assets = a));
    assetsPromise.catch((err) => console.warn('Imagen para historias sin recursos:', err));

    function setStatus(message, isError) {
      statusEl.textContent = message;
      statusEl.classList.toggle('is-error', Boolean(isError));
    }

    storyBtn.addEventListener('click', async () => {
      setStatus('');
      storyBtn.disabled = true;
      try {
        const ready = assets || await assetsPromise;
        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1920;
        drawStory(canvas.getContext('2d'), ready.logo, global.PBerrioCountdown.computeRemaining(Date.now()));
        const blob = dataUrlToBlob(canvas.toDataURL('image/jpeg', 0.92));
        const file = new File([blob], 'pberrio-cuenta-regresiva.jpg', { type: 'image/jpeg' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
          } catch (err) {
            if (err.name === 'AbortError') return;
            if (err.name === 'NotAllowedError') {
              setStatus('La imagen ya está lista: toca otra vez "Subir a historias".');
              return;
            }
            throw err;
          }
        } else {
          downloadBlob(blob, file.name);
          setStatus('Imagen descargada. Súbela a tus historias desde tu galería.');
        }
      } catch (err) {
        console.error('No se pudo preparar la imagen para historias:', err);
        setStatus('No pudimos preparar la imagen. Inténtalo de nuevo.', true);
      } finally {
        storyBtn.disabled = false;
      }
    });

    linkBtn.addEventListener('click', async () => {
      setStatus('');
      const text = shareText();
      if (navigator.share) {
        try {
          await navigator.share({ title: 'PBerrio', text: text, url: SITE_URL });
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('El menú de compartir falló; se copia el enlace:', err);
        }
      }
      try {
        await navigator.clipboard.writeText(text + ' ' + SITE_URL);
        setStatus('Enlace copiado. Pégalo en WhatsApp o donde quieras.');
      } catch (err) {
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + SITE_URL), '_blank', 'noopener');
      }
    });
  }

  /* API usada por scripts/vista-previa.html y para pruebas. */
  global.PBerrioShare = {
    drawStory: drawStory,
    drawPreview: drawPreview,
    shareText: shareText,
    renderPreview: function (canvas, days, logoSrc) {
      return loadAssets(logoSrc).then((a) => {
        drawPreview(canvas.getContext('2d'), a.logo, days);
        document.title = 'lista';
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }
})(window);
