/* Verifica que la app siga siendo compatible con Safari 12 (iPad mini 2, iOS 12.5.8).
   Uso:  npm install acorn   y luego   node herramientas/verificar-compat.js
   - Analiza cada .js con sintaxis ES2017 (falla con ?., ??, campos #, spread de objetos, etc.)
   - Busca APIs y CSS que Safari 12 no tiene. */
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const raiz = path.join(__dirname, '..');
let errores = 0;

function revisar(archivo, reglas) {
  const texto = fs.readFileSync(archivo, 'utf8');
  // Se ignoran los comentarios de bloque (conservando los saltos de línea para numerar bien)
  const sinComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '));
  const lineas = sinComentarios.split('\n');
  reglas.forEach(([re, msg]) => {
    lineas.forEach((l, i) => {
      if (re.test(l)) { errores++; console.log(`✗ ${path.relative(raiz, archivo)}:${i + 1}  ${msg}\n    ${l.trim()}`); }
    });
  });
  return texto;
}

const REGLAS_JS = [
  [/Object\.fromEntries/, 'Object.fromEntries no existe en Safari 12'],
  [/\.flatMap\(|\.flat\(/, 'Array.flat/flatMap: evitar (Safari 12.0 dudoso)'],
  [/replaceAll\(/, 'String.replaceAll no existe en Safari 12'],
  [/globalThis/, 'globalThis no existe en Safari 12'],
  [/\.finally\(/, 'Promise.finally: evitar'],
  [/allSettled|structuredClone|\.at\(-?\d/, 'API demasiado moderna'],
  [/PointerEvent|pointerdown|pointerup/, 'Pointer Events no existen en iOS 12 (usa touch*)'],
  [/\.webp/i, 'WebP no se ve en Safari 12'],
  [/^\s*import\s|^\s*export\s/, 'Módulos ES: usar scripts clásicos']
];
const REGLAS_CSS = [
  [/(^|[^-])gap\s*:/, 'gap no funciona en flex en Safari 12'],
  [/aspect-ratio/, 'aspect-ratio no existe en Safari 12'],
  [/:is\(|:where\(|:has\(/, 'selectores :is/:where/:has no existen en Safari 12'],
  [/prefers-color-scheme/, 'prefers-color-scheme no existe en Safari 12'],
  [/(^|[;{\s])inset\s*:/, 'la propiedad inset no existe en Safari 12'],
  [/\.webp/i, 'WebP no se ve en Safari 12'],
  [/:focus-visible|clamp\(|min\(|max\(/, 'función/selector no disponible en Safari 12']
];

const dirJs = path.join(raiz, 'js');
fs.readdirSync(dirJs).filter(f => f.endsWith('.js')).forEach(f => {
  const archivo = path.join(dirJs, f);
  const texto = revisar(archivo, REGLAS_JS);
  /* errores.js debe ser ES5 puro para atrapar errores de sintaxis de los demás */
  const version = f === 'errores.js' ? 5 : 2017;
  try { acorn.parse(texto, { ecmaVersion: version, sourceType: 'script' }); }
  catch (e) { errores++; console.log(`✗ ${f}: sintaxis fuera de ES${version}: ${e.message}`); }
});
fs.readdirSync(path.join(raiz, 'css')).forEach(f => revisar(path.join(raiz, 'css', f), REGLAS_CSS));
revisar(path.join(raiz, 'index.html'), [[/\.webp/i, 'WebP'], [/type="module"/, 'módulos ES']]);

if (errores) { console.log(`\n${errores} problema(s) de compatibilidad.`); process.exit(1); }
console.log('✓ Todo compatible con Safari 12');
