/* Motor de outfits sin internet: armonía de colores + no repetir + variedad. */
CJ.motor = (function () {
  var CATS_CARRIL = { arriba: ['tops'], abajo: ['pantalones', 'faldas'], vestido: ['vestidos'], zapatos: ['zapatos'], acc: ['accesorios'] };

  function opciones(carril, ocas) {
    var todas = CJ.listaPrendas({ cats: CATS_CARRIL[carril] });
    if (!ocas || ocas === 'todas') return todas;
    var filtradas = todas.filter(function (p) { return CJ.sirvePara(p, ocas); });
    return filtradas.length ? filtradas : todas;
  }

  function difTono(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

  function puntajeColores(ids) {
    var fuertes = [], estampados = 0;
    ids.forEach(function (id) {
      var p = CJ.prenda(id);
      var c = p ? CJ.color(p.color) : null;
      if (!c) return;
      if (c.estampado) estampados++;
      else if (!c.neutro) {
        for (var i = 0; i < fuertes.length; i++) if (difTono(fuertes[i], c.h) < 12) return;
        fuertes.push(c.h);
      }
    });
    var s = 0;
    if (estampados > 1) s -= 4;
    if (estampados === 1 && fuertes.length > 1) s -= 1.5;
    if (fuertes.length <= 1) s += 2;
    else if (fuertes.length === 2) {
      var d = difTono(fuertes[0], fuertes[1]);
      if (d <= 35) s += 1.5; else if (d >= 150) s += 1; else if (d < 100) s -= 1.5;
    } else s -= 2 * (fuertes.length - 2) + 1;
    return s;
  }

  function puntajeFrescura(piezas, fecha, evitarIds) {
    var evitar = CJ.ajustes.evitarDias || 7, s = 0;
    CJ.idsDe(piezas).forEach(function (id) {
      var p = CJ.prenda(id);
      var peso = (p.cat === 'zapatos' || p.cat === 'accesorios') ? 0.35 : 1;
      var u = CJ.uso(id);
      if (u.ultima) {
        var d = CJ.diasEntre(u.ultima, fecha);
        if (d >= 0 && d < evitar) s -= (evitar - d) * 0.8 * peso;
      }
      s += 1.5 / (1 + u.n) * peso;
      if (evitarIds && evitarIds[id]) s -= 4 * peso;
    });
    var ultimaCombo = CJ.lookUsado(piezas);
    if (ultimaCombo) {
      var dc = CJ.diasEntre(ultimaCombo, fecha);
      if (dc >= 0 && dc < 30) s -= 3;
    }
    return s;
  }

  function puntaje(piezas, fecha, evitarIds) {
    return puntajeColores(CJ.idsDe(piezas)) + puntajeFrescura(piezas, fecha || CJ.hoy(), evitarIds);
  }

  /* Genera una combinación respetando las piezas fijas (candados) */
  function generar(ocas, fijas) {
    fijas = fijas || {};
    var p = CJ.piezasVacias();
    var vestidos = opciones('vestido', ocas), tops = opciones('arriba', ocas), abajos = opciones('abajo', ocas);
    var usarVestido;
    if (fijas.vestido) usarVestido = true;
    else if (fijas.arriba || fijas.abajo) usarVestido = false;
    else if (!vestidos.length) usarVestido = false;
    else if (!tops.length || !abajos.length) usarVestido = true;
    else usarVestido = Math.random() < vestidos.length / (vestidos.length + Math.min(tops.length, abajos.length) * 1.5);
    if (usarVestido) p.vestido = fijas.vestido || (CJ.azar(vestidos) || {}).id || null;
    else {
      p.arriba = fijas.arriba || (CJ.azar(tops) || {}).id || null;
      p.abajo = fijas.abajo || (CJ.azar(abajos) || {}).id || null;
    }
    p.zapatos = fijas.zapatos || (CJ.azar(opciones('zapatos', ocas)) || {}).id || null;
    if (fijas.acc && fijas.acc.length) p.acc = fijas.acc.slice();
    else {
      var accs = opciones('acc', ocas);
      if (accs.length && Math.random() < 0.5) p.acc = [CJ.azar(accs).id];
    }
    return p;
  }

  function candidatos(ocas, fijas, cuantos, fecha, evitarIds) {
    var lista = [], vistos = {};
    for (var i = 0; i < cuantos; i++) {
      var p = generar(ocas, fijas);
      var clave = CJ.idsDe(p).join(',');
      if (!clave || vistos[clave]) continue;
      vistos[clave] = 1;
      lista.push({ piezas: p, s: puntaje(p, fecha, evitarIds) + Math.random() * 0.8 });
    }
    lista.sort(function (a, b) { return b.s - a.s; });
    return lista;
  }

  function sorprendeme(ocas, fijas, fecha) {
    var c = candidatos(ocas, fijas, 90, fecha);
    if (!c.length) return null;
    return c[Math.floor(Math.random() * Math.min(5, c.length))].piezas;
  }

  /* Ideas de outfits alrededor de una prenda base */
  function ideasCon(prendaId, ocas, n) {
    var pr = CJ.prenda(prendaId);
    if (!pr) return [];
    var carril = CJ.cat(pr.cat).carril;
    var fijas = {};
    if (carril === 'acc') fijas.acc = [prendaId]; else fijas[carril] = prendaId;
    var c = candidatos(ocas, fijas, 220, CJ.hoy());
    var vistos = {}, salida = [];
    for (var i = 0; i < c.length && salida.length < (n || 6); i++) {
      var f = CJ.firma(c[i].piezas);
      if (vistos[f]) continue;
      vistos[f] = 1;
      salida.push(c[i].piezas);
    }
    return salida;
  }

  /* Plan de la semana: cada día con su ocasión, sin repetir prendas principales */
  function armarSemana() {
    var plan = {}, usados = {};
    var hoy = CJ.hoy();
    CJ.DIAS.forEach(function (dia, i) {
      var ocas = (CJ.ajustes.semanaOcas || {})[dia] || 'casual';
      var c = candidatos(ocas, {}, 120, CJ.sumarDias(hoy, i), usados);
      if (!c.length) return;
      var elegido = c[Math.floor(Math.random() * Math.min(3, c.length))].piezas;
      CJ.idsDe(elegido).forEach(function (id) { usados[id] = 1; });
      plan[dia] = { piezas: elegido, ocas: ocas };
    });
    return plan;
  }

  /* Texto de aviso de repetición para una prenda */
  function avisoUso(id) {
    var u = CJ.uso(id);
    if (!u.ultima) return { txt: 'Nunca usada ✨', alerta: false };
    var d = CJ.diasEntre(u.ultima, CJ.hoy());
    return { txt: '×' + u.n + ' · ' + CJ.haceTxt(u.ultima), alerta: d >= 0 && d < (CJ.ajustes.evitarDias || 7) };
  }

  return {
    opciones: opciones, generar: generar, sorprendeme: sorprendeme, ideasCon: ideasCon,
    armarSemana: armarSemana, puntaje: puntaje, puntajeColores: puntajeColores, avisoUso: avisoUso
  };
})();
