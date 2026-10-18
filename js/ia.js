/* Claude: reconoce prendas en la foto del outfit del día y arma outfits a pedido.
   Safari 12 no puede usar el SDK oficial (requiere build moderno), así que se llama a la API por HTTP
   con streaming SSE vía XMLHttpRequest para que la conexión no se corte durante respuestas largas. */
CJ.ia = (function () {
  var MODELO = 'claude-opus-5-5';
  var URL_API = 'https://api.anthropic.com/v1/messages';

  function activa() { return !!(CJ.ajustes.claveClaude || '').trim(); }

  function llamar(cuerpo, conFallback) {
    return new Promise(function (ok, mal) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', URL_API, true);
      xhr.setRequestHeader('content-type', 'application/json');
      xhr.setRequestHeader('x-api-key', CJ.ajustes.claveClaude.trim());
      xhr.setRequestHeader('anthropic-version', '2023-06-01');
      xhr.setRequestHeader('anthropic-dangerous-direct-browser-access', 'true');
      if (conFallback) xhr.setRequestHeader('anthropic-beta', 'server-side-fallback-2026-07-01');
      xhr.timeout = 240000;

      var visto = 0, resto = '', texto = '', stop = null, errApi = null;
      function procesar(final) {
        var nuevo = xhr.responseText.slice(visto);
        visto = xhr.responseText.length;
        resto += nuevo;
        if (final) resto += '\n\n';
        var eventos = resto.split('\n\n');
        resto = eventos.pop();
        eventos.forEach(function (ev) {
          var data = '';
          ev.split('\n').forEach(function (l) { if (l.indexOf('data:') === 0) data += l.slice(5).trim(); });
          if (!data) return;
          var j;
          try { j = JSON.parse(data); } catch (e) { return; }
          if (j.type === 'content_block_delta' && j.delta && j.delta.type === 'text_delta') texto += j.delta.text;
          else if (j.type === 'message_delta' && j.delta && j.delta.stop_reason) stop = j.delta.stop_reason;
          else if (j.type === 'error') errApi = j.error;
        });
      }
      xhr.onprogress = function () { if (xhr.status === 200) procesar(false); };
      xhr.onload = function () {
        if (xhr.status !== 200) {
          var m = '';
          try { var j = JSON.parse(xhr.responseText); m = j.error && j.error.message ? j.error.message : ''; } catch (e) { m = xhr.responseText.slice(0, 200); }
          var err = new Error(xhr.status === 401 ? 'La clave de Claude no es válida (revisa Ajustes)' : 'Claude ' + xhr.status + ': ' + m);
          err.status = xhr.status; err.detalle = m;
          mal(err);
          return;
        }
        procesar(true);
        if (errApi) { mal(new Error('Claude: ' + (errApi.message || errApi.type))); return; }
        if (stop === 'refusal') { mal(new Error('Claude no pudo procesar esta solicitud')); return; }
        if (stop === 'max_tokens') { mal(new Error('La respuesta de Claude se cortó; intenta pedir menos outfits')); return; }
        ok(texto);
      };
      xhr.onerror = function () { mal(new Error('Sin conexión con Claude (revisa el Wi-Fi)')); };
      xhr.ontimeout = function () { mal(new Error('Claude tardó demasiado; intenta otra vez')); };
      xhr.send(JSON.stringify(cuerpo));
    });
  }

  /* Pide una respuesta JSON validada contra un esquema (structured outputs) */
  function pedirJSON(sistema, contenido, esquema, esfuerzo) {
    var cuerpo = {
      model: MODELO,
      max_tokens: 16000,
      stream: true,
      system: sistema,
      output_config: { effort: esfuerzo || 'medium', format: { type: 'json_schema', schema: esquema } },
      fallbacks: 'default',
      messages: [{ role: 'user', content: contenido }]
    };
    return llamar(cuerpo, true).catch(function (e) {
      /* Si la cuenta no admite el beta de fallbacks, se reintenta sin él */
      if (e.status === 400 && /fallback/i.test(e.detalle || '')) {
        delete cuerpo.fallbacks;
        return llamar(cuerpo, false);
      }
      throw e;
    }).then(function (t) {
      try { return JSON.parse(t); } catch (e) { throw new Error('Claude respondió algo que no entiendo'); }
    });
  }

  function imagenBloque(dataURL) {
    var coma = dataURL.indexOf(',');
    var mime = dataURL.slice(5, dataURL.indexOf(';'));
    return { type: 'image', source: { type: 'base64', media_type: mime, data: dataURL.slice(coma + 1) } };
  }

  /* Inventario numerado + hojas de contacto (agrupadas por categoría, máx. 36 por hoja) */
  function catalogo(progreso) {
    var lista = [];
    CJ.CATS.forEach(function (c) { lista = lista.concat(CJ.listaPrendas({ cat: c.id })); });
    if (!lista.length) return Promise.reject(new Error('Tu clóset está vacío: primero sube prendas'));
    var grupos = [], actual = [];
    lista.forEach(function (p, i) {
      if (actual.length && (actual.length >= 36 || actual[0].cat !== p.cat)) { grupos.push(actual); actual = []; }
      actual.push(p);
    });
    if (actual.length) grupos.push(actual);
    var hojas = [], n = 1, cadena = Promise.resolve();
    grupos.forEach(function (g, gi) {
      var inicio = n;
      n += g.length;
      cadena = cadena.then(function () {
        if (progreso) progreso('Preparando tu clóset (' + (gi + 1) + '/' + grupos.length + ')…');
        return CJ.img.hojaContacto(g, inicio).then(function (d) { hojas.push({ data: d, cat: g[0].cat, desde: inicio, hasta: inicio + g.length - 1 }); });
      });
    });
    var usos = CJ.usos();
    var lineas = lista.map(function (p, i) {
      var u = usos[p.id] || { n: 0, ultima: null };
      var c = CJ.color(p.color);
      return '#' + (i + 1) + ' | ' + CJ.cat(p.cat).nombre + ' | ' + (c ? c.n : 'sin color') + ' | ocasiones: ' +
        ((p.ocas && p.ocas.length) ? p.ocas.join(', ') : 'cualquiera') + (p.marca ? ' | marca: ' + p.marca : '') +
        (p.nombre ? ' | ' + p.nombre : '') + ' | usada ' + u.n + ' veces' + (u.ultima ? ', última ' + u.ultima : '');
    });
    return cadena.then(function () { return { lista: lista, hojas: hojas, texto: lineas.join('\n') }; });
  }

  function bloquesCatalogo(cat) {
    var bloques = [];
    cat.hojas.forEach(function (h) {
      bloques.push({ type: 'text', text: 'Hoja de contacto: ' + CJ.cat(h.cat).nombre + ' (prendas #' + h.desde + ' a #' + h.hasta + ')' });
      bloques.push(imagenBloque(h.data));
    });
    bloques.push({ type: 'text', text: 'INVENTARIO (el número # coincide con el círculo rosado de las hojas):\n' + cat.texto, cache_control: { type: 'ephemeral' } });
    return bloques;
  }

  function idsDeNumeros(cat, nums) {
    var ids = [];
    (nums || []).forEach(function (n) {
      var p = cat.lista[n - 1];
      if (p && ids.indexOf(p.id) < 0) ids.push(p.id);
    });
    return ids;
  }

  var ENUM_OCAS = ['trabajo', 'gym', 'casual'];

  /* Foto del outfit -> prendas del inventario */
  function reconocer(fotoData, progreso) {
    return catalogo(progreso).then(function (cat) {
      if (progreso) progreso('Claude está mirando tu outfit… 👀');
      var contenido = bloquesCatalogo(cat).concat([
        { type: 'text', text: 'FOTO DEL OUTFIT QUE SE PUSO HOY:' },
        imagenBloque(fotoData),
        { type: 'text', text: 'Identifica qué prendas del inventario aparecen en la foto (tops, pantalones/shorts, faldas, vestidos, zapatos y accesorios visibles). ' +
          'Devuelve sus números. Solo incluye una prenda si estás razonablemente segura de que es esa (mismo tipo, color y detalles). ' +
          'Si ves una prenda que no está en el inventario, descríbela corto en no_encontradas. Elige la ocasión más probable. ' +
          'En comentario escribe un elogio breve y cariñoso en español sobre el outfit (máximo 20 palabras).' }
      ]);
      var esquema = {
        type: 'object', additionalProperties: false,
        required: ['prendas', 'no_encontradas', 'ocasion', 'comentario'],
        properties: {
          prendas: { type: 'array', items: { type: 'integer' } },
          no_encontradas: { type: 'array', items: { type: 'string' } },
          ocasion: { type: 'string', enum: ENUM_OCAS },
          comentario: { type: 'string' }
        }
      };
      return pedirJSON('Eres el asistente de un clóset digital. Comparas la foto de un outfit con un inventario numerado de prendas fotografiadas sin fondo.', contenido, esquema, 'medium')
        .then(function (r) {
          return { ids: idsDeNumeros(cat, r.prendas), noEncontradas: r.no_encontradas || [], ocas: r.ocasion, comentario: r.comentario || '' };
        });
    });
  }

  /* Estilista: arma outfits según lo que se le pida */
  function estilista(pedido, progreso) {
    return catalogo(progreso).then(function (cat) {
      if (progreso) progreso('Tu estilista está armando outfits… 💅');
      var hoy = CJ.hoy();
      var historial = [];
      for (var i = 21; i >= 1; i--) {
        var f = CJ.sumarDias(hoy, -i);
        var dia = CJ.datos.dias[f];
        if (!dia) continue;
        (dia.looks || []).forEach(function (l) {
          var nums = CJ.idsDe(l.piezas).map(function (id) { return '#' + (cat.lista.indexOf(CJ.prenda(id)) + 1); });
          historial.push(f + ' (' + CJ.DIAS_N[CJ.diaSemana(f)] + '): ' + nums.join(' + ') + (l.ocas ? ' [' + l.ocas + ']' : ''));
        });
      }
      var contenido = bloquesCatalogo(cat).concat([
        { type: 'text', text: 'Hoy es ' + CJ.fechaLarga(hoy) + ' (' + hoy + ').\n' +
          'Lo que se ha puesto en las últimas 3 semanas:\n' + (historial.length ? historial.join('\n') : '(sin registros)') + '\n\n' +
          'PEDIDO DE JULIETTE: ' + pedido + '\n\n' +
          'Arma los outfits usando SOLO números del inventario. Cada outfit lleva: un top + una prenda de abajo (pantalón, short o falda), ' +
          'o bien un vestido; casi siempre zapatos; y accesorios si suman. Respeta la ocasión (trabajo = más formal, gym = deportivo, casual = día a día). ' +
          'Evita prendas usadas en los últimos días y combinaciones repetidas; da preferencia a prendas olvidadas si combinan. Cuida la armonía de colores. ' +
          'Si el pedido es para días concretos de la semana, indica el día; si no, usa "ninguno". ' +
          'En porque explica en una frase corta y simpática por qué funciona. En mensaje, un saludo breve estilo Clueless.' }
      ]);
      var esquema = {
        type: 'object', additionalProperties: false, required: ['outfits', 'mensaje'],
        properties: {
          mensaje: { type: 'string' },
          outfits: {
            type: 'array',
            items: {
              type: 'object', additionalProperties: false,
              required: ['nombre', 'ocasion', 'prendas', 'porque', 'dia'],
              properties: {
                nombre: { type: 'string' },
                ocasion: { type: 'string', enum: ENUM_OCAS },
                prendas: { type: 'array', items: { type: 'integer' } },
                porque: { type: 'string' },
                dia: { type: 'string', enum: CJ.DIAS.concat(['ninguno']) }
              }
            }
          }
        }
      };
      var sistema = 'Eres la estilista personal de Juliette, con el ojo de Cher Horowitz en Clueless: divertida, segura y práctica. ' +
        'Juliette vive en clima caliente todo el año, va al gym casi todos los días y trabaja en oficina. Respondes en español.';
      return pedirJSON(sistema, contenido, esquema, 'medium').then(function (r) {
        return {
          mensaje: r.mensaje || '',
          outfits: (r.outfits || []).map(function (o) {
            return { nombre: o.nombre, ocas: o.ocasion, porque: o.porque, dia: o.dia === 'ninguno' ? null : o.dia, piezas: CJ.piezasDe(idsDeNumeros(cat, o.prendas)) };
          }).filter(function (o) { return CJ.idsDe(o.piezas).length > 0; })
        };
      });
    });
  }

  return { activa: activa, reconocer: reconocer, estilista: estilista, MODELO: MODELO };
})();
