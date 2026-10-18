/* Overlay de errores: muestra en pantalla cualquier error de JavaScript.
   Escrito en ES5 a propósito para que funcione aunque otro archivo falle. */
(function () {
  var caja = null, lista = null, cuenta = 0;

  function crear() {
    if (caja) return;
    caja = document.createElement('div');
    caja.id = 'errores';
    caja.setAttribute('style',
      'position:fixed;left:0;right:0;top:0;z-index:99999;max-height:60%;overflow:auto;' +
      '-webkit-overflow-scrolling:touch;background:#b00020;color:#fff;font:15px/1.4 Menlo,monospace;' +
      'padding:12px 12px 12px 12px;box-shadow:0 4px 16px rgba(0,0,0,.4)');
    var barra = document.createElement('div');
    barra.setAttribute('style', 'overflow:hidden;margin-bottom:8px');
    var t = document.createElement('b');
    t.textContent = '⚠️ Error en la app (toma foto de esto)';
    t.setAttribute('style', 'float:left;font-size:17px;line-height:44px');
    var cerrar = document.createElement('button');
    cerrar.textContent = 'Cerrar';
    cerrar.setAttribute('style', 'float:right;font-size:18px;height:44px;padding:0 18px;border:0;border-radius:10px;background:#fff;color:#b00020');
    cerrar.onclick = function () { caja.parentNode.removeChild(caja); caja = null; cuenta = 0; };
    var recargar = document.createElement('button');
    recargar.textContent = 'Recargar';
    recargar.setAttribute('style', 'float:right;margin-right:10px;font-size:18px;height:44px;padding:0 18px;border:0;border-radius:10px;background:#ffd93b;color:#000');
    recargar.onclick = function () { location.reload(); };
    barra.appendChild(t); barra.appendChild(cerrar); barra.appendChild(recargar);
    lista = document.createElement('div');
    caja.appendChild(barra); caja.appendChild(lista);
    (document.body || document.documentElement).appendChild(caja);
  }

  function mostrar(texto) {
    try {
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', function () { mostrar(texto); });
        return;
      }
      crear();
      cuenta++;
      if (cuenta > 30) return;
      var p = document.createElement('pre');
      p.setAttribute('style', 'white-space:pre-wrap;word-wrap:break-word;margin:0 0 10px 0;padding:8px;background:rgba(0,0,0,.25);border-radius:8px');
      var hora = new Date();
      p.textContent = '[' + hora.toTimeString().slice(0, 8) + '] ' + texto;
      lista.appendChild(p);
    } catch (e) { /* nada que hacer */ }
  }

  window.onerror = function (msg, src, linea, col, err) {
    var archivo = String(src || '').split('/').pop();
    var txt = msg + '\n' + archivo + ' línea ' + linea + ':' + col;
    if (err && err.stack) txt += '\n' + err.stack;
    mostrar(txt);
    return false;
  };

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    var txt = 'Promesa sin manejar: ' + (r && r.message ? r.message : String(r));
    if (r && r.stack) txt += '\n' + r.stack;
    mostrar(txt);
  });

  window.CJerror = mostrar;
})();
