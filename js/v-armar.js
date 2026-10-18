/* Armador estilo Clueless: carriles que se cambian con swipe o flechas, candados,
   "Sorpréndeme" por ocasión e ideas alrededor de una prenda base. */
(function () {
  var est = { modo: 'separado', piezas: CJ.piezasVacias(), candados: {}, ideas: [], base: null };
  var NOMBRES = { arriba: 'Arriba', abajo: 'Abajo', vestido: 'Vestido', zapatos: 'Zapatos', acc: 'Accesorio' };
  var contenedor = null;

  function carriles() { return est.modo === 'vestido' ? ['vestido', 'zapatos', 'acc'] : ['arriba', 'abajo', 'zapatos', 'acc']; }
  function ocas() { return CJ.ajustes.ocasionArmar || 'todas'; }
  function actual(c) { return c === 'acc' ? (est.piezas.acc[0] || null) : est.piezas[c]; }
  function poner(c, id) { if (c === 'acc') est.piezas.acc = id ? [id] : []; else est.piezas[c] = id; }

  function piezasVisibles() {
    var p = CJ.copiar(est.piezas);
    if (est.modo === 'vestido') { p.arriba = null; p.abajo = null; } else p.vestido = null;
    return p;
  }

  /* Si un carril está vacío se llena con la primera opción disponible */
  function completar() {
    carriles().forEach(function (c) {
      if (c === 'acc') return;
      if (!actual(c) || !CJ.prenda(actual(c))) {
        var ops = CJ.motor.opciones(c, ocas());
        poner(c, ops.length ? ops[0].id : null);
      }
    });
  }

  function htmlVentana(c) {
    var id = actual(c);
    var p = CJ.prenda(id);
    if (!p) return '<div class="vacio">' + (c === 'acc' ? 'Sin accesorio · desliza para elegir' : 'No hay ' + NOMBRES[c].toLowerCase() + ' en el clóset') + '</div>';
    return CJ.imgHtml(p.foto);
  }

  function htmlInfo(c) {
    var id = actual(c);
    if (!CJ.prenda(id)) return '';
    var a = CJ.motor.avisoUso(id);
    var p = CJ.prenda(id);
    return '<span class="carril-info' + (a.alerta ? ' alerta' : '') + '">' + CJ.esc((p.marca ? p.marca + ' · ' : '') + a.txt) + '</span>';
  }

  function htmlCarril(c) {
    return '<div class="carril carril-' + c + '" data-carril="' + c + '">' +
      '<button class="flecha" data-acc="carril-mover" data-c="' + c + '" data-d="-1">◀</button>' +
      '<div class="ventana" data-c="' + c + '">' + htmlVentana(c) + '</div>' +
      '<button class="flecha" data-acc="carril-mover" data-c="' + c + '" data-d="1">▶</button>' +
      '<span class="carril-titulo">' + NOMBRES[c] + '</span>' +
      '<button class="candado' + (est.candados[c] ? ' on' : '') + '" data-acc="carril-candado" data-c="' + c + '">' + (est.candados[c] ? '🔒' : '🔓') + '</button>' +
      '<span class="info-hueco">' + htmlInfo(c) + '</span></div>';
  }

  function avisoCombo() {
    var u = CJ.lookUsado(piezasVisibles());
    if (!u) return '';
    var d = CJ.diasEntre(u, CJ.hoy());
    return '<div class="aviso">⚠️ Ya usaste esta combinación ' + CJ.esc(CJ.haceTxt(u)) + (d < 14 ? '. ¿La cambiamos?' : '.') + '</div>';
  }

  function render(cont, params) {
    contenedor = cont;
    params = params || {};
    if (params.piezas) {
      est.piezas = CJ.copiar(params.piezas);
      if (!est.piezas.acc) est.piezas.acc = [];
      est.modo = est.piezas.vestido ? 'vestido' : 'separado';
      est.candados = {}; est.ideas = []; est.base = null;
    }
    if (params.base && CJ.prenda(params.base)) {
      var carril = CJ.cat(CJ.prenda(params.base).cat).carril;
      est.base = params.base;
      est.candados = {};
      est.candados[carril] = true;
      if (carril === 'vestido') est.modo = 'vestido';
      else if (carril !== 'zapatos' && carril !== 'acc') est.modo = 'separado';
      poner(carril, params.base);
      est.ideas = CJ.motor.ideasCon(params.base, ocas(), 6);
    }
    completar();

    var h = '<div style="overflow:hidden"><h1 style="float:left">Armar outfit</h1></div>';
    h += CJ.chipsHtml([{ id: 'todas', nombre: 'Todas' }].concat(CJ.OCAS), ocas(), 'ocas');
    h += CJ.chipsHtml([{ id: 'separado', nombre: '👚 + 👖 Top y abajo' }, { id: 'vestido', nombre: '👗 Vestido' }], est.modo, 'modo');
    h += '<div class="armador">' + carriles().map(htmlCarril).join('') + '</div>';
    h += '<div class="aviso-combo">' + avisoCombo() + '</div>';
    h += '<div class="fila-btns">' +
      '<button class="btn btn-ama" data-acc="armar-sorpresa">✨ Sorpréndeme</button>' +
      '<button class="btn btn-pri" data-acc="armar-fav">❤️ Guardar</button>' +
      '<button class="btn btn-verde" data-acc="armar-hoy">✅ Me lo pongo hoy</button>' +
      '<button class="btn" data-acc="armar-plan">📅 Planear</button>' +
      '<button class="btn" data-acc="armar-ver">👩 Verlo en mí</button>' +
      '<button class="btn btn-lila" data-acc="armar-ideas">💡 Ideas con 🔒</button></div>';
    if (est.ideas.length) {
      var base = CJ.prenda(est.base);
      h += '<div class="tarjeta-caja mt"><h3>💡 Ideas' + (base ? ' con ' + CJ.esc(CJ.nombrePrenda(base)) : '') + '</h3><div class="rejilla tres">' +
        est.ideas.map(function (p, i) {
          return '<div class="celda" data-acc="armar-idea" data-i="' + i + '">' + CJ.tarjetaOutfit(p) + '</div>';
        }).join('') + '</div></div>';
    }
    cont.innerHTML = h;
    CJ.activarChips(cont, function (g, v) {
      if (g === 'ocas') { CJ.ajustes.ocasionArmar = v[0]; CJ.guardarAjustes(); if (est.base) est.ideas = CJ.motor.ideasCon(est.base, ocas(), 6); }
      if (g === 'modo') est.modo = v[0];
      render(cont); CJ.hidratar(cont);
    });
  }

  function refrescarCarril(c, dir) {
    var fila = CJ.$('.carril-' + c, contenedor);
    if (!fila) return;
    var v = CJ.$('.ventana', fila);
    v.innerHTML = htmlVentana(c);
    CJ.hidratar(v);
    CJ.$('.info-hueco', fila).innerHTML = htmlInfo(c);
    CJ.$('.aviso-combo', contenedor).innerHTML = avisoCombo();
    var img = CJ.$('img', v);
    if (img && dir) {
      img.style.webkitTransition = 'none'; img.style.transition = 'none';
      img.style.webkitTransform = img.style.transform = 'translateX(' + (dir > 0 ? 60 : -60) + '%)';
      img.style.opacity = '0';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          img.style.webkitTransition = ''; img.style.transition = '';
          img.style.webkitTransform = img.style.transform = 'translateX(0)';
          img.style.opacity = '1';
        });
      });
    }
  }

  function mover(c, d) {
    var ops = CJ.motor.opciones(c, ocas()).map(function (p) { return p.id; });
    if (c === 'acc') ops.unshift(null);
    if (!ops.length) return;
    var i = ops.indexOf(actual(c));
    var n = ((i < 0 ? 0 : i + d) % ops.length + ops.length) % ops.length;
    poner(c, ops[n]);
    refrescarCarril(c, d);
  }

  CJ.vistas.armar = {
    render: render,
    alMostrar: function (cont) {
      if (cont.getAttribute('data-touch')) return;
      cont.setAttribute('data-touch', '1');
      var x0 = 0, y0 = 0, carril = null;
      cont.addEventListener('touchstart', function (e) {
        var v = e.target.closest('.ventana');
        carril = v ? v.getAttribute('data-c') : null;
        if (!carril) return;
        x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
      }, false);
      cont.addEventListener('touchend', function (e) {
        if (!carril) return;
        var t = e.changedTouches[0];
        var dx = t.clientX - x0, dy = t.clientY - y0;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) mover(carril, dx < 0 ? 1 : -1);
        carril = null;
      }, false);
    }
  };

  CJ.acc['carril-mover'] = function (el) { mover(el.getAttribute('data-c'), +el.getAttribute('data-d')); };
  CJ.acc['carril-candado'] = function (el) {
    var c = el.getAttribute('data-c');
    est.candados[c] = !est.candados[c];
    el.className = 'candado' + (est.candados[c] ? ' on' : '');
    el.textContent = est.candados[c] ? '🔒' : '🔓';
  };

  CJ.acc['armar-sorpresa'] = function () {
    var fijas = {};
    carriles().forEach(function (c) {
      if (!est.candados[c]) return;
      if (c === 'acc') fijas.acc = est.piezas.acc.slice(); else fijas[c] = est.piezas[c];
    });
    var p = CJ.motor.sorprendeme(ocas(), fijas);
    if (!p) { CJ.toast('Necesitas más prendas para esa ocasión'); return; }
    if (!fijas.vestido && !fijas.arriba && !fijas.abajo) est.modo = p.vestido ? 'vestido' : 'separado';
    var previo = est.piezas;
    est.piezas = p;
    /* Se conservan las prendas del otro modo para poder volver */
    if (!p.arriba) p.arriba = previo.arriba;
    if (!p.abajo) p.abajo = previo.abajo;
    if (!p.vestido) p.vestido = previo.vestido;
    render(contenedor); CJ.hidratar(contenedor);
  };

  CJ.acc['armar-ideas'] = function () {
    var c = carriles().filter(function (x) { return est.candados[x] && actual(x); })[0];
    if (!c) { CJ.toast('Pon el 🔒 a la prenda base y vuelve a tocar Ideas'); return; }
    est.base = actual(c);
    est.ideas = CJ.motor.ideasCon(est.base, ocas(), 6);
    if (!est.ideas.length) CJ.toast('No encontré combinaciones; agrega más prendas');
    render(contenedor); CJ.hidratar(contenedor);
  };

  CJ.acc['armar-idea'] = function (el) {
    var p = est.ideas[+el.getAttribute('data-i')];
    if (!p) return;
    est.modo = p.vestido ? 'vestido' : 'separado';
    var previo = est.piezas;
    est.piezas = CJ.copiar(p);
    if (!est.piezas.arriba) est.piezas.arriba = previo.arriba;
    if (!est.piezas.abajo) est.piezas.abajo = previo.abajo;
    render(contenedor); CJ.hidratar(contenedor);
    document.getElementById('principal').scrollTop = 0;
  };

  function hayAlgo() {
    if (!CJ.idsDe(piezasVisibles()).length) { CJ.toast('Primero elige prendas'); return false; }
    return true;
  }

  CJ.acc['armar-fav'] = function () {
    if (!hayAlgo()) return;
    CJ.guardarFavorito(piezasVisibles(), ocas() === 'todas' ? null : ocas());
  };

  CJ.guardarFavorito = function (piezas, ocasion, nombreSugerido) {
    var m = CJ.modal('<h2>❤️ Guardar outfit favorito</h2><div class="campo"><label>Nombre</label>' +
      '<input class="entrada" id="f-fav" value="' + CJ.esc(nombreSugerido || '') + '" placeholder="Ej: Lunes poderoso"></div>' +
      '<div class="fila-btns"><button class="btn btn-pri" data-x="ok">Guardar</button><button class="btn" data-cerrar="1">Cancelar</button></div>');
    CJ.$('[data-x="ok"]', m.el).addEventListener('click', function () {
      var id = CJ.nuevoId('o');
      var nombre = CJ.$('#f-fav', m.el).value.trim() || ('Outfit ' + (Object.keys(CJ.datos.outfits).length + 1));
      CJ.datos.outfits[id] = CJ.tocar({ id: id, nombre: nombre, piezas: CJ.copiar(piezas), ocas: ocasion || null });
      CJ.guardar();
      m.cerrar();
      CJ.toast('Guardado en favoritos 💖', 'ok');
    });
  };

  CJ.acc['armar-hoy'] = function () {
    if (!hayAlgo()) return;
    CJ.registrarLook(CJ.hoy(), piezasVisibles(), { ocas: ocas() === 'todas' ? null : ocas() });
    CJ.toast('¡Registrado en el calendario de hoy! ✅', 'ok');
    render(contenedor); CJ.hidratar(contenedor);
  };

  CJ.acc['armar-plan'] = function () {
    if (!hayAlgo()) return;
    CJ.planearEnDia(piezasVisibles(), ocas() === 'todas' ? null : ocas());
  };

  CJ.planearEnDia = function (piezas, ocasion) {
    var hoyDia = CJ.diaSemana(CJ.hoy());
    var m = CJ.modal('<h2>📅 ¿Para qué día?</h2><div class="chips">' + CJ.DIAS.map(function (d) {
      return '<button class="chip' + (d === hoyDia ? ' on' : '') + '" data-dia="' + d + '">' + CJ.DIAS_N[d] + '</button>';
    }).join('') + '</div>');
    m.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dia]');
      if (!b) return;
      var d = b.getAttribute('data-dia');
      CJ.datos.semana[d] = CJ.tocar({ dia: d, piezas: CJ.copiar(piezas), ocas: ocasion || (CJ.ajustes.semanaOcas || {})[d] || null });
      delete CJ.datos.borrados['semana:' + d];
      CJ.guardar();
      m.cerrar();
      CJ.toast('Planeado para el ' + CJ.DIAS_N[d].toLowerCase() + ' 📅', 'ok');
    });
  };

  CJ.acc['armar-ver'] = function () {
    CJ.modal('<h2>👩 Así se te ve</h2>' + CJ.escenario(piezasVisibles(), 'medio'));
  };

  CJ.acc['armar-con'] = function (el) { CJ.ir('armar', { base: el.getAttribute('data-id') }); };
})();
