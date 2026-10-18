/* Muñeca (avatar) estilo Clueless: cuerpo en SVG con la cara de Juliette y las prendas encima. */
CJ.muneca = function (piezas, opts) {
  opts = opts || {};
  piezas = piezas || CJ.piezasVacias();
  var perfil = CJ.datos.perfil || {};
  var piel = perfil.piel || '#e8b897';
  var conCara = !!(perfil.cara && CJ.mini(perfil.cara));
  var h = '<div class="muneca' + (opts.sinCuerpo ? ' sin-cuerpo' : '') + (opts.sombra ? ' sombra' : '') + '">';
  if (!opts.sinCuerpo) {
    h += '<svg class="m-cuerpo" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg">' +
      '<g fill="' + piel + '" stroke="rgba(0,0,0,.14)" stroke-width="0.6">' +
      '<ellipse cx="50" cy="17" rx="10" ry="12"/>' +
      '<rect x="46" y="27" width="8" height="9" rx="2"/>' +
      '<path d="M34 35 Q50 31 66 35 L69 58 Q65 72 67 86 L33 86 Q35 72 31 58 Z"/>' +
      '<path d="M34 36 Q27 38 26 52 L23 90 Q23 94 26 94 Q28 94 28 90 L32 58 Z"/>' +
      '<path d="M66 36 Q73 38 74 52 L77 90 Q77 94 74 94 Q72 94 72 90 L68 58 Z"/>' +
      '<path d="M34 84 L49 84 L47 168 Q47 172 43.5 172 Q40 172 40 168 Z"/>' +
      '<path d="M51 84 L66 84 L60 168 Q60 172 56.5 172 Q53 172 53 168 Z"/>' +
      '<ellipse cx="43.5" cy="175" rx="5" ry="3"/><ellipse cx="56.5" cy="175" rx="5" ry="3"/>' +
      '</g>' +
      (conCara ? '' :
        '<path d="M39 16 Q39 3 50 3 Q61 3 61 16 Q62 30 67 35 Q58 31 58 19 Q50 13 42 19 Q42 31 33 35 Q38 30 39 16 Z" fill="#4a2c20"/>' +
        '<circle cx="46" cy="18" r="1.1" fill="#3a2140"/><circle cx="54" cy="18" r="1.1" fill="#3a2140"/>' +
        '<path d="M46.5 23 Q50 25.5 53.5 23" stroke="#c2456f" stroke-width="1" fill="none"/>') +
      '</svg>';
    if (conCara) h += CJ.imgHtml(perfil.cara, 'm-cara' + (perfil.caraRecortada ? '' : ' redonda'));
  }
  if (piezas.vestido) h += CJ.imgHtml(CJ.fotoDe(piezas.vestido), 'm-vestido');
  else {
    if (piezas.abajo) h += CJ.imgHtml(CJ.fotoDe(piezas.abajo), 'm-abajo');
    if (piezas.arriba) h += CJ.imgHtml(CJ.fotoDe(piezas.arriba), 'm-arriba');
  }
  if (piezas.zapatos) h += CJ.imgHtml(CJ.fotoDe(piezas.zapatos), 'm-zapatos');
  var acc = (piezas.acc || []).filter(function (id) { return CJ.prenda(id); });
  if (acc[0]) h += CJ.imgHtml(CJ.fotoDe(acc[0]), 'm-acc');
  if (acc[1]) h += CJ.imgHtml(CJ.fotoDe(acc[1]), 'm-acc2');
  return h + '</div>';
};

CJ.fotoDe = function (prendaId) { var p = CJ.prenda(prendaId); return p ? p.foto : ''; };

/* Muñeca dentro de un escenario rosado */
CJ.escenario = function (piezas, clase) {
  return '<div class="escenario ' + (clase || '') + '">' + CJ.muneca(piezas, { sombra: true }) + '</div>';
};

/* Tarjeta compacta de outfit (sin cuerpo) */
CJ.tarjetaOutfit = function (piezas, nombre, extra) {
  return '<div class="outfit-tarjeta">' + CJ.muneca(piezas, { sinCuerpo: true }) +
    (nombre ? '<div class="nombre">' + CJ.esc(nombre) + '</div>' : '') + (extra || '') + '</div>';
};
