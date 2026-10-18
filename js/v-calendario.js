/* Calendario: qué se puso cada día del mes, plan de los próximos días y alertas de repetición. */
(function () {
  var hoyD = new Date();
  var est = { anio: hoyD.getFullYear(), mes: hoyD.getMonth() };

  function lookPrincipal(dia) {
    if (!dia || !dia.looks || !dia.looks.length) return null;
    return dia.looks.filter(function (l) { return l.ocas !== 'gym'; })[0] || dia.looks[0];
  }

  /* ¿La combinación principal se repitió en los 14 días anteriores? */
  function repetido(fecha, look) {
    var firma = CJ.firma(look.piezas);
    if (firma === '-+-') return false;
    for (var i = 1; i <= 14; i++) {
      var d = CJ.datos.dias[CJ.sumarDias(fecha, -i)];
      if (d && (d.looks || []).some(function (l) { return CJ.firma(l.piezas) === firma; })) return true;
    }
    return false;
  }

  function celda(fecha) {
    var dia = CJ.datos.dias[fecha];
    var look = lookPrincipal(dia);
    var hoy = CJ.hoy();
    var clases = 'cal-dia' + (fecha === hoy ? ' hoy' : '');
    var marcas = '', mini = '';
    if (look) {
      if (dia.looks.some(function (l) { return l.ocas === 'gym'; })) marcas += '🏋️';
      if (dia.looks.some(function (l) { return l.foto; })) marcas += '📸';
      if (repetido(fecha, look)) { clases += ' repite'; marcas += '⚠️'; }
      if (CJ.idsDe(look.piezas).length) mini = CJ.muneca(look.piezas, { sinCuerpo: true });
      else if (look.foto) mini = CJ.imgHtml(look.foto, 'foto');
    } else if (fecha >= hoy && CJ.diasEntre(hoy, fecha) < 7) {
      var plan = CJ.datos.semana[CJ.diaSemana(fecha)];
      if (plan && plan.piezas && CJ.idsDe(plan.piezas).length) { clases += ' plan'; mini = CJ.muneca(plan.piezas, { sinCuerpo: true }); }
    }
    return '<div class="' + clases + '" data-acc="cal-dia" data-fecha="' + fecha + '"><span class="num">' + CJ.aFecha(fecha).getDate() + '</span>' +
      '<span class="marcas">' + marcas + '</span><div class="mini">' + mini + '</div></div>';
  }

  function resumenMes(desde, hasta) {
    var conteo = {}, dias = 0;
    Object.keys(CJ.datos.dias).forEach(function (f) {
      if (f < desde || f > hasta) return;
      var d = CJ.datos.dias[f];
      if (!d.looks || !d.looks.length) return;
      dias++;
      var vistos = {};
      d.looks.forEach(function (l) {
        CJ.idsDe(l.piezas).forEach(function (id) { if (!vistos[id]) { vistos[id] = 1; conteo[id] = (conteo[id] || 0) + 1; } });
      });
    });
    var top = Object.keys(conteo).filter(function (id) {
      var p = CJ.prenda(id); return p && p.cat !== 'zapatos' && p.cat !== 'accesorios';
    }).sort(function (a, b) { return conteo[b] - conteo[a]; }).slice(0, 4);
    var h = '<div class="tarjeta-caja mt"><h3>Resumen de ' + CJ.MESES[est.mes] + '</h3><div class="mosaicos">' +
      '<div class="mosaico"><div class="n">' + dias + '</div><div class="l">días registrados</div></div>' +
      '<div class="mosaico"><div class="n">' + Object.keys(conteo).length + '</div><div class="l">prendas distintas</div></div>' +
      '<div class="mosaico" style="margin-right:0"><div class="n">' + Math.max(0, Object.keys(CJ.datos.prendas).length - Object.keys(conteo).length) + '</div><div class="l">sin usar este mes</div></div></div>';
    if (top.length && conteo[top[0]] > 1) {
      h += '<p class="mt"><b>Las que más repetiste:</b></p><div class="rejilla">' + top.map(function (id) {
        var p = CJ.prenda(id);
        return '<div class="celda" data-acc="prenda-detalle" data-id="' + id + '"><span class="insignia">×' + conteo[id] + '</span><div class="marco fondo-cuadros">' + CJ.imgHtml(p.foto) + '</div></div>';
      }).join('') + '</div>';
    }
    return h + '</div>';
  }

  CJ.vistas.calendario = {
    render: function (cont) {
      var primero = new Date(est.anio, est.mes, 1, 12);
      var diasMes = new Date(est.anio, est.mes + 1, 0, 12).getDate();
      var vacios = (primero.getDay() + 6) % 7;
      var h = '<div class="cal-cab"><button class="btn btn-peq" data-acc="cal-mes" data-d="-1">◀</button><h2>' +
        CJ.MESES[est.mes].charAt(0).toUpperCase() + CJ.MESES[est.mes].slice(1) + ' ' + est.anio + '</h2>' +
        '<button class="btn btn-peq" data-acc="cal-mes" data-d="1">▶</button></div>';
      h += '<div class="cal-semana"><div>L</div><div>M</div><div>M</div><div>J</div><div>V</div><div>S</div><div>D</div></div><div class="cal-rejilla">';
      for (var i = 0; i < vacios; i++) h += '<div class="cal-dia fuera"></div>';
      for (var d = 1; d <= diasMes; d++) h += celda(CJ.claveFecha(new Date(est.anio, est.mes, d, 12)));
      h += '</div><p class="peq suave mt">🏋️ también fue al gym · 📸 tiene foto · ⚠️ repitió combinación en menos de 2 semanas · en amarillo: lo planeado.</p>';
      var desde = CJ.claveFecha(primero), hasta = CJ.claveFecha(new Date(est.anio, est.mes, diasMes, 12));
      h += resumenMes(desde, hasta);
      cont.innerHTML = h;
    }
  };

  CJ.acc['cal-mes'] = function (el) {
    est.mes += +el.getAttribute('data-d');
    if (est.mes < 0) { est.mes = 11; est.anio--; }
    if (est.mes > 11) { est.mes = 0; est.anio++; }
    CJ.refrescar();
  };

  CJ.acc['cal-dia'] = function (el) { CJ.detalleDia(el.getAttribute('data-fecha')); };

  /* ---------- Detalle de un día ---------- */
  CJ.detalleDia = function (fecha) {
    var m = CJ.modal('<div class="dia-cuerpo"></div>');
    function pintar() {
      var dia = CJ.datos.dias[fecha];
      var looks = dia ? dia.looks || [] : [];
      var h = '<h2>' + CJ.esc(CJ.fechaLarga(fecha)) + '</h2>';
      if (!looks.length) h += '<p class="suave">No hay nada registrado este día.</p>';
      looks.forEach(function (l, i) {
        var o = l.ocas ? CJ.ocas(l.ocas) : null;
        h += '<div class="tarjeta-caja"><div style="overflow:hidden"><h3 style="float:left">' + (o ? o.emoji + ' ' + o.nombre : 'Look ' + (i + 1)) + '</h3></div>' +
          '<div class="rejilla tres">' +
          (l.foto ? '<div class="celda"><div class="marco">' + CJ.imgHtml(l.foto, '', ' style="object-fit:cover;top:0;left:0;width:100%;height:100%"') + '</div></div>' : '') +
          '<div class="celda">' + CJ.tarjetaOutfit(l.piezas) + '</div>' +
          '<div class="celda">' + CJ.idsDe(l.piezas).map(function (id) { return '<span class="etiqueta">' + CJ.esc(CJ.nombrePrenda(CJ.prenda(id))) + '</span>'; }).join('') + '</div>' +
          '</div><div class="fila-btns"><button class="btn btn-peq" data-x="editar" data-i="' + i + '">✏️ Prendas</button>' +
          '<button class="btn btn-peq" data-x="ver" data-i="' + i + '">👩 Ver en mí</button>' +
          '<button class="btn btn-peq btn-rojo" data-x="quitar" data-i="' + i + '">🗑️ Quitar</button></div></div>';
      });
      h += '<div class="fila-btns"><button class="btn btn-pri" data-acc="foto-dia" data-fecha="' + fecha + '">📸 Subir foto</button>' +
        '<button class="btn" data-x="nuevo">＋ Elegir prendas</button>' +
        '<button class="btn" data-x="fav">❤️ Desde favoritos</button></div>';
      CJ.$('.dia-cuerpo', m.el).innerHTML = h;
      CJ.hidratar(m.el);
    }
    function guardarLooks(looks) {
      if (!looks.length) CJ.borrar('dias', fecha);
      else { CJ.datos.dias[fecha] = CJ.tocar({ fecha: fecha, looks: looks }); delete CJ.datos.borrados['dias:' + fecha]; CJ.guardar(); }
      pintar();
      CJ.refrescar();
    }
    m.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-x]');
      if (!b) { if (e.target.closest('[data-acc="foto-dia"]')) m.cerrar(); return; }
      var x = b.getAttribute('data-x'), i = +b.getAttribute('data-i');
      var dia = CJ.datos.dias[fecha];
      var looks = dia ? CJ.copiar(dia.looks || []) : [];
      if (x === 'quitar') {
        CJ.confirmar('¿Quitar este look del día?', '', 'Quitar').then(function (si) { if (si) { looks.splice(i, 1); guardarLooks(looks); } });
      } else if (x === 'ver') {
        CJ.modal('<h2>👩 ' + CJ.esc(CJ.fechaLarga(fecha)) + '</h2>' + CJ.escenario(looks[i].piezas, 'medio'));
      } else if (x === 'editar' || x === 'nuevo') {
        var base = x === 'editar' ? looks[i] : { id: CJ.nuevoId('l'), piezas: CJ.piezasVacias(), foto: null, ocas: (CJ.ajustes.semanaOcas || {})[CJ.diaSemana(fecha)] || 'casual' };
        CJ.editarLook(base).then(function (r) {
          if (!r) return;
          if (x === 'editar') looks[i] = r; else looks.push(r);
          guardarLooks(looks);
        });
      } else if (x === 'fav') {
        CJ.elegirFavorito().then(function (o) {
          if (!o) return;
          looks.push({ id: CJ.nuevoId('l'), piezas: CJ.copiar(o.piezas), foto: null, ocas: o.ocas || null });
          guardarLooks(looks);
        });
      }
    });
    pintar();
  };

  /* Editor de un look: lista de prendas + ocasión */
  CJ.editarLook = function (look) {
    return new Promise(function (resolver) {
      var ids = CJ.idsDe(look.piezas), ocas = look.ocas || 'casual', hecho = false;
      var m = CJ.modal('<div class="ed-cuerpo"></div>', { alCerrar: function () { if (!hecho) resolver(null); } });
      function pintar() {
        var h = '<h2>✏️ Prendas del look</h2>' + CJ.chipsHtml(CJ.OCAS, ocas, 'ocas') + '<div class="rejilla">' +
          ids.map(function (id) {
            return '<div class="celda" data-quitar="' + id + '"><span class="insignia">✕</span><div class="marco fondo-cuadros">' + CJ.imgHtml(CJ.fotoDe(id)) + '</div></div>';
          }).join('') + '</div><button class="btn" data-agregar="1">＋ Agregar prenda</button>' +
          '<div class="fila-btns mt"><button class="btn btn-pri" data-ok="1">💾 Guardar</button><button class="btn" data-cerrar="1">Cancelar</button></div>';
        CJ.$('.ed-cuerpo', m.el).innerHTML = h;
        CJ.hidratar(m.el);
        CJ.activarChips(m.el, function (g, v) { ocas = v[0]; });
      }
      m.el.addEventListener('click', function (e) {
        var q = e.target.closest('[data-quitar]');
        if (q) { ids.splice(ids.indexOf(q.getAttribute('data-quitar')), 1); pintar(); return; }
        if (e.target.closest('[data-agregar]')) {
          CJ.elegirPrenda({ titulo: 'Agregar prenda' }).then(function (id) { if (id && ids.indexOf(id) < 0) { ids.push(id); pintar(); } });
          return;
        }
        if (e.target.closest('[data-ok]')) {
          hecho = true;
          var r = CJ.copiar(look);
          r.piezas = CJ.piezasDe(ids); r.ocas = ocas;
          resolver(r);
          m.cerrar();
        }
      });
      pintar();
    });
  };
})();
