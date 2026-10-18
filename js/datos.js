/* Modelo de datos en memoria + persistencia + fusión (para la nube y para importar).

   CJ.datos = {
     v: 1,
     prendas: { id: { id, cat, foto, color, ocas:[], marca, nombre, notas, creada, act } },
     outfits: { id: { id, nombre, piezas, ocas, act } },          // favoritos
     dias:    { 'AAAA-MM-DD': { fecha, looks:[{ id, piezas, foto, ocas }], act } },
     semana:  { lunes: { dia, outfit, ocas, act }, ... },
     perfil:  { cara, caraRecortada, piel, act },
     borrados:{ 'coleccion:id': marcaDeTiempo }
   }
   piezas = { arriba, abajo, vestido, zapatos, acc:[] }  (ids de prendas o null)
*/
(function () {
  var COLECCIONES = ['prendas', 'outfits', 'dias', 'semana'];

  CJ.vacio = function () {
    return { v: 1, prendas: {}, outfits: {}, dias: {}, semana: {}, perfil: { piel: '#e8b897', act: 0 }, borrados: {} };
  };
  CJ.datos = CJ.vacio();
  CJ.meta = { k: 'meta', datosSha: null, sucio: false, ultimaSync: 0 };
  CJ.minisCache = {};
  CJ.version = 0;

  var cacheGrande = {}, ordenGrande = [];

  CJ.mini = function (id) { return CJ.minisCache[id] || null; };

  CJ.cargarFoto = function (id) {
    if (!id) return Promise.resolve(null);
    if (cacheGrande[id]) return Promise.resolve(cacheGrande[id]);
    return CJ.db.get('fotos', id).then(function (r) {
      if (!r) return null;
      cacheGrande[id] = r.data;
      ordenGrande.push(id);
      while (ordenGrande.length > 8) delete cacheGrande[ordenGrande.shift()];
      return r.data;
    });
  };

  CJ.guardarFoto = function (id, data, mini) {
    CJ.minisCache[id] = mini;
    return CJ.db.put('fotos', { id: id, data: data }).then(function () {
      return CJ.db.put('minis', { id: id, data: mini });
    });
  };

  CJ.borrarFotoLocal = function (id) {
    delete CJ.minisCache[id];
    delete cacheGrande[id];
    return CJ.db.del('fotos', id).then(function () { return CJ.db.del('minis', id); });
  };

  CJ.cargar = function () {
    return CJ.db.get('kv', 'datos').then(function (r) {
      if (r && r.v) CJ.datos = normalizar(r.v);
      return CJ.db.get('kv', 'meta');
    }).then(function (m) {
      if (m) CJ.meta = m;
      return CJ.db.todos('minis');
    }).then(function (lista) {
      lista.forEach(function (x) { CJ.minisCache[x.id] = x.data; });
      CJ.version++;
    });
  };

  function normalizar(d) {
    var v = CJ.vacio();
    COLECCIONES.forEach(function (c) { v[c] = d[c] || {}; });
    v.perfil = d.perfil || v.perfil;
    v.borrados = d.borrados || {};
    return v;
  }
  CJ.normalizar = normalizar;

  /* Guardado con retardo para no escribir en cada toque */
  var temporizador = null;
  CJ.guardar = function (sinNube) {
    CJ.version++;
    CJ.meta.sucio = true;
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      CJ.guardarYa().catch(CJ.fallo);
    }, 250);
    if (!sinNube && CJ.nube) CJ.nube.programar();
  };
  CJ.guardarYa = function () {
    clearTimeout(temporizador);
    return CJ.db.put('kv', { k: 'datos', v: CJ.datos }).then(function () {
      return CJ.db.put('kv', CJ.meta);
    });
  };
  CJ.guardarMeta = function () { return CJ.db.put('kv', CJ.meta); };

  CJ.tocar = function (rec) { rec.act = Date.now(); return rec; };

  CJ.borrar = function (col, id) {
    delete CJ.datos[col][id];
    CJ.datos.borrados[col + ':' + id] = Date.now();
    CJ.guardar();
  };

  /* ---------- Fusión registro por registro (gana el más reciente; las lápidas borran) ---------- */
  CJ.fusionar = function (a, b) {
    a = normalizar(a); b = normalizar(b);
    var r = CJ.vacio();
    var k;
    for (k in a.borrados) r.borrados[k] = a.borrados[k];
    for (k in b.borrados) if (!r.borrados[k] || b.borrados[k] > r.borrados[k]) r.borrados[k] = b.borrados[k];
    COLECCIONES.forEach(function (col) {
      var ids = {}, id;
      for (id in a[col]) ids[id] = 1;
      for (id in b[col]) ids[id] = 1;
      for (id in ids) {
        var ra = a[col][id], rb = b[col][id];
        var g = !ra ? rb : !rb ? ra : ((rb.act || 0) > (ra.act || 0) ? rb : ra);
        var lapida = r.borrados[col + ':' + id];
        if (lapida && lapida >= (g.act || 0)) continue;
        r[col][id] = g;
      }
    });
    r.perfil = (b.perfil.act || 0) > (a.perfil.act || 0) ? b.perfil : a.perfil;
    /* Las lápidas viejas (más de 1 año) se descartan */
    var limite = Date.now() - 365 * 86400000;
    for (k in r.borrados) if (r.borrados[k] < limite) delete r.borrados[k];
    return r;
  };

  CJ.fotosReferenciadas = function (d) {
    var s = {}, id;
    for (id in d.prendas) if (d.prendas[id].foto) s[d.prendas[id].foto] = 1;
    for (id in d.dias) (d.dias[id].looks || []).forEach(function (l) { if (l.foto) s[l.foto] = 1; });
    if (d.perfil && d.perfil.cara) s[d.perfil.cara] = 1;
    return s;
  };

  /* ---------- Prendas y piezas ---------- */
  CJ.prenda = function (id) { return id ? CJ.datos.prendas[id] || null : null; };

  CJ.listaPrendas = function (filtro) {
    filtro = filtro || {};
    var lista = [];
    for (var id in CJ.datos.prendas) {
      var p = CJ.datos.prendas[id];
      if (filtro.cat && filtro.cat !== 'todo' && p.cat !== filtro.cat) continue;
      if (filtro.cats && filtro.cats.indexOf(p.cat) < 0) continue;
      if (filtro.ocas && filtro.ocas !== 'todas' && !CJ.sirvePara(p, filtro.ocas)) continue;
      lista.push(p);
    }
    lista.sort(function (x, y) { return (y.creada || 0) - (x.creada || 0); });
    return lista;
  };

  /* Una prenda sin ocasiones marcadas sirve para cualquiera */
  CJ.sirvePara = function (p, ocas) { return !p.ocas || !p.ocas.length || p.ocas.indexOf(ocas) >= 0; };

  CJ.piezasVacias = function () { return { arriba: null, abajo: null, vestido: null, zapatos: null, acc: [] }; };

  CJ.idsDe = function (piezas) {
    if (!piezas) return [];
    var ids = [];
    ['vestido', 'arriba', 'abajo', 'zapatos'].forEach(function (k) { if (piezas[k] && CJ.prenda(piezas[k])) ids.push(piezas[k]); });
    (piezas.acc || []).forEach(function (a) { if (CJ.prenda(a)) ids.push(a); });
    return ids;
  };

  /* Convierte una lista de ids en piezas según la categoría de cada prenda */
  CJ.piezasDe = function (ids) {
    var p = CJ.piezasVacias();
    ids.forEach(function (id) {
      var pr = CJ.prenda(id);
      if (!pr) return;
      var carril = CJ.cat(pr.cat).carril;
      if (carril === 'acc') { if (p.acc.indexOf(id) < 0) p.acc.push(id); }
      else if (!p[carril]) p[carril] = id;
    });
    if (p.vestido) { p.arriba = null; p.abajo = null; }
    return p;
  };

  CJ.firma = function (piezas) {
    if (!piezas) return '';
    return piezas.vestido ? 'v:' + piezas.vestido : (piezas.arriba || '-') + '+' + (piezas.abajo || '-');
  };

  CJ.nombrePrenda = function (p) {
    if (!p) return '';
    if (p.nombre) return p.nombre;
    var c = CJ.color(p.color);
    var cat = CJ.cat(p.cat);
    var base = (cat.corto || cat.nombre).replace(/s$/, '');
    if (p.cat === 'pantalones') base = 'Pantalón';
    if (p.cat === 'zapatos') base = 'Zapatos';
    if (p.cat === 'accesorios') base = 'Accesorio';
    return base + (c ? ' ' + c.n.toLowerCase() : '');
  };

  /* ---------- Uso de prendas (para no repetir) ---------- */
  var cacheUsos = null, versionUsos = -1;
  CJ.usos = function () {
    if (cacheUsos && versionUsos === CJ.version) return cacheUsos;
    var u = {};
    var fechas = Object.keys(CJ.datos.dias).sort();
    fechas.forEach(function (f) {
      var dia = CJ.datos.dias[f];
      var vistos = {};
      (dia.looks || []).forEach(function (l) {
        CJ.idsDe(l.piezas).forEach(function (id) {
          if (vistos[id]) return;
          vistos[id] = 1;
          if (!u[id]) u[id] = { n: 0, ultima: null, fechas: [] };
          u[id].n++;
          u[id].ultima = f;
          u[id].fechas.push(f);
        });
      });
    });
    cacheUsos = u; versionUsos = CJ.version;
    return u;
  };
  CJ.uso = function (id) { return CJ.usos()[id] || { n: 0, ultima: null, fechas: [] }; };

  /* Cuántas veces se usó una prenda en un rango de fechas */
  CJ.usosEnRango = function (id, desde, hasta) {
    return CJ.uso(id).fechas.filter(function (f) { return f >= desde && f <= hasta; }).length;
  };

  /* Registrar un look en un día */
  CJ.registrarLook = function (fecha, piezas, extra) {
    extra = extra || {};
    var dia = CJ.datos.dias[fecha] || { fecha: fecha, looks: [] };
    dia = CJ.copiar(dia);
    var look = { id: CJ.nuevoId('l'), piezas: piezas, foto: extra.foto || null, ocas: extra.ocas || null };
    /* Si ya hay un look de la misma ocasión sin foto ni piezas, se reemplaza */
    dia.looks.push(look);
    CJ.datos.dias[fecha] = CJ.tocar(dia);
    delete CJ.datos.borrados['dias:' + fecha];
    CJ.guardar();
    return look;
  };

  CJ.lookUsado = function (piezas) {
    /* última vez que se usó exactamente esta combinación principal */
    var firma = CJ.firma(piezas), ultima = null;
    for (var f in CJ.datos.dias) {
      (CJ.datos.dias[f].looks || []).forEach(function (l) {
        if (CJ.firma(l.piezas) === firma && (!ultima || f > ultima)) ultima = f;
      });
    }
    return ultima;
  };

  /* ---------- Respaldo ---------- */
  CJ.exportar = function () {
    return CJ.db.todos('fotos').then(function (fotos) {
      var refs = CJ.fotosReferenciadas(CJ.datos);
      var mapa = {};
      fotos.forEach(function (f) { if (refs[f.id]) mapa[f.id] = f.data; });
      return JSON.stringify({ app: 'closet-juliette', tipo: 'respaldo', v: 1, fecha: new Date().toISOString(), datos: CJ.datos, fotos: mapa });
    });
  };

  CJ.importar = function (obj, reemplazar, progreso) {
    if (!obj || obj.app !== 'closet-juliette' || !obj.datos) return Promise.reject(new Error('Este archivo no es un respaldo del Clóset de Juliette'));
    var pasos = Promise.resolve();
    if (reemplazar) {
      pasos = pasos.then(function () { return CJ.db.limpiar('fotos'); })
        .then(function () { return CJ.db.limpiar('minis'); })
        .then(function () { CJ.minisCache = {}; CJ.datos = CJ.vacio(); CJ.meta.datosSha = null; });
    }
    var ids = Object.keys(obj.fotos || {});
    var hechas = 0;
    ids.forEach(function (id) {
      pasos = pasos.then(function () {
        if (!reemplazar && CJ.minisCache[id]) { hechas++; return; }
        var data = obj.fotos[id];
        return CJ.img.hacerMini(data).then(function (mini) {
          hechas++;
          if (progreso) progreso(hechas, ids.length);
          return CJ.guardarFoto(id, data, mini);
        });
      });
    });
    return pasos.then(function () {
      var entrante = normalizar(obj.datos);
      /* Un lote nuevo de la PC siempre debe ganar: se marca con la hora actual si no trae act */
      CJ.datos = CJ.fusionar(CJ.datos, entrante);
      CJ.guardar();
      return CJ.guardarYa();
    }).then(function () { return { fotos: ids.length, prendas: Object.keys(obj.datos.prendas || {}).length }; });
  };

  /* Borra del dispositivo las fotos que ya nadie usa */
  CJ.limpiarFotosHuerfanas = function () {
    var refs = CJ.fotosReferenciadas(CJ.datos);
    return CJ.db.claves('fotos').then(function (claves) {
      var p = Promise.resolve();
      claves.forEach(function (id) { if (!refs[id]) p = p.then(function () { return CJ.borrarFotoLocal(id); }); });
      return p;
    });
  };
})();
