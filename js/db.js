/* IndexedDB: 'kv' (datos y meta), 'fotos' (imagen completa) y 'minis' (miniaturas).
   Las fotos se guardan como texto dataURL: los Blobs en IndexedDB fallan en iOS 12. */
CJ.db = (function () {
  var NOMBRE = 'closetJuliette', VERSION = 1, base = null;

  function abrir() {
    return new Promise(function (ok, mal) {
      if (!window.indexedDB) { mal(new Error('Este navegador no tiene IndexedDB')); return; }
      var req = indexedDB.open(NOMBRE, VERSION);
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'k' });
        if (!d.objectStoreNames.contains('fotos')) d.createObjectStore('fotos', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('minis')) d.createObjectStore('minis', { keyPath: 'id' });
      };
      req.onsuccess = function () { base = req.result; ok(base); };
      req.onerror = function () { mal(req.error || new Error('No se pudo abrir la base de datos')); };
      req.onblocked = function () { mal(new Error('Base de datos bloqueada: cierra otras pestañas de la app')); };
    });
  }

  function tx(almacen, modo, fn) {
    return new Promise(function (ok, mal) {
      var t = base.transaction(almacen, modo);
      var resultado;
      t.oncomplete = function () { ok(resultado); };
      t.onerror = function () { mal(t.error || new Error('Error de base de datos')); };
      t.onabort = function () { mal(t.error || new Error('Operación cancelada (¿sin espacio?)')); };
      resultado = fn(t.objectStore(almacen));
    });
  }

  function get(almacen, clave) {
    return new Promise(function (ok, mal) {
      var r = base.transaction(almacen, 'readonly').objectStore(almacen).get(clave);
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { mal(r.error); };
    });
  }

  function put(almacen, obj) { return tx(almacen, 'readwrite', function (s) { s.put(obj); }); }
  function putVarios(almacen, lista) { return tx(almacen, 'readwrite', function (s) { lista.forEach(function (o) { s.put(o); }); }); }
  function del(almacen, clave) { return tx(almacen, 'readwrite', function (s) { s['delete'](clave); }); }
  function limpiar(almacen) { return tx(almacen, 'readwrite', function (s) { s.clear(); }); }

  /* Recorre con cursor (más seguro que getAll en iOS 12) */
  function todos(almacen) {
    return new Promise(function (ok, mal) {
      var lista = [];
      var r = base.transaction(almacen, 'readonly').objectStore(almacen).openCursor();
      r.onsuccess = function () {
        var c = r.result;
        if (c) { lista.push(c.value); c['continue'](); } else ok(lista);
      };
      r.onerror = function () { mal(r.error); };
    });
  }

  function claves(almacen) {
    return new Promise(function (ok, mal) {
      var lista = [];
      var s = base.transaction(almacen, 'readonly').objectStore(almacen);
      var r = s.openKeyCursor ? s.openKeyCursor() : s.openCursor();
      r.onsuccess = function () {
        var c = r.result;
        if (c) { lista.push(c.primaryKey); c['continue'](); } else ok(lista);
      };
      r.onerror = function () { mal(r.error); };
    });
  }

  return { abrir: abrir, get: get, put: put, putVarios: putVarios, del: del, limpiar: limpiar, todos: todos, claves: claves };
})();
