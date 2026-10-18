/* Menú "Más", favoritos, plan de la semana, estadísticas de uso y avatar. */
(function () {
  function volver() { return '<button class="btn btn-peq" data-acc="ir" data-v="mas">◀ Más</button>'; }

  /* ---------- Menú ---------- */
  CJ.vistas.mas = {
    render: function (cont) {
      var b = function (v, ico, txt, sub) {
        return '<button class="btn-grande" data-acc="ir" data-v="' + v + '"><span class="ico">' + ico + '</span><span class="txt">' + txt + '<span class="sub">' + sub + '</span></span></button>';
      };
      cont.innerHTML = '<h1>Más opciones</h1><div class="menu-mas">' +
        b('estilista', '💅', 'Pídele a Claude', 'Outfits para el trabajo, el gym…') +
        b('favoritos', '❤️', 'Favoritos', Object.keys(CJ.datos.outfits).length + ' outfits guardados') +
        b('semana', '🗓️', 'Mi semana', 'Plan de lunes a domingo') +
        b('estadisticas', '📊', 'Estadísticas', 'Cuántas veces usé cada prenda') +
        b('avatar', '👩', 'Mi avatar', 'Cara y tono de piel') +
        b('ajustes', '⚙️', 'Ajustes', 'Nube, Claude y respaldo') +
        '</div>';
    }
  };

  /* ---------- Favoritos ---------- */
  function listaFavs() {
    return Object.keys(CJ.datos.outfits).map(function (k) { return CJ.datos.outfits[k]; })
      .sort(function (a, b) { return (b.act || 0) - (a.act || 0); });
  }

  CJ.vistas.favoritos = {
    render: function (cont) {
      var favs = listaFavs();
      var h = volver() + '<h1 class="mt">❤️ Favoritos</h1>';
      if (!favs.length) h += '<p class="suave">Aún no guardas outfits. En “Armar”, toca ❤️ Guardar.</p>';
      h += '<div class="rejilla tres">' + favs.map(function (o) {
        var u = CJ.lookUsado(o.piezas);
        return '<div class="celda" data-acc="fav-abrir" data-id="' + o.id + '">' +
          CJ.tarjetaOutfit(o.piezas, o.nombre, '<div class="porque centro">' + (o.ocas ? CJ.ocas(o.ocas).emoji + ' ' : '') + 'Usado ' + CJ.esc(CJ.haceTxt(u)) + '</div>') + '</div>';
      }).join('') + '</div>';
      cont.innerHTML = h;
    }
  };

  CJ.acc['fav-abrir'] = function (el) {
    var o = CJ.datos.outfits[el.getAttribute('data-id')];
    if (!o) return;
    var m = CJ.modal('<h2>' + CJ.esc(o.nombre) + '</h2><div class="detalle-cols"><div class="detalle-img">' + CJ.escenario(o.piezas, 'medio') + '</div><div class="detalle-datos">' +
      '<button class="btn btn-verde btn-ancho" data-x="hoy">✅ Me lo pongo hoy</button>' +
      '<button class="btn btn-ancho" data-x="plan">📅 Planear un día</button>' +
      '<button class="btn btn-ama btn-ancho" data-x="armar">✨ Abrir en Armar</button>' +
      '<button class="btn btn-rojo btn-ancho" data-x="borrar">🗑️ Eliminar</button></div></div>');
    m.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]');
      if (!b) return;
      var x = b.getAttribute('data-x');
      if (x === 'hoy') { CJ.registrarLook(CJ.hoy(), CJ.copiar(o.piezas), { ocas: o.ocas }); m.cerrar(); CJ.toast('¡Registrado hoy! ✅', 'ok'); CJ.refrescar(); }
      if (x === 'plan') { m.cerrar(); CJ.planearEnDia(o.piezas, o.ocas); }
      if (x === 'armar') { m.cerrar(); CJ.ir('armar', { piezas: o.piezas }); }
      if (x === 'borrar') CJ.confirmar('¿Eliminar “' + o.nombre + '”?', '', 'Eliminar').then(function (si) {
        if (si) { CJ.borrar('outfits', o.id); m.cerrar(); CJ.refrescar(); }
      });
    });
  };

  CJ.elegirFavorito = function () {
    return new Promise(function (resolver) {
      var favs = listaFavs(), hecho = false;
      if (!favs.length) { CJ.toast('Aún no tienes favoritos'); resolver(null); return; }
      var m = CJ.modal('<h2>❤️ Elige un favorito</h2><div class="rejilla tres">' + favs.map(function (o) {
        return '<div class="celda" data-fav="' + o.id + '">' + CJ.tarjetaOutfit(o.piezas, o.nombre) + '</div>';
      }).join('') + '</div>', { alCerrar: function () { if (!hecho) resolver(null); } });
      m.el.addEventListener('click', function (e) {
        var c = e.target.closest('[data-fav]');
        if (!c) return;
        hecho = true;
        resolver(CJ.datos.outfits[c.getAttribute('data-fav')]);
        m.cerrar();
      });
    });
  };

  /* ---------- Semana ---------- */
  CJ.vistas.semana = {
    render: function (cont) {
      var hoyDia = CJ.diaSemana(CJ.hoy());
      var h = volver() + '<h1 class="mt">🗓️ Mi semana</h1>' +
        '<div class="fila-btns"><button class="btn btn-ama" data-acc="semana-auto">✨ Armar semana automática</button>' +
        '<button class="btn btn-lila" data-acc="ir" data-v="estilista">💅 Pedírsela a Claude</button></div>';
      CJ.DIAS.forEach(function (d) {
        var plan = CJ.datos.semana[d];
        var ocas = (plan && plan.ocas) || (CJ.ajustes.semanaOcas || {})[d] || 'casual';
        var o = CJ.ocas(ocas);
        var tiene = plan && plan.piezas && CJ.idsDe(plan.piezas).length;
        h += '<div class="semana-fila' + (d === hoyDia ? ' hoy' : '') + '"><div class="semana-dia">' + CJ.DIAS_N[d] +
          '<div class="peq" style="font-family:inherit" data-acc="semana-ocas" data-dia="' + d + '">' + (o ? o.emoji + ' ' + o.nombre : '') + ' ✎</div></div>' +
          '<div class="semana-mini">' + (tiene ? CJ.muneca(plan.piezas, { sinCuerpo: true }) : '<div class="suave peq">—</div>') + '</div>' +
          '<div class="semana-acc">' +
          '<button class="btn btn-peq" data-acc="semana-sorpresa" data-dia="' + d + '">✨</button>' +
          '<button class="btn btn-peq" data-acc="semana-fav" data-dia="' + d + '">❤️</button>' +
          (tiene ? '<button class="btn btn-peq" data-acc="semana-armar" data-dia="' + d + '">✏️</button><button class="btn btn-peq" data-acc="semana-quitar" data-dia="' + d + '">🗑️</button>' : '') +
          '</div></div>';
      });
      h += '<p class="peq suave">Toca la ocasión de cada día (✎) para cambiarla. El plan se repite cada semana hasta que lo cambies.</p>';
      cont.innerHTML = h;
    }
  };

  function planear(d, piezas, ocas) {
    CJ.datos.semana[d] = CJ.tocar({ dia: d, piezas: piezas, ocas: ocas || (CJ.ajustes.semanaOcas || {})[d] });
    delete CJ.datos.borrados['semana:' + d];
    CJ.guardar();
    CJ.refrescar();
  }

  CJ.acc['semana-auto'] = function () {
    CJ.confirmar('¿Armar toda la semana?', 'Reemplaza el plan actual con outfits que no repiten prendas.', 'Sí, ármala').then(function (si) {
      if (!si) return;
      var plan = CJ.motor.armarSemana();
      CJ.DIAS.forEach(function (d) { if (plan[d]) CJ.datos.semana[d] = CJ.tocar({ dia: d, piezas: plan[d].piezas, ocas: plan[d].ocas }); });
      CJ.guardar();
      CJ.toast('¡Semana lista! 🗓️', 'ok');
      CJ.refrescar();
    });
  };
  CJ.acc['semana-sorpresa'] = function (el) {
    var d = el.getAttribute('data-dia');
    var ocas = (CJ.datos.semana[d] && CJ.datos.semana[d].ocas) || (CJ.ajustes.semanaOcas || {})[d];
    var p = CJ.motor.sorprendeme(ocas);
    if (p) planear(d, p, ocas); else CJ.toast('Necesitas prendas en el clóset');
  };
  CJ.acc['semana-fav'] = function (el) {
    var d = el.getAttribute('data-dia');
    CJ.elegirFavorito().then(function (o) { if (o) planear(d, CJ.copiar(o.piezas), o.ocas); });
  };
  CJ.acc['semana-armar'] = function (el) { CJ.ir('armar', { piezas: CJ.datos.semana[el.getAttribute('data-dia')].piezas }); };
  CJ.acc['semana-quitar'] = function (el) { CJ.borrar('semana', el.getAttribute('data-dia')); CJ.refrescar(); };
  CJ.acc['semana-ocas'] = function (el) {
    var d = el.getAttribute('data-dia');
    var m = CJ.modal('<h2>Ocasión del ' + CJ.DIAS_N[d].toLowerCase() + '</h2>' + CJ.chipsHtml(CJ.OCAS, (CJ.ajustes.semanaOcas || {})[d], 'ocas'));
    CJ.activarChips(m.el, function (g, v) {
      CJ.ajustes.semanaOcas[d] = v[0];
      CJ.guardarAjustes();
      if (CJ.datos.semana[d]) { CJ.datos.semana[d].ocas = v[0]; CJ.tocar(CJ.datos.semana[d]); CJ.guardar(); }
      m.cerrar();
      CJ.refrescar();
    });
  };

  /* ---------- Estadísticas ---------- */
  var estE = { periodo: '90', cat: 'todo', orden: 'mas' };
  CJ.vistas.estadisticas = {
    render: function (cont) {
      var hoy = CJ.hoy();
      var desde = estE.periodo === 'todo' ? '0000-00-00' : CJ.sumarDias(hoy, -(+estE.periodo));
      var lista = CJ.listaPrendas({ cat: estE.cat }).map(function (p) {
        return { p: p, n: CJ.usosEnRango(p.id, desde, hoy), u: CJ.uso(p.id) };
      });
      lista.sort(estE.orden === 'mas' ? function (a, b) { return b.n - a.n; } : function (a, b) { return a.n - b.n || String(a.u.ultima || '').localeCompare(String(b.u.ultima || '')); });
      var max = lista.reduce(function (m, x) { return Math.max(m, x.n); }, 1);
      var usadas = lista.filter(function (x) { return x.n > 0; }).length;
      var diasReg = Object.keys(CJ.datos.dias).filter(function (f) { return f >= desde && f <= hoy; }).length;

      var h = volver() + '<h1 class="mt">📊 Estadísticas</h1>';
      h += CJ.chipsHtml([{ id: '30', nombre: '30 días' }, { id: '90', nombre: '3 meses' }, { id: '365', nombre: '1 año' }, { id: 'todo', nombre: 'Siempre' }], estE.periodo, 'periodo');
      h += CJ.chipsHtml([{ id: 'todo', nombre: 'Todo' }].concat(CJ.CATS.map(function (c) { return { id: c.id, emoji: c.emoji, nombre: c.corto || c.nombre }; })), estE.cat, 'cat');
      h += CJ.chipsHtml([{ id: 'mas', nombre: '🔥 Más usadas' }, { id: 'menos', nombre: '💤 Menos usadas' }], estE.orden, 'orden');
      h += '<div class="mosaicos"><div class="mosaico"><div class="n">' + lista.length + '</div><div class="l">prendas</div></div>' +
        '<div class="mosaico"><div class="n">' + (lista.length ? Math.round(usadas * 100 / lista.length) : 0) + '%</div><div class="l">del clóset usado</div></div>' +
        '<div class="mosaico" style="margin-right:0"><div class="n">' + diasReg + '</div><div class="l">días registrados</div></div></div>';
      h += '<div class="tarjeta-caja">';
      lista.forEach(function (x) {
        h += '<div class="fila-lista" data-acc="prenda-detalle" data-id="' + x.p.id + '"><div class="mini-img">' + CJ.imgHtml(x.p.foto) + '</div>' +
          '<div class="cuerpo"><b>' + CJ.esc(CJ.nombrePrenda(x.p)) + '</b>' + (x.p.marca ? ' <span class="suave">· ' + CJ.esc(x.p.marca) + '</span>' : '') +
          '<div class="barra-uso"><div style="width:' + Math.round(x.n * 100 / max) + '%"></div></div>' +
          '<div class="peq suave">Última vez: ' + CJ.esc(CJ.haceTxt(x.u.ultima)) + ' · total histórico ×' + x.u.n + '</div></div>' +
          '<div class="lado"><div class="fecha-grande">×' + x.n + '</div></div></div>';
      });
      if (!lista.length) h += '<p class="suave">Sin prendas.</p>';
      h += '</div>';
      cont.innerHTML = h;
      CJ.activarChips(cont, function (g, v) { estE[g] = v[0]; CJ.refrescar(); });
    }
  };

  /* ---------- Avatar ---------- */
  var PIELES = ['#f6d7c3', '#efc3a4', '#e8b897', '#d9a07a', '#c68863', '#a96d4b', '#8a5536', '#6b3f26'];
  CJ.vistas.avatar = {
    render: function (cont) {
      var perfil = CJ.datos.perfil || {};
      var h = volver() + '<h1 class="mt">👩 Mi avatar</h1><div class="detalle-cols"><div class="detalle-img">' + CJ.escenario(null, 'medio') + '</div><div class="detalle-datos">' +
        '<div class="aviso">💡 Para que quede perfecto, recorta la cara en la PC con <b>estudio.py avatar foto.jpg</b>: quita el fondo y la sube sola. ' +
        'Desde aquí también puedes elegir una foto (se verá en círculo).</div>' +
        '<button class="btn btn-pri btn-ancho" data-acc="avatar-cara">📷 Elegir foto de la cara</button>' +
        (perfil.cara ? '<button class="btn btn-ancho" data-acc="avatar-quitar">Quitar cara</button>' : '') +
        (perfil.cuerpo ? '<div class="aviso aviso-ok mt">✅ Usando tu foto de cuerpo completo. Para cambiarla: <b>estudio.py cuerpo foto.jpg</b> en la PC.</div>' +
          '<button class="btn btn-ancho" data-acc="avatar-quitar-cuerpo">Volver a la muñeca dibujada</button>' : '') +
        '<h3 class="mt">Tono de piel</h3><div class="chips">' + PIELES.map(function (p) {
          return '<button class="chip' + (perfil.piel === p ? ' on' : '') + '" data-acc="avatar-piel" data-p="' + p + '"><span class="bolita" style="background:' + p + ';margin:0"></span></button>';
        }).join('') + '</div></div></div>';
      cont.innerHTML = h;
    }
  };
  function guardarPerfil(cambios) {
    var p = CJ.copiar(CJ.datos.perfil || {});
    for (var k in cambios) p[k] = cambios[k];
    CJ.datos.perfil = CJ.tocar(p);
    CJ.guardar();
    CJ.refrescar();
  }
  CJ.acc['avatar-piel'] = function (el) { guardarPerfil({ piel: el.getAttribute('data-p') }); };
  CJ.acc['avatar-quitar'] = function () { guardarPerfil({ cara: null, caraRecortada: false }); };
  CJ.acc['avatar-quitar-cuerpo'] = function () {
    return CJ.confirmar('¿Volver a la muñeca dibujada?', 'Tu foto de cuerpo completo se borra del clóset.', 'Sí, quitarla').then(function (si) {
      if (si) guardarPerfil({ cuerpo: null, cuerpoCajas: null, cuerpoRel: null });
    });
  };
  CJ.acc['avatar-cara'] = function () {
    return CJ.elegirArchivos({ accept: 'image/*' }).then(function (a) {
      if (!a.length) return;
      var png = /png$/i.test(a[0].type);
      var proceso = png ? CJ.img.procesarArchivo(a[0], { max: 500 }) : CJ.img.recortarCara(a[0]);
      return proceso.then(function (r) {
        var id = CJ.nuevoId('cara_') + '.' + r.ext;
        return CJ.guardarFoto(id, r.data, r.mini).then(function () { guardarPerfil({ cara: id, caraRecortada: png }); });
      });
    });
  };
})();
