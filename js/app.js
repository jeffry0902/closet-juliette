/* Arranque, navegación entre pantallas y delegación de toques. */
(function () {
  var actual = 'hoy', parametros = null;
  var PESTANAS = { hoy: 'hoy', closet: 'closet', armar: 'armar', calendario: 'calendario' };

  CJ.ir = function (vista, params) {
    if (!CJ.vistas[vista]) return;
    CJ.cerrarModales();
    actual = vista; parametros = params || null;
    CJ.$$('.vista').forEach(function (s) { s.classList.remove('activa'); });
    var cont = document.getElementById('v-' + vista);
    cont.classList.add('activa');
    var tab = PESTANAS[vista] || 'mas';
    CJ.$$('#nav .tab').forEach(function (t) { t.classList.toggle('activa', t.getAttribute('data-v') === tab); });
    pintar(cont, parametros);
    document.getElementById('principal').scrollTop = 0;
  };

  function pintar(cont, params) {
    try {
      CJ.vistas[actual].render(cont, params);
      if (CJ.vistas[actual].alMostrar) CJ.vistas[actual].alMostrar(cont);
      CJ.hidratar(cont);
    } catch (e) {
      cont.innerHTML = '<div class="aviso">No se pudo mostrar esta pantalla: ' + CJ.esc(e.message) + '</div>';
      if (window.CJerror) window.CJerror('Error al mostrar "' + actual + '": ' + e.message + '\n' + (e.stack || ''));
    }
  }

  /* Vuelve a pintar la pantalla actual sin perder el scroll */
  CJ.refrescar = function () {
    var p = document.getElementById('principal');
    var y = p.scrollTop;
    pintar(document.getElementById('v-' + actual), null);
    p.scrollTop = y;
    actualizarFecha();
  };

  function actualizarFecha() {
    var e = document.getElementById('cab-fecha');
    if (e) e.textContent = CJ.fechaLarga(CJ.hoy()) + ' · ' + Object.keys(CJ.datos.prendas).length + ' prendas';
  }

  CJ.acc.ir = function (el) { CJ.ir(el.getAttribute('data-v')); };

  /* Un solo escuchador para todos los botones con data-acc */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-acc]') : null;
    if (!el || el.disabled) return;
    var f = CJ.acc[el.getAttribute('data-acc')];
    if (!f) return;
    e.preventDefault();
    try {
      var r = f(el, e);
      if (r && typeof r.then === 'function') r.then(null, CJ.fallo);
    } catch (err) { CJ.fallo(err); }
  });

  /* Evitar zoom con pellizco y el menú de mantener presionado (pantalla fija en la pared) */
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { if (!e.target.closest('input,textarea')) e.preventDefault(); });

  /* Al cambiar el día (la iPad está siempre encendida) se repinta "Hoy" */
  var diaVisto = CJ.hoy();
  setInterval(function () {
    if (CJ.hoy() !== diaVisto) { diaVisto = CJ.hoy(); CJ.refrescar(); }
  }, 60 * 1000);

  /* Actualización automática: si se publicó una versión nueva, se recarga sola (la iPad está fija en Acceso guiado).
     Se navega a una URL distinta para saltarse la caché de Safari. */
  CJ.VERSION = '5';
  function revisarVersion() {
    fetch('version.json?_=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var v = String(j.v || '');
      if (!v || v === CJ.VERSION) return;
      var intentos = 0;
      try { intentos = +(sessionStorage.getItem('cj_act_' + v) || 0); sessionStorage.setItem('cj_act_' + v, intentos + 1); } catch (e) { /* nada */ }
      if (intentos < 2) location.replace('index.html?v=' + encodeURIComponent(v));
    }).catch(function () { /* sin internet: se intenta luego */ });
  }
  setInterval(revisarVersion, 30 * 60 * 1000);

  function arrancar() {
    revisarVersion();
    CJ.db.abrir().then(CJ.cargar).then(function () {
      actualizarFecha();
      CJ.ir('hoy');
      CJ.nube.iniciar();
    }).catch(function (e) {
      document.getElementById('v-hoy').innerHTML = '<div class="aviso">No se pudo abrir el almacenamiento: ' + CJ.esc(e.message) + '</div>';
      document.getElementById('v-hoy').classList.add('activa');
      if (window.CJerror) window.CJerror('Arranque: ' + e.message + '\n' + (e.stack || ''));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
