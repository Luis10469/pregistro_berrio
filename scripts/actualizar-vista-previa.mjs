// Apunta la vista previa del enlace (og:image de index.html) a la imagen con
// los días que faltan hoy. La corre cada medianoche de Colombia
// .github/workflows/vista-previa-diaria.yml; las imágenes las genera
// scripts/generar-vistas-previas.py.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// countdown.js tiene la fecha oficial y el cálculo del tiempo restante
await import(pathToFileURL(path.join(raiz, 'countdown.js')).href);
const restante = globalThis.PBerrioCountdown.computeRemaining(Date.now());

const imagen = `assets/og/${restante.isComplete ? 'lanzamiento' : `faltan-${restante.days}`}.jpg`;
if (!existsSync(path.join(raiz, imagen))) {
  console.error(`Falta ${imagen}: hay que correr scripts/generar-vistas-previas.py`);
  process.exit(1);
}

const indexPath = path.join(raiz, 'index.html');
const html = readFileSync(indexPath, 'utf8');
const actualizado = html.replace(/assets\/og\/(?:faltan-\d+|lanzamiento)\.jpg/g, imagen);

if (actualizado === html) {
  console.log(`La vista previa ya usa ${imagen}`);
} else {
  writeFileSync(indexPath, actualizado);
  console.log(`Vista previa actualizada: ${imagen}`);
}
