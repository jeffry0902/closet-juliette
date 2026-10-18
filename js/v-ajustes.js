/* Ajustes: nube (GitHub privado), clave de Claude, respaldo JSON y preferencias. */
(function () {
  CJ.vistas.ajustes = {
    render: function (cont) {
      var n = CJ.ajustes.nube || {};
      var ult = CJ.meta.ultimaSync ? new Date(CJ.meta.ultimaSync) : null;
      var h = '<button class="btn btn-peq" data-acc="ir" data-v="mas">◀ Más</button><h1 class="mt">⚙️ Ajustes</h1>';

      h += '<div class="tarjeta-caja"><h2>☁️ Nube (GitHub privado)</h2>' +
        '<p class="peq suave">Comparte el clóset entre la iPad, tu celular y la PC, y sirve de respaldo automático. Usa un repositorio <b>privado</b> y un token con permiso solo para ese repo (ver GUIA-IPAD.md).</p>' +
        '<div class="campo"><label>Usuario de GitHub</label><input class="entrada" id="n-owner" value="' + CJ.esc(n.owner || '') + '" placeholder="jeffry0902" autocapitalize="off" autocorrect="off"></div>' +
        '<div class="campo"><label>Repositorio de datos (privado)</label><input class="entrada" id="n-repo" value="' + CJ.esc(n.repo || '') + '" placeholder="closet-juliette-datos" autocapitalize="off" autocorrect="off"></div>' +
        '<div class="campo"><label>Token</label><input class="entrada" id="n-token" type="password" value="' + CJ.esc(n.token || '') + '" placeholder="github_pat_…" autocapitalize="off" autocorrect="off"></div>' +
        '<div class="fila-btns"><button class="btn btn-pri" data-acc="aj-nube-guardar">💾 Guardar y probar</button>' +
        '<button class="btn" data-acc="nube-sync">🔄 Sincronizar ahora</button></div>' +
        '<p class="peq suave">' + (ult ? 'Última sincronización: ' + CJ.esc(CJ.fechaLarga(CJ.claveFecha(ult))) + ' ' + CJ.dos(ult.getHours()) + ':' + CJ.dos(ult.getMinutes()) : 'Nunca sincronizado') + (CJ.meta.sucio ? ' · hay cambios por subir' : '') + '</p></div>';

      h += '<div class="tarjeta-caja"><h2>💅 Claude (reconocer fotos y estilista)</h2>' +
        '<p class="peq suave">Clave de la API de Anthropic (console.anthropic.com). Se guarda solo en este dispositivo. Pon un límite de gasto mensual en la consola. Modelo: ' + CJ.esc(CJ.ia.MODELO) + '.</p>' +
        '<div class="campo"><input class="entrada" id="c-clave" type="password" value="' + CJ.esc(CJ.ajustes.claveClaude || '') + '" placeholder="sk-ant-…" autocapitalize="off" autocorrect="off"></div>' +
        '<button class="btn btn-pri" data-acc="aj-claude-guardar">💾 Guardar clave</button></div>';

      h += '<div class="tarjeta-caja"><h2>👗 Preferencias</h2><div class="campo"><label>No repetir una prenda en menos de…</label>' +
        CJ.chipsHtml([{ id: '3', nombre: '3 días' }, { id: '5', nombre: '5 días' }, { id: '7', nombre: '1 semana' }, { id: '14', nombre: '2 semanas' }], String(CJ.ajustes.evitarDias || 7), 'evitar') +
        '</div></div>';

      h += '<div class="tarjeta-caja"><h2>💾 Respaldo</h2>' +
        '<p class="peq suave">Archivo .json con todo (prendas, fotos, calendario). En la iPad con iOS 12 descargar archivos es limitado: allí el respaldo real es la nube. ' +
        'Para un archivo, abre la app en la PC (con la misma nube) y exporta desde ahí.</p>' +
        '<div class="fila-btns"><button class="btn" data-acc="aj-exportar">⬇️ Exportar respaldo</button>' +
        '<button class="btn" data-acc="aj-importar" data-modo="combinar">⬆️ Importar (combinar)</button>' +
        '<button class="btn btn-rojo" data-acc="aj-importar" data-modo="reemplazar">⬆️ Importar (reemplazar todo)</button></div>' +
        '<p class="peq suave">“Combinar” sirve también para cargar un lote de prendas generado por estudio.py.</p></div>';

      h += '<div class="tarjeta-caja"><h2>🧹 Zona peligrosa</h2><button class="btn btn-rojo" data-acc="aj-borrar-todo">Borrar todo de este dispositivo</button>' +
        '<p class="peq suave">Versión 1.0 · ' + Object.keys(CJ.datos.prendas).length + ' prendas · ' + Object.keys(CJ.minisCache).length + ' fotos en el dispositivo</p></div>';
      cont.innerHTML = h;
      CJ.activarChips(cont, function (g, v) {
        if (g === 'evitar') { CJ.ajustes.evitarDias = +v[0]; CJ.guardarAjustes(); CJ.toast('Guardado', 'ok'); }
      });
    }
  };

  CJ.acc['nube-sync'] = function () { return CJ.nube.sincronizar({ manual: true }).catch(function () { /* ya se mostró */ }); };

  CJ.acc['aj-nube-guardar'] = function () {
    CJ.ajustes.nube = {
      owner: CJ.$('#n-owner').value.trim(),
      repo: CJ.$('#n-repo').value.trim(),
      token: CJ.$('#n-token').value.trim(),
      rama: 'main'
    };
    CJ.guardarAjustes();
    if (!CJ.nube.activa()) { CJ.toast('Nube desactivada'); CJ.nube.iniciar(); return; }
    var espera = CJ.cargando('Probando conexión…');
    return CJ.nube.probar().then(function (r) {
      espera.cerrar();
      if (!r.escribir) throw new Error('El token no tiene permiso de escritura (Contents: Read and write)');
      if (!r.privado) CJ.toast('⚠️ Ojo: el repo ' + r.nombre + ' es PÚBLICO. Hazlo privado en GitHub.', 'error', 7000);
      else CJ.toast('✅ Conectado a ' + r.nombre, 'ok');
      CJ.nube.iniciar();
      return CJ.nube.sincronizar({ manual: true });
    }, function (e) { espera.cerrar(); throw e; }).then(function () { CJ.refrescar(); });
  };

  CJ.acc['aj-claude-guardar'] = function () {
    CJ.ajustes.claveClaude = CJ.$('#c-clave').value.trim();
    CJ.guardarAjustes();
    CJ.toast(CJ.ajustes.claveClaude ? 'Clave guardada 💅' : 'Clave borrada', 'ok');
  };

  CJ.acc['aj-exportar'] = function () {
    var espera = CJ.cargando('Preparando respaldo…');
    return CJ.exportar().then(function (texto) {
      espera.cerrar();
      var nombre = 'closet-juliette-' + CJ.hoy() + '.json';
      var blob = new Blob([texto], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = nombre;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
      CJ.toast('Respaldo listo (' + Math.round(texto.length / 1048576 * 10) / 10 + ' MB)', 'ok');
    }, function (e) { espera.cerrar(); throw e; });
  };

  CJ.acc['aj-importar'] = function (el) {
    var reemplazar = el.getAttribute('data-modo') === 'reemplazar';
    return CJ.elegirArchivos({}).then(function (archivos) {
      if (!archivos.length) return;
      return (reemplazar ? CJ.confirmar('¿Reemplazar TODO?', 'Se borrará lo que hay en este dispositivo y se cargará el archivo.', 'Reemplazar') : Promise.resolve(true)).then(function (si) {
        if (!si) return;
        var espera = CJ.cargando('Leyendo archivo…');
        return new Promise(function (ok, mal) {
          var r = new FileReader();
          r.onload = function () { ok(r.result); };
          r.onerror = function () { mal(new Error('No se pudo leer el archivo')); };
          r.readAsText(archivos[0]);
        }).then(function (texto) {
          var obj;
          try { obj = JSON.parse(texto); } catch (e) { throw new Error('El archivo no es un JSON válido'); }
          return CJ.importar(obj, reemplazar, function (i, n) { espera.texto('Cargando fotos ' + i + ' de ' + n + '…'); });
        }).then(function (r) {
          espera.cerrar();
          CJ.toast('✅ Importado: ' + r.prendas + ' prendas, ' + r.fotos + ' fotos', 'ok', 4000);
          CJ.refrescar();
        }, function (e) { espera.cerrar(); throw e; });
      });
    });
  };

  CJ.acc['aj-borrar-todo'] = function () {
    return CJ.confirmar('¿Borrar todo de este dispositivo?', 'Si tienes la nube configurada, los datos siguen allá y vuelven al sincronizar. Si no, se pierden.', 'Borrar todo').then(function (si) {
      if (!si) return;
      return Promise.all([CJ.db.limpiar('fotos'), CJ.db.limpiar('minis'), CJ.db.limpiar('kv')]).then(function () {
        try { localStorage.removeItem('cj_ajustes'); } catch (e) { /* nada */ }
        location.reload();
      });
    });
  };
})();
