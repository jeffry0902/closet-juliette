/* "Pídele a Claude": la estilista arma outfits a partir de un pedido en lenguaje natural. */
(function () {
  var est = { pedido: '', resultado: null };
  var RAPIDOS = [
    'Un outfit para el trabajo de mañana',
    '3 outfits de gym distintos para esta semana',
    'Algo casual y fresco para salir el sábado',
    'Plan de trabajo de lunes a viernes sin repetir',
    'Outfits con prendas que casi no uso'
  ];

  CJ.vistas.estilista = {
    render: function (cont) {
      var h = '<button class="btn btn-peq" data-acc="ir" data-v="mas">◀ Más</button><h1 class="mt">💅 Pídele a Claude</h1>';
      if (!CJ.ia.activa()) {
        h += '<div class="aviso">Para usar la estilista necesitas una clave de la API de Claude. Agrégala en <b>Más → Ajustes</b>. ' +
          'Mientras tanto, “✨ Sorpréndeme” arma outfits sin internet.</div>';
      }
      h += '<div class="campo"><label>¿Qué necesitas?</label><textarea class="entrada" id="f-pedido" placeholder="Ej: algo elegante pero cómodo para una reunión importante el jueves">' + CJ.esc(est.pedido) + '</textarea></div>';
      h += '<div class="chips">' + RAPIDOS.map(function (r, i) { return '<button class="chip" data-acc="est-rapido" data-i="' + i + '">' + CJ.esc(r) + '</button>'; }).join('') + '</div>';
      h += '<button class="btn btn-pri btn-ancho" data-acc="est-pedir"' + (CJ.ia.activa() ? '' : ' disabled') + '>💅 Armar mis outfits</button>';
      var r = est.resultado;
      if (r) {
        if (r.mensaje) h += '<div class="aviso aviso-ok mt">💬 ' + CJ.esc(r.mensaje) + '</div>';
        var conDia = r.outfits.filter(function (o) { return o.dia; }).length;
        if (conDia > 1) h += '<button class="btn btn-ama" data-acc="est-planear-todo">📅 Poner estos ' + conDia + ' en mi semana</button>';
        h += '<div class="rejilla tres mt">' + r.outfits.map(function (o, i) {
          var oc = CJ.ocas(o.ocas);
          return '<div class="celda">' + CJ.tarjetaOutfit(o.piezas, (o.dia ? CJ.DIAS_N[o.dia] + ': ' : '') + o.nombre,
            '<div class="porque">' + (oc ? oc.emoji + ' ' : '') + CJ.esc(o.porque) + '</div>' +
            '<div class="mt"><button class="btn btn-peq" data-acc="est-ver" data-i="' + i + '">👩</button>' +
            '<button class="btn btn-peq" data-acc="est-fav" data-i="' + i + '">❤️</button>' +
            '<button class="btn btn-peq" data-acc="est-hoy" data-i="' + i + '">✅</button>' +
            '<button class="btn btn-peq" data-acc="est-plan" data-i="' + i + '">📅</button></div>') + '</div>';
        }).join('') + '</div>';
        if (!r.outfits.length) h += '<p class="suave mt">No encontré combinaciones con tu clóset actual. Prueba con otro pedido.</p>';
      }
      cont.innerHTML = h;
      CJ.$('#f-pedido', cont).addEventListener('input', function (e) { est.pedido = e.target.value; });
    }
  };

  function outfit(el) { return est.resultado ? est.resultado.outfits[+el.getAttribute('data-i')] : null; }

  CJ.acc['est-rapido'] = function (el) {
    est.pedido = RAPIDOS[+el.getAttribute('data-i')];
    var t = CJ.$('#f-pedido');
    if (t) t.value = est.pedido;
  };

  CJ.acc['est-pedir'] = function () {
    var t = CJ.$('#f-pedido');
    est.pedido = (t ? t.value : est.pedido).trim();
    if (!est.pedido) { CJ.toast('Escribe qué necesitas o toca una idea'); return; }
    if (t) t.blur();
    var espera = CJ.cargando('Pensando…');
    return CJ.ia.estilista(est.pedido, espera.texto).then(function (r) {
      espera.cerrar();
      est.resultado = r;
      CJ.refrescar();
    }, function (e) { espera.cerrar(); throw e; });
  };

  CJ.acc['est-ver'] = function (el) { var o = outfit(el); if (o) CJ.modal('<h2>' + CJ.esc(o.nombre) + '</h2>' + CJ.escenario(o.piezas, 'medio') + '<p class="mt">' + CJ.esc(o.porque) + '</p>'); };
  CJ.acc['est-fav'] = function (el) { var o = outfit(el); if (o) CJ.guardarFavorito(o.piezas, o.ocas, o.nombre); };
  CJ.acc['est-hoy'] = function (el) {
    var o = outfit(el);
    if (!o) return;
    CJ.registrarLook(CJ.hoy(), CJ.copiar(o.piezas), { ocas: o.ocas });
    CJ.toast('¡Registrado hoy! ✅', 'ok');
  };
  CJ.acc['est-plan'] = function (el) { var o = outfit(el); if (o) CJ.planearEnDia(o.piezas, o.ocas); };
  CJ.acc['est-planear-todo'] = function () {
    est.resultado.outfits.forEach(function (o) {
      if (!o.dia) return;
      CJ.datos.semana[o.dia] = CJ.tocar({ dia: o.dia, piezas: CJ.copiar(o.piezas), ocas: o.ocas });
      delete CJ.datos.borrados['semana:' + o.dia];
    });
    CJ.guardar();
    CJ.toast('¡Semana planeada! 🗓️', 'ok');
    CJ.ir('semana');
  };
})();
