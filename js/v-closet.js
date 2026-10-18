/* Pantalla "Clóset": inventario por categoría, detalle/edición de prendas y alta desde Fotos. */
(function () {
  var est = { cat: 'todo', ocas: 'todas', orden: 'recientes' };

  function ordenar(lista) {
    if (est.orden === 'mas') lista.sort(function (a, b) { return CJ.uso(b.id).n - CJ.uso(a.id).n; });
    if (est.orden === 'menos') lista.sort(function (a, b) {
      var ua = CJ.uso(a.id), ub = CJ.uso(b.id);
      return ua.n - ub.n || String(ua.ultima || '').localeCompare(String(ub.ultima || ''));
    });
    return lista;
  }

  CJ.rejillaPrendas = function (lista, opts) {
    opts = opts || {};
    if (!lista.length) return '<p class="suave centro mt">No hay prendas aquí todavía.</p>';
    return '<div class="rejilla">' + lista.map(function (p) {
      var u = CJ.uso(p.id);
      return '<div class="celda' + (opts.sel === p.id ? ' sel' : '') + '" data-acc="' + (opts.acc || 'prenda-detalle') + '" data-id="' + p.id + '">' +
        '<span class="insignia' + (u.n ? '' : ' nueva') + '">' + (u.n ? '×' + u.n : 'nueva') + '</span>' +
        '<div class="marco fondo-cuadros">' + CJ.imgHtml(p.foto) + '</div>' +
        '<div class="celda-pie">' + CJ.esc(p.marca || CJ.nombrePrenda(p)) + '</div></div>';
    }).join('') + '</div>';
  };

  CJ.vistas.closet = {
    render: function (cont) {
      var todas = CJ.listaPrendas();
      var cats = [{ id: 'todo', nombre: 'Todo (' + todas.length + ')' }].concat(CJ.CATS.map(function (c) {
        return { id: c.id, emoji: c.emoji, nombre: (c.corto || c.nombre) + ' (' + CJ.listaPrendas({ cat: c.id }).length + ')' };
      }));
      var lista = ordenar(CJ.listaPrendas({ cat: est.cat, ocas: est.ocas }));
      var h = '<div style="overflow:hidden"><button class="btn btn-pri" style="float:right;margin-right:0" data-acc="prenda-agregar">＋ Agregar</button><h1>Mi clóset</h1></div>';
      h += CJ.chipsHtml(cats, est.cat, 'cat');
      h += CJ.chipsHtml([{ id: 'todas', nombre: 'Todas las ocasiones' }].concat(CJ.OCAS), est.ocas, 'ocas');
      h += CJ.chipsHtml([{ id: 'recientes', nombre: '🆕 Recientes' }, { id: 'mas', nombre: '🔥 Más usadas' }, { id: 'menos', nombre: '💤 Menos usadas' }], est.orden, 'orden');
      h += CJ.rejillaPrendas(lista);
      cont.innerHTML = h;
      CJ.activarChips(cont, function (g, v) { est[g] = v[0]; CJ.vistas.closet.render(cont); CJ.hidratar(cont); });
    }
  };

  /* ---------- Detalle / edición ---------- */
  CJ.acc['prenda-detalle'] = function (el) { CJ.detallePrenda(el.getAttribute('data-id')); };

  CJ.detallePrenda = function (id) {
    var p = CJ.prenda(id);
    if (!p) return;
    var u = CJ.uso(id);
    var h = '<h2>' + CJ.esc(CJ.nombrePrenda(p)) + '</h2><div class="detalle-cols"><div class="detalle-img">' +
      '<div class="marco fondo-cuadros">' + CJ.imgHtml(p.foto, 'grande') + '</div>' +
      '<div class="tarjeta-caja mt centro"><div class="fecha-grande">×' + u.n + '</div><div class="peq">veces usada</div>' +
      '<div class="peq suave">Última: ' + CJ.esc(CJ.haceTxt(u.ultima)) + '</div></div>' +
      '</div><div class="detalle-datos">' +
      '<div class="campo"><label>Categoría</label>' + CJ.chipsHtml(CJ.CATS, p.cat, 'cat') + '</div>' +
      '<div class="campo"><label>Ocasión (puedes marcar varias)</label>' + CJ.chipsHtml(CJ.OCAS, p.ocas || [], 'ocas', true) + '</div>' +
      '<div class="campo colores"><label>Color</label>' + CJ.chipsHtml(CJ.COLORES, p.color, 'color') + '</div>' +
      '<div class="campo"><label>Marca (opcional)</label><input class="entrada" id="f-marca" value="' + CJ.esc(p.marca || '') + '" placeholder="Zara, Nike, H&M…"></div>' +
      '<div class="campo"><label>Nombre (opcional)</label><input class="entrada" id="f-nombre" value="' + CJ.esc(p.nombre || '') + '" placeholder="Ej: blusa de lino favorita"></div>' +
      '</div></div>' +
      '<div class="fila-btns"><button class="btn btn-pri" data-x="guardar">💾 Guardar</button>' +
      '<button class="btn btn-ama" data-x="armar">✨ Armar con esta</button>' +
      '<button class="btn btn-rojo" data-x="borrar">🗑️ Eliminar</button></div>';
    var m = CJ.modal(h);
    var img = CJ.$('img.grande', m.el);
    CJ.cargarFoto(p.foto).then(function (d) { if (d) img.src = d; });
    var cambios = { cat: p.cat, ocas: (p.ocas || []).slice(), color: p.color };
    CJ.activarChips(m.el, function (g, v) { cambios[g] = g === 'ocas' ? v : v[0]; });
    m.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]');
      if (!b) return;
      var x = b.getAttribute('data-x');
      if (x === 'guardar') {
        var n = CJ.copiar(p);
        n.cat = cambios.cat; n.ocas = cambios.ocas; n.color = cambios.color;
        n.marca = CJ.$('#f-marca', m.el).value.trim();
        n.nombre = CJ.$('#f-nombre', m.el).value.trim();
        CJ.datos.prendas[id] = CJ.tocar(n);
        CJ.guardar();
        m.cerrar();
        CJ.toast('Prenda guardada', 'ok');
        CJ.refrescar();
      } else if (x === 'armar') {
        m.cerrar();
        CJ.ir('armar', { base: id });
      } else if (x === 'borrar') {
        CJ.confirmar('¿Eliminar esta prenda?', 'Se quitará del clóset y de los outfits guardados. Los días del calendario la conservan como “prenda eliminada”.', 'Sí, eliminar').then(function (si) {
          if (!si) return;
          CJ.borrar('prendas', id);
          m.cerrar();
          CJ.toast('Prenda eliminada');
          CJ.refrescar();
        });
      }
    });
  };

  /* ---------- Agregar desde Fotos / Archivos ---------- */
  CJ.acc['prenda-agregar'] = function () {
    var sel = { cat: est.cat === 'todo' ? 'tops' : est.cat, ocas: [] };
    var m = CJ.modal('<h2>＋ Agregar prendas</h2>' +
      '<div class="aviso">💡 Lo ideal: toma las fotos con tu celular y pásalas por <b>estudio.py</b> en la PC; quita el fondo, las deja lindas y las sube solas a la nube. ' +
      'Aquí puedes agregar fotos que ya estén en la iPad (por ejemplo, los PNG ya procesados).</div>' +
      '<div class="campo"><label>Categoría de estas fotos</label>' + CJ.chipsHtml(CJ.CATS, sel.cat, 'cat') + '</div>' +
      '<div class="campo"><label>Ocasión</label>' + CJ.chipsHtml(CJ.OCAS, [], 'ocas', true) + '</div>' +
      '<button class="btn btn-pri btn-ancho" data-x="elegir">🖼️ Elegir fotos</button>');
    CJ.activarChips(m.el, function (g, v) { sel[g] = g === 'ocas' ? v : v[0]; });
    CJ.$('[data-x="elegir"]', m.el).addEventListener('click', function () {
      CJ.elegirArchivos({ accept: 'image/*', multiple: true }).then(function (archivos) {
        if (!archivos.length) return;
        m.cerrar();
        return agregarArchivos(archivos, sel.cat, sel.ocas);
      }).catch(CJ.fallo);
    });
  };

  function agregarArchivos(archivos, cat, ocas) {
    var espera = CJ.cargando('Guardando 0 de ' + archivos.length + '…');
    var p = Promise.resolve(), hechas = 0, ultima = null;
    archivos.forEach(function (a) {
      p = p.then(function () {
        return CJ.img.procesarArchivo(a).then(function (r) {
          return CJ.img.colorDominante(r.mini).then(function (color) {
            var id = CJ.nuevoId('p');
            var fotoId = id + '.' + r.ext;
            return CJ.guardarFoto(fotoId, r.data, r.mini).then(function () {
              CJ.datos.prendas[id] = CJ.tocar({ id: id, cat: cat, foto: fotoId, color: color, ocas: ocas.slice(), marca: '', nombre: '', creada: Date.now() });
              hechas++; ultima = id;
              espera.texto('Guardando ' + hechas + ' de ' + archivos.length + '…');
            });
          });
        }).catch(function (e) { CJ.toast((a.name || 'Foto') + ': ' + e.message, 'error'); });
      });
    });
    return p.then(function () {
      CJ.guardar();
      espera.cerrar();
      CJ.toast('¡' + hechas + ' prenda' + (hechas === 1 ? '' : 's') + ' agregada' + (hechas === 1 ? '' : 's') + '! 🎉', 'ok');
      CJ.refrescar();
      if (hechas === 1 && ultima) CJ.detallePrenda(ultima);
    });
  }

  /* ---------- Selector de prenda reutilizable ---------- */
  CJ.elegirPrenda = function (opts) {
    opts = opts || {};
    return new Promise(function (resolver) {
      var cat = opts.cats ? opts.cats[0] : 'todo';
      var listo = false;
      var m = CJ.modal('<h2>' + CJ.esc(opts.titulo || 'Elige una prenda') + '</h2><div class="cuerpo-sel"></div>', {
        alCerrar: function () { if (!listo) resolver(null); }
      });
      function pintar() {
        var cats = (opts.cats ? CJ.CATS.filter(function (c) { return opts.cats.indexOf(c.id) >= 0; }) : [{ id: 'todo', nombre: 'Todo' }].concat(CJ.CATS));
        var lista = CJ.listaPrendas(cat === 'todo' ? {} : { cat: cat });
        var cuerpo = CJ.$('.cuerpo-sel', m.el);
        cuerpo.innerHTML = CJ.chipsHtml(cats, cat, 'cat') + (opts.ninguna ? '<button class="btn btn-peq" data-ninguna="1">🚫 Ninguna</button>' : '') +
          CJ.rejillaPrendas(lista, { acc: 'nada', sel: opts.actual });
        CJ.hidratar(cuerpo);
        CJ.activarChips(cuerpo, function (g, v) { cat = v[0]; pintar(); });
      }
      m.el.addEventListener('click', function (e) {
        var c = e.target.closest('.celda[data-id]');
        if (c) { listo = true; resolver(c.getAttribute('data-id')); m.cerrar(); return; }
        if (e.target.closest('[data-ninguna]')) { listo = true; resolver(''); m.cerrar(); }
      });
      pintar();
    });
  };
  CJ.acc.nada = function () { /* lo maneja el modal */ };
})();
