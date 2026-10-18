/* Base: constantes, utilidades, ajustes (localStorage) y componentes de interfaz. */
var CJ = window.CJ = {};
CJ.vistas = {};
CJ.acc = {};

CJ.CATS = [
  { id: 'tops', nombre: 'Tops', emoji: '👚', carril: 'arriba' },
  { id: 'pantalones', nombre: 'Pantalones y shorts', corto: 'Pantalones', emoji: '👖', carril: 'abajo' },
  { id: 'faldas', nombre: 'Faldas', emoji: '🎀', carril: 'abajo' },
  { id: 'vestidos', nombre: 'Vestidos', emoji: '👗', carril: 'vestido' },
  { id: 'zapatos', nombre: 'Zapatos', emoji: '👠', carril: 'zapatos' },
  { id: 'accesorios', nombre: 'Accesorios', emoji: '👜', carril: 'acc' }
];

CJ.OCAS = [
  { id: 'trabajo', nombre: 'Trabajo', emoji: '💼' },
  { id: 'gym', nombre: 'Gym', emoji: '🏋️' },
  { id: 'casual', nombre: 'Casual', emoji: '🌴' }
];

/* La lista de colores debe coincidir con herramientas/estudio.py */
CJ.COLORES = [
  { id: 'negro', n: 'Negro', hex: '#1b1b1b', neutro: true },
  { id: 'blanco', n: 'Blanco', hex: '#ffffff', neutro: true },
  { id: 'crema', n: 'Crema', hex: '#f3e9d2', neutro: true },
  { id: 'beige', n: 'Beige', hex: '#d8c3a5', neutro: true },
  { id: 'cafe', n: 'Café', hex: '#7b5236', neutro: true },
  { id: 'gris', n: 'Gris', hex: '#9a9a9a', neutro: true },
  { id: 'marino', n: 'Azul marino', hex: '#1f2a4d', neutro: true },
  { id: 'denim', n: 'Denim', hex: '#4a6fa5', neutro: true },
  { id: 'oliva', n: 'Verde oliva', hex: '#6b7a3a', neutro: true },
  { id: 'dorado', n: 'Dorado', hex: '#c9a43b', neutro: true },
  { id: 'plateado', n: 'Plateado', hex: '#c0c4c8', neutro: true },
  { id: 'azul', n: 'Azul', hex: '#2f6fd6', h: 220 },
  { id: 'celeste', n: 'Celeste', hex: '#9fd3f2', h: 200 },
  { id: 'verde', n: 'Verde', hex: '#3fa35b', h: 130 },
  { id: 'amarillo', n: 'Amarillo', hex: '#f5d33a', h: 50 },
  { id: 'naranja', n: 'Naranja', hex: '#f08a2c', h: 28 },
  { id: 'rojo', n: 'Rojo', hex: '#d62f2f', h: 0 },
  { id: 'vino', n: 'Vino', hex: '#7a1f33', h: 345 },
  { id: 'rosado', n: 'Rosado', hex: '#f4a6c1', h: 335 },
  { id: 'fucsia', n: 'Fucsia', hex: '#e0218a', h: 325 },
  { id: 'lila', n: 'Lila', hex: '#c3a6e0', h: 275 },
  { id: 'morado', n: 'Morado', hex: '#6a2c91', h: 280 },
  { id: 'estampado', n: 'Estampado', hex: '', estampado: true }
];

CJ.DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
CJ.DIAS_N = { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' };
CJ.MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

CJ.cat = function (id) { for (var i = 0; i < CJ.CATS.length; i++) if (CJ.CATS[i].id === id) return CJ.CATS[i]; return CJ.CATS[0]; };
CJ.ocas = function (id) { for (var i = 0; i < CJ.OCAS.length; i++) if (CJ.OCAS[i].id === id) return CJ.OCAS[i]; return null; };
CJ.color = function (id) { for (var i = 0; i < CJ.COLORES.length; i++) if (CJ.COLORES[i].id === id) return CJ.COLORES[i]; return null; };

/* ---------- Utilidades ---------- */
CJ.$ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
CJ.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

CJ.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

CJ.nuevoId = function (prefijo) {
  return (prefijo || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

CJ.dormir = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

/* Fechas: siempre en hora local con claves AAAA-MM-DD (Safari 12 interpreta mal new Date('2026-10-18')) */
CJ.dos = function (n) { return (n < 10 ? '0' : '') + n; };
CJ.claveFecha = function (d) { d = d || new Date(); return d.getFullYear() + '-' + CJ.dos(d.getMonth() + 1) + '-' + CJ.dos(d.getDate()); };
CJ.hoy = function () { return CJ.claveFecha(new Date()); };
CJ.aFecha = function (clave) { var p = clave.split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); };
CJ.sumarDias = function (clave, n) { var d = CJ.aFecha(clave); d.setDate(d.getDate() + n); return CJ.claveFecha(d); };
CJ.diasEntre = function (a, b) { return Math.round((CJ.aFecha(b) - CJ.aFecha(a)) / 86400000); };
CJ.diaSemana = function (clave) { var w = CJ.aFecha(clave).getDay(); return CJ.DIAS[(w + 6) % 7]; };
CJ.fechaLarga = function (clave) {
  var d = CJ.aFecha(clave);
  return CJ.DIAS_N[CJ.diaSemana(clave)] + ' ' + d.getDate() + ' de ' + CJ.MESES[d.getMonth()];
};
CJ.haceTxt = function (clave) {
  if (!clave) return 'nunca';
  var n = CJ.diasEntre(clave, CJ.hoy());
  if (n <= 0) return 'hoy';
  if (n === 1) return 'ayer';
  if (n < 30) return 'hace ' + n + ' días';
  if (n < 60) return 'hace 1 mes';
  return 'hace ' + Math.floor(n / 30) + ' meses';
};

CJ.mezclar = function (arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
};
CJ.azar = function (arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; };
CJ.copiar = function (o) { return JSON.parse(JSON.stringify(o)); };

/* ---------- Ajustes (solo localStorage) ---------- */
CJ.AJUSTES_DEF = {
  evitarDias: 7,
  ocasionArmar: 'todas',
  semanaOcas: { lunes: 'trabajo', martes: 'trabajo', miercoles: 'trabajo', jueves: 'trabajo', viernes: 'trabajo', sabado: 'casual', domingo: 'casual' },
  claveClaude: '',
  nube: { owner: '', repo: '', token: '', rama: 'main' }
};
CJ.ajustes = (function () {
  var a = CJ.copiar(CJ.AJUSTES_DEF);
  try {
    var g = JSON.parse(localStorage.getItem('cj_ajustes') || '{}');
    for (var k in g) if (g.hasOwnProperty(k)) a[k] = g[k];
  } catch (e) { /* ajustes dañados: usar los de fábrica */ }
  return a;
})();
CJ.guardarAjustes = function () {
  try { localStorage.setItem('cj_ajustes', JSON.stringify(CJ.ajustes)); } catch (e) { CJ.toast('No se pudieron guardar los ajustes', 'error'); }
};

/* ---------- Toasts ---------- */
CJ.toast = function (msg, tipo, ms) {
  var cont = document.getElementById('toasts');
  var t = document.createElement('div');
  t.className = 'toast ' + (tipo || '');
  t.textContent = msg;
  var envoltura = document.createElement('div');
  envoltura.appendChild(t);
  cont.appendChild(envoltura);
  setTimeout(function () { t.style.opacity = '0'; }, ms || 2600);
  setTimeout(function () { if (envoltura.parentNode) envoltura.parentNode.removeChild(envoltura); }, (ms || 2600) + 400);
};

CJ.fallo = function (err) {
  var msg = err && err.message ? err.message : String(err);
  if (window.console) console.error(err);
  CJ.toast('😿 ' + msg, 'error', 5000);
};

/* ---------- Modales ---------- */
CJ.modales = [];
CJ.modal = function (html, opts) {
  opts = opts || {};
  var velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = '<div class="modal">' + (opts.sinCerrar ? '' : '<button class="modal-cerrar" data-cerrar="1">✕</button>') + html + '</div>';
  document.body.appendChild(velo);
  var m = {
    el: velo.firstChild,
    cerrar: function (valor) {
      if (velo.parentNode) velo.parentNode.removeChild(velo);
      var i = CJ.modales.indexOf(m); if (i >= 0) CJ.modales.splice(i, 1);
      if (opts.alCerrar) opts.alCerrar(valor);
    }
  };
  velo.addEventListener('click', function (e) {
    if (e.target === velo && !opts.sinCerrar) m.cerrar();
    var c = e.target.closest ? e.target.closest('[data-cerrar]') : null;
    if (c) m.cerrar();
  });
  CJ.modales.push(m);
  CJ.hidratar(m.el);
  return m;
};
CJ.cerrarModales = function () { while (CJ.modales.length) CJ.modales[CJ.modales.length - 1].cerrar(); };

CJ.confirmar = function (titulo, texto, si, no) {
  return new Promise(function (resolver) {
    var hecho = false;
    var m = CJ.modal(
      '<h2>' + CJ.esc(titulo) + '</h2>' + (texto ? '<p>' + CJ.esc(texto) + '</p>' : '') +
      '<div class="fila-btns"><button class="btn btn-pri" data-r="1">' + CJ.esc(si || 'Sí') + '</button>' +
      '<button class="btn" data-r="0">' + CJ.esc(no || 'Cancelar') + '</button></div>',
      { alCerrar: function () { if (!hecho) resolver(false); } });
    CJ.$$('[data-r]', m.el).forEach(function (b) {
      b.addEventListener('click', function () { hecho = true; resolver(b.getAttribute('data-r') === '1'); m.cerrar(); });
    });
  });
};

CJ.cargando = function (texto) {
  var m = CJ.modal('<div class="cargando"><div class="giro">✨</div><h2 class="mt cargando-txt" style="padding:0">' + CJ.esc(texto || 'Un momento…') + '</h2></div>', { sinCerrar: true });
  return {
    texto: function (t) { var e = CJ.$('.cargando-txt', m.el); if (e) e.textContent = t; },
    cerrar: function () { m.cerrar(); }
  };
};

/* Elegir archivos con el input oculto. Devuelve una promesa con la lista de archivos. */
CJ.elegirArchivos = function (opts) {
  opts = opts || {};
  return new Promise(function (resolver) {
    var viejo = document.getElementById('archivo-oculto');
    var inp = viejo.cloneNode(false);
    viejo.parentNode.replaceChild(inp, viejo);
    if (opts.accept) inp.setAttribute('accept', opts.accept); else inp.removeAttribute('accept');
    if (opts.multiple) inp.setAttribute('multiple', 'multiple'); else inp.removeAttribute('multiple');
    inp.addEventListener('change', function () {
      resolver(Array.prototype.slice.call(inp.files || []));
    });
    inp.click();
  });
};

/* HTML de chips seleccionables */
CJ.chipsHtml = function (items, seleccion, grupo, multiple) {
  var sel = Array.isArray(seleccion) ? seleccion : [seleccion];
  return '<div class="chips" data-grupo="' + grupo + '"' + (multiple ? ' data-multi="1"' : '') + '>' + items.map(function (it) {
    return '<button class="chip' + (sel.indexOf(it.id) >= 0 ? ' on' : '') + '" data-val="' + CJ.esc(it.id) + '">' +
      (it.hex !== undefined ? '<span class="bolita" style="background:' + (it.hex || 'linear-gradient(45deg,#f4a6c1,#9fd3f2,#f5d33a)') + '"></span>' : '') +
      (it.emoji ? it.emoji + ' ' : '') + CJ.esc(it.nombre || it.n) + '</button>';
  }).join('') + '</div>';
};
/* Activa los chips dentro de un contenedor; onCambio recibe (grupo, valores) */
CJ.activarChips = function (cont, onCambio) {
  CJ.$$('.chips[data-grupo]', cont).forEach(function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      if (g.getAttribute('data-multi')) b.classList.toggle('on');
      else { CJ.$$('.chip', g).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); }
      if (onCambio) onCambio(g.getAttribute('data-grupo'), CJ.valoresChips(g));
    });
  });
};
CJ.valoresChips = function (g) {
  return CJ.$$('.chip.on', g).map(function (b) { return b.getAttribute('data-val'); });
};

/* Imágenes: el HTML lleva data-f="idFoto" y luego se rellena el src desde la caché (evita cadenas gigantes). */
CJ.PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
CJ.imgHtml = function (fotoId, clase, extra) {
  return '<img class="' + (clase || '') + '" data-f="' + CJ.esc(fotoId || '') + '" src="' + CJ.PIXEL + '"' + (extra || '') + '>';
};
CJ.hidratar = function (cont) {
  CJ.$$('img[data-f]', cont).forEach(function (img) {
    var id = img.getAttribute('data-f');
    if (!id) return;
    var src = CJ.mini ? CJ.mini(id) : null;
    if (src) img.src = src;
    else if (CJ.cargarFoto) CJ.cargarFoto(id).then(function (d) { if (d) img.src = d; });
  });
};
