"""
Genera las vistas previas del enlace (assets/og/*.jpg): una por cada día que
falta para el lanzamiento (faltan-N.jpg) y la del día del lanzamiento
(lanzamiento.jpg).

El dibujo está en share.js (drawPreview) y se toma con Chrome sin ventana
desde scripts/vista-previa.html. La acción diaria
.github/workflows/vista-previa-diaria.yml elige cuál usar cada día.

Requiere Google Chrome y Pillow.
Uso: python scripts/generar-vistas-previas.py
"""
import datetime
import pathlib
import subprocess
import tempfile

from PIL import Image

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'assets' / 'og'
PLANTILLA = (RAIZ / 'scripts' / 'vista-previa.html').as_uri()

# Mismo instante que countdown.js: 15/11/2026 00:00 en Bogotá = 05:00 UTC
LANZAMIENTO = datetime.datetime(2026, 11, 15, 5, 0, tzinfo=datetime.timezone.utc)

CHROME = next(
    (p for p in (
        pathlib.Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe'),
        pathlib.Path(r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'),
        pathlib.Path('/usr/bin/google-chrome'),
        pathlib.Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    ) if p.exists()),
    None,
)


def capturar(dias, destino, carpeta):
    png = pathlib.Path(carpeta) / 'captura.png'
    subprocess.run([
        str(CHROME), '--headless=new', '--disable-gpu', '--hide-scrollbars',
        '--allow-file-access-from-files',
        f'--user-data-dir={pathlib.Path(carpeta) / "perfil"}',
        '--virtual-time-budget=5000', '--window-size=1200,630',
        f'--screenshot={png}', f'{PLANTILLA}?dias={dias}',
    ], check=True, capture_output=True, timeout=60)
    Image.open(png).convert('RGB').save(destino, 'JPEG', quality=86, optimize=True, progressive=True)


def main():
    if CHROME is None:
        raise SystemExit('No se encontró Google Chrome.')
    ahora = datetime.datetime.now(datetime.timezone.utc)
    max_dias = max(0, (LANZAMIENTO - ahora) // datetime.timedelta(days=1))
    SALIDA.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as carpeta:
        for dias in range(max_dias + 1):
            capturar(dias, SALIDA / f'faltan-{dias}.jpg', carpeta)
        capturar('lanzamiento', SALIDA / 'lanzamiento.jpg', carpeta)
    print(f'Listas {max_dias + 2} imágenes en {SALIDA}')


if __name__ == '__main__':
    main()
