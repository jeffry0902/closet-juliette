/* Nube: sincroniza con un repositorio PRIVADO de GitHub (por ejemplo jeffry0902/closet-juliette-datos).
   Estructura del repo:  datos.json  +  fotos/<id>.png|jpg
   Así la iPad, el celular y la PC (script de Python) comparten el mismo clóset. */
CJ.nube = (function () {
  var ocupado = false, temporizador = null;

  function conf() { return CJ.ajustes.nube || {}; }
  function activa() { var c = conf(); return !!(c.owner && c.repo && c.token); }

  function estado(clase, texto) {
    var b = document.getElementById('nube-estado');
    if (!b) return;
    b.className = 'nube-estado ' + (clase || '');
    b.setAttribute('aria-label', texto || '');
  }

  function api(metodo, ruta, cuerpo) {
    var c = conf();
    var url = 'https://api.github.com/repos/' + encodeURIComponent(c.owner) + '/' + encodeURIComponent(c.repo) + ruta;
    var op = {
      method: metodo,
      headers: {
        'Authorization': 'Bearer ' + c.token.trim(),
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      }
    };
    if (cuerpo) op.body = JSON.stringify(cuerpo);
    return fetch(url, op).then(function (r) {
      if (r.status === 204) return null;
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
        if (!r.ok) {
          var msg = j && j.message ? j.message : t.slice(0, 160);
          var err = new Error('GitHub ' + r.status + ': ' + msg);
          err.status = r.status;
          throw err;
        }
        return j;
      });
    }, function () {
      throw new Error('Sin conexión con GitHub (revisa el Wi-Fi)');
    });
  }

  function utf8B64(s) { return btoa(unescape(encodeURIComponent(s))); }
  function b64Utf8(b) { return decodeURIComponent(escape(atob(b.replace(/\s/g, '')))); }

  function blob(sha) {
    return api('GET', '/git/blobs/' + sha).then(function (j) { return j.content.replace(/\s/g, ''); });
  }

  function dispositivo() {
    if (window.navigator.standalone) return 'iPad (pared)';
    if (/iPhone|Android/i.test(navigator.userAgent)) return 'celular';
    if (/iPad/i.test(navigator.userAgent)) return 'iPad';
    return 'PC';
  }

  function inicializar() {
    return api('PUT', '/contents/LEEME.md', {
      message: 'Clóset de Juliette: repositorio de datos',
      content: utf8B64('# Datos del Clóset de Juliette\n\nNo edites a mano: la app guarda aquí `datos.json` y la carpeta `fotos/`.\n')
    });
  }

  async function obtenerRef(rama) {
    try {
      return await api('GET', '/git/ref/heads/' + rama + '?_=' + Date.now());
    } catch (e) {
      if (e.status === 409) { await inicializar(); return api('GET', '/git/ref/heads/' + rama + '?_=' + Date.now()); }
      if (e.status === 404) throw new Error('No encuentro el repositorio o la rama "' + rama + '". Revisa los datos en Ajustes.');
      throw e;
    }
  }

  async function unaVez(progreso) {
    var versionInicio = CJ.version;
    var rama = conf().rama || 'main';
    var ref = await obtenerRef(rama);
    var padre = ref.object.sha;
    var commit = await api('GET', '/git/commits/' + padre);
    var arbol = await api('GET', '/git/trees/' + commit.tree.sha + '?recursive=1');
    var remotos = {};
    arbol.tree.forEach(function (n) { if (n.type === 'blob') remotos[n.path] = n.sha; });

    var fusion = CJ.datos, remotoCambio = false;
    var shaDatos = remotos['datos.json'];
    if (shaDatos && shaDatos !== CJ.meta.datosSha) {
      var remoto = JSON.parse(b64Utf8(await blob(shaDatos)));
      fusion = CJ.fusionar(CJ.datos, remoto);
      remotoCambio = true;
    }

    /* 1. Bajar fotos que faltan en este dispositivo */
    var refs = CJ.fotosReferenciadas(fusion);
    var faltan = Object.keys(refs).filter(function (id) { return !CJ.minisCache[id] && remotos['fotos/' + id]; });
    for (var i = 0; i < faltan.length; i++) {
      if (progreso) progreso('Bajando fotos ' + (i + 1) + ' de ' + faltan.length);
      var id = faltan[i];
      var mime = /\.png$/i.test(id) ? 'image/png' : 'image/jpeg';
      var data = 'data:' + mime + ';base64,' + await blob(remotos['fotos/' + id]);
      var mini = await CJ.img.hacerMini(data, CJ.ladoMini(id));
      await CJ.guardarFoto(id, data, mini);
    }

    /* 2. Subir fotos nuevas de este dispositivo */
    var entradas = [];
    var subir = Object.keys(refs).filter(function (id) { return !remotos['fotos/' + id] && CJ.minisCache[id]; });
    for (var j = 0; j < subir.length; j++) {
      if (progreso) progreso('Subiendo fotos ' + (j + 1) + ' de ' + subir.length);
      var d = await CJ.cargarFoto(subir[j]);
      if (!d) continue;
      var b = await api('POST', '/git/blobs', { content: d.split(',')[1], encoding: 'base64' });
      entradas.push({ path: 'fotos/' + subir[j], mode: '100644', type: 'blob', sha: b.sha });
    }

    /* 3. Quitar de la nube fotos que ya nadie usa. Solo los tipos que esta versión conoce:
       una versión vieja de la app nunca debe borrar fotos de funciones nuevas que no entiende. */
    var CONOCIDAS = /^fotos\/(p|d_|cara_|cuerpo_)/;
    Object.keys(remotos).forEach(function (p) {
      if (CONOCIDAS.test(p) && !refs[p.slice(6)]) entradas.push({ path: p, mode: '100644', type: 'blob', sha: null });
    });

    /* 4. Subir datos.json si hay cambios locales */
    var nuevoSha = shaDatos;
    if (CJ.meta.sucio || !shaDatos) {
      var bd = await api('POST', '/git/blobs', { content: utf8B64(JSON.stringify(fusion)), encoding: 'base64' });
      entradas.push({ path: 'datos.json', mode: '100644', type: 'blob', sha: bd.sha });
      nuevoSha = bd.sha;
    }

    if (entradas.length) {
      if (progreso) progreso('Guardando en la nube…');
      var t = await api('POST', '/git/trees', { base_tree: commit.tree.sha, tree: entradas });
      var nc = await api('POST', '/git/commits', { message: 'Sincronización desde ' + dispositivo(), tree: t.sha, parents: [padre] });
      try {
        await api('PATCH', '/git/refs/heads/' + rama, { sha: nc.sha, force: false });
      } catch (e) {
        if (e.status === 422 || e.status === 409) return 'reintentar';
        throw e;
      }
    }

    var cambiosDurante = CJ.version !== versionInicio;
    CJ.datos = CJ.fusionar(CJ.datos, fusion);
    CJ.meta.datosSha = nuevoSha;
    CJ.meta.sucio = cambiosDurante;
    CJ.meta.ultimaSync = Date.now();
    CJ.version++;
    await CJ.guardarYa();
    if (remotoCambio || faltan.length) {
      await CJ.limpiarFotosHuerfanas();
      if (CJ.refrescar) CJ.refrescar();
    }
    if (cambiosDurante) programar();
    return { bajadas: faltan.length, subidas: subir.length, remotoCambio: remotoCambio };
  }

  async function sincronizar(opts) {
    opts = opts || {};
    if (!activa()) {
      estado('apagada', 'Nube sin configurar');
      if (opts.manual) CJ.toast('Primero configura la nube en Más → Ajustes');
      return null;
    }
    if (ocupado) { if (opts.manual) CJ.toast('Ya estoy sincronizando…'); return null; }
    ocupado = true;
    clearTimeout(temporizador);
    estado('girando', 'Sincronizando');
    var aviso = opts.manual ? CJ.cargando('Sincronizando con la nube…') : null;
    try {
      var r = 'reintentar';
      for (var i = 0; i < 3 && r === 'reintentar'; i++) r = await unaVez(aviso ? aviso.texto : null);
      if (r === 'reintentar') throw new Error('La nube cambió mientras sincronizaba; intenta otra vez');
      estado('', 'Nube al día');
      if (opts.manual) CJ.toast('☁️ Todo sincronizado' + (r.bajadas ? ' · ' + r.bajadas + ' fotos nuevas' : ''), 'ok');
      return r;
    } catch (e) {
      estado('error', e.message);
      if (opts.manual) CJ.fallo(e); else if (window.console) console.warn('Sincronización:', e);
      throw e;
    } finally {
      ocupado = false;
      if (aviso) aviso.cerrar();
    }
  }

  function programar(ms) {
    if (!activa()) return;
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { sincronizar().catch(function () { /* se reintenta luego */ }); }, ms || 15000);
  }

  function probar() {
    return api('GET', '?_=' + Date.now()).then(function (r) {
      return { privado: !!r['private'], escribir: !r.permissions || !!r.permissions.push, nombre: r.full_name };
    });
  }

  function iniciar() {
    if (!activa()) { estado('apagada', 'Nube sin configurar'); return; }
    estado('', '');
    programar(1500);
    setInterval(function () { if (!document.hidden) programar(500); }, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) programar(800); });
  }

  return { sincronizar: sincronizar, programar: programar, probar: probar, iniciar: iniciar, activa: activa, ocupado: function () { return ocupado; } };
})();
