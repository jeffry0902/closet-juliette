/* Pantalla "Hoy": lo que se puso (o lo planeado), foto del outfit del día y accesos rápidos. */
(function () {
  function lookDeHoy() {
    var hoy = CJ.hoy();
    var dia = CJ.datos.dias[hoy];
    if (dia && dia.looks && dia.looks.length) {
      /* Se prefiere el look que no es de gym para la muñeca principal */
      var principal = dia.looks.filter(function (l) { return l.ocas !== 'gym'; })[0] || dia.looks[0];
      return { tipo: 'puesto', look: principal, dia: dia };
    }
    var plan = CJ.datos.semana[CJ.diaSemana(hoy)];
    if (plan && plan.piezas && CJ.idsDe(plan.piezas).length) return { tipo: 'plan', look: { piezas: plan.piezas, ocas: plan.ocas } };
    return { tipo: 'nada' };
  }

  CJ.vistas.hoy = {
    render: function (cont) {
      var hoy = CJ.hoy();
      var info = lookDeHoy();
      var n = Object.keys(CJ.datos.prendas).length;
      var h = '<div class="hoy-cols"><div class="hoy-izq">';
      h += CJ.escenario(info.look ? info.look.piezas : null);
      h += '</div><div class="hoy-der">';
      h += '<div class="fecha-grande">' + CJ.esc(CJ.fechaLarga(hoy)) + '</div>';
      if (info.tipo === 'puesto') {
        var looks = info.dia.looks.length;
        h += '<p class="mt">✅ <b>Ya registraste tu outfit de hoy</b>' + (looks > 1 ? ' (' + looks + ' looks)' : '') + '.</p>';
      } else if (info.tipo === 'plan') {
        h += '<p class="mt">📅 Este es tu <b>plan de hoy</b>. ¿Te lo pusiste?</p>';
        h += '<button class="btn btn-verde btn-ancho" data-acc="hoy-plan-puesto">✅ Sí, me lo puse</button>';
      } else {
        h += '<p class="mt suave">Aún no hay outfit para hoy.</p>';
      }
      h += '<button class="btn-grande" data-acc="foto-dia"><span class="ico">📸</span><span class="txt">Foto del outfit de hoy<span class="sub">Claude reconoce las prendas y lo guarda</span></span></button>';
      h += '<button class="btn-grande" data-acc="hoy-sorpresa"><span class="ico">✨</span><span class="txt">Sorpréndeme<span class="sub">Un outfit al azar que no repite</span></span></button>';
      h += '<button class="btn-grande" data-acc="ir" data-v="armar"><span class="ico">👗</span><span class="txt">Armar outfit<span class="sub">Carriles estilo Clueless</span></span></button>';
      h += '</div></div>';

      if (!n) {
        h += '<div class="aviso mt"><b>¡Bienvenida al clóset!</b> Todavía no hay prendas. Súbelas desde la PC con el script <b>estudio.py</b> ' +
          '(las deja lindas y sin fondo) o desde Clóset → Agregar.</div>';
      }

      /* Prendas olvidadas: sugerencia para no repetir siempre lo mismo */
      var olvidadas = CJ.listaPrendas({ cats: ['tops', 'pantalones', 'faldas', 'vestidos'] }).filter(function (p) {
        var u = CJ.uso(p.id);
        return !u.ultima || CJ.diasEntre(u.ultima, hoy) > 30;
      });
      if (olvidadas.length) {
        h += '<div class="tarjeta-caja mt"><h3>💤 Prendas olvidadas</h3><p class="suave peq">Hace más de un mes que no las usas. Toca una para armar un outfit con ella.</p><div class="rejilla">';
        CJ.mezclar(olvidadas).slice(0, 4).forEach(function (p) {
          h += '<div class="celda" data-acc="armar-con" data-id="' + p.id + '"><div class="marco fondo-cuadros">' + CJ.imgHtml(p.foto) + '</div>' +
            '<div class="celda-pie">' + CJ.esc(CJ.motor.avisoUso(p.id).txt) + '</div></div>';
        });
        h += '</div></div>';
      }
      cont.innerHTML = h;
    }
  };

  CJ.acc['hoy-plan-puesto'] = function () {
    var plan = CJ.datos.semana[CJ.diaSemana(CJ.hoy())];
    if (!plan) return;
    CJ.registrarLook(CJ.hoy(), CJ.copiar(plan.piezas), { ocas: plan.ocas });
    CJ.toast('¡Guardado en el calendario! 💖', 'ok');
    CJ.refrescar();
  };

  CJ.acc['hoy-sorpresa'] = function () {
    var p = CJ.motor.sorprendeme(CJ.ajustes.ocasionArmar);
    if (!p) { CJ.toast('Necesitas prendas en el clóset'); return; }
    CJ.ir('armar', { piezas: p });
  };

  /* ---------- Foto del outfit del día ---------- */
  CJ.acc['foto-dia'] = function (el) {
    var fecha = el.getAttribute('data-fecha') || CJ.hoy();
    return CJ.elegirArchivos({ accept: 'image/*' }).then(function (archivos) {
      if (!archivos.length) return;
      var espera = CJ.cargando('Preparando la foto…');
      var foto;
      return CJ.img.procesarArchivo(archivos[0], { forzarJpg: true }).then(function (r) {
        foto = r;
        if (!CJ.ia.activa() || !Object.keys(CJ.datos.prendas).length) return null;
        return CJ.ia.reconocer(r.data, espera.texto).catch(function (e) {
          CJ.toast('No pude reconocer las prendas: ' + e.message, 'error', 5000);
          return null;
        });
      }).then(function (res) {
        espera.cerrar();
        CJ.confirmarFotoDia(fecha, foto, res);
      }, function (e) { espera.cerrar(); throw e; });
    });
  };

  /* Muestra lo reconocido y deja corregirlo antes de guardar */
  CJ.confirmarFotoDia = function (fecha, foto, res) {
    var ids = res ? res.ids.slice() : [];
    var ocas = res && res.ocas ? res.ocas : 'casual';
    var m = CJ.modal('<div class="contenido-foto"></div>');
    function pintar() {
      var h = '<h2>📸 Outfit del ' + CJ.esc(CJ.fechaLarga(fecha)) + '</h2>';
      h += '<div class="detalle-cols"><div class="detalle-img"><div class="marco"><img src="' + foto.mini + '" style="object-fit:cover;top:0;left:0;width:100%;height:100%"></div></div><div class="detalle-datos">';
      if (res && res.comentario) h += '<div class="aviso aviso-ok">💬 ' + CJ.esc(res.comentario) + '</div>';
      if (!res) h += '<p class="suave peq">' + (CJ.ia.activa() ? 'Elige las prendas que llevas.' : 'Sin clave de Claude: elige las prendas a mano (o agrega la clave en Ajustes para que las reconozca sola).') + '</p>';
      h += '<label class="peq"><b>Ocasión</b></label>' + CJ.chipsHtml(CJ.OCAS, ocas, 'ocas');
      h += '<label class="peq"><b>Prendas (' + ids.length + ')</b></label><div class="rejilla tres">';
      ids.forEach(function (id) {
        var p = CJ.prenda(id);
        h += '<div class="celda" data-quitar="' + id + '"><span class="insignia">✕</span><div class="marco fondo-cuadros">' + CJ.imgHtml(p.foto) + '</div></div>';
      });
      h += '</div><button class="btn btn-peq" data-agregar="1">＋ Agregar prenda</button>';
      if (res && res.noEncontradas && res.noEncontradas.length) {
        h += '<p class="peq suave mt">No encontré en tu clóset: ' + CJ.esc(res.noEncontradas.join(', ')) + '</p>';
      }
      h += '</div></div><div class="fila-btns mt"><button class="btn btn-pri" data-guardar="1">💾 Guardar en el calendario</button><button class="btn" data-cerrar="1">Cancelar</button></div>';
      m.el.innerHTML = '<button class="modal-cerrar" data-cerrar="1">✕</button>' + h;
      CJ.hidratar(m.el);
      CJ.activarChips(m.el, function (g, v) { ocas = v[0]; });
    }
    m.el.addEventListener('click', function (e) {
      var q = e.target.closest('[data-quitar]');
      if (q) { ids.splice(ids.indexOf(q.getAttribute('data-quitar')), 1); pintar(); return; }
      if (e.target.closest('[data-agregar]')) {
        CJ.elegirPrenda({ titulo: 'Agregar prenda al outfit' }).then(function (id) { if (id && ids.indexOf(id) < 0) { ids.push(id); pintar(); } });
        return;
      }
      if (e.target.closest('[data-guardar]')) {
        var fotoId = CJ.nuevoId('d_' + fecha + '_') + '.jpg';
        CJ.guardarFoto(fotoId, foto.data, foto.mini).then(function () {
          CJ.registrarLook(fecha, CJ.piezasDe(ids), { foto: fotoId, ocas: ocas });
          m.cerrar();
          CJ.toast('¡Outfit guardado! 💖', 'ok');
          CJ.refrescar();
        }).catch(CJ.fallo);
      }
    });
    pintar();
  };
})();
