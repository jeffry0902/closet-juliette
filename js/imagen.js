/* Imágenes: rotación EXIF (iOS 12 no la aplica al dibujar en canvas), reducción a 800px,
   miniaturas y hojas de contacto numeradas para que Claude reconozca prendas. */
CJ.img = (function () {
  var MAX = 800, MAX_MINI = 360;

  /* JPEG de 2x1 con orientación EXIF 6: si el navegador lo muestra como 1x2, ya rota solo */
  var PRUEBA = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDFoooryz7w/9k=';
  var rotaSola = null;
  function navegadorRota() {
    if (rotaSola !== null) return Promise.resolve(rotaSola);
    return cargar(PRUEBA).then(function (im) {
      rotaSola = im.naturalWidth === 1 && im.naturalHeight === 2;
      return rotaSola;
    }, function () { rotaSola = false; return false; });
  }

  function cargar(src) {
    return new Promise(function (ok, mal) {
      var im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = function () { mal(new Error('No se pudo leer la imagen (¿formato HEIC? usa JPG o PNG)')); };
      im.src = src;
    });
  }

  function leerBuffer(blob) {
    return new Promise(function (ok, mal) {
      var r = new FileReader();
      r.onload = function () { ok(r.result); };
      r.onerror = function () { mal(r.error); };
      r.readAsArrayBuffer(blob);
    });
  }

  /* Lee la etiqueta 0x0112 (orientación) del bloque EXIF de un JPEG */
  function orientacionDe(buf) {
    try {
      var v = new DataView(buf), largo = v.byteLength;
      if (largo < 4 || v.getUint16(0) !== 0xFFD8) return 1;
      var off = 2;
      while (off + 4 < largo) {
        var marca = v.getUint16(off);
        if ((marca & 0xFF00) !== 0xFF00) return 1;
        var tam = v.getUint16(off + 2);
        if (marca === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) {
          var tiff = off + 10;
          var little = v.getUint16(tiff) === 0x4949;
          var ifd = tiff + v.getUint32(tiff + 4, little);
          var n = v.getUint16(ifd, little);
          for (var i = 0; i < n; i++) {
            var e = ifd + 2 + i * 12;
            if (e + 10 > largo) return 1;
            if (v.getUint16(e, little) === 0x0112) return v.getUint16(e + 8, little);
          }
          return 1;
        }
        if (marca === 0xFFDA) return 1;
        off += 2 + tam;
      }
    } catch (err) { /* sin EXIF legible */ }
    return 1;
  }

  /* Dibuja la imagen escalada (lado mayor = max) aplicando la orientación */
  function dibujar(im, max, orient) {
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
    var esc = Math.min(1, max / Math.max(w, h));
    var dw = Math.round(w * esc), dh = Math.round(h * esc);
    var c = document.createElement('canvas');
    var gira = orient >= 5 && orient <= 8;
    c.width = gira ? dh : dw;
    c.height = gira ? dw : dh;
    var x = c.getContext('2d');
    switch (orient) {
      case 2: x.transform(-1, 0, 0, 1, dw, 0); break;
      case 3: x.transform(-1, 0, 0, -1, dw, dh); break;
      case 4: x.transform(1, 0, 0, -1, 0, dh); break;
      case 5: x.transform(0, 1, 1, 0, 0, 0); break;
      case 6: x.transform(0, 1, -1, 0, dh, 0); break;
      case 7: x.transform(0, -1, -1, 0, dh, dw); break;
      case 8: x.transform(0, -1, 1, 0, 0, dw); break;
    }
    x.drawImage(im, 0, 0, dw, dh);
    return c;
  }

  function aData(canvas, png, calidad) {
    return png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', calidad || 0.85);
  }

  function esPng(data) { return data.indexOf('data:image/png') === 0; }

  /* Archivo elegido -> { data, mini, ext } listo para guardar */
  function procesarArchivo(archivo, opts) {
    opts = opts || {};
    var png = /png$/i.test(archivo.type) || /\.png$/i.test(archivo.name || '');
    if (opts.forzarJpg) png = false;
    var orient = 1, url = null;
    return navegadorRota().then(function (solo) {
      if (solo || png) return 1;
      return leerBuffer(archivo.slice(0, 256 * 1024)).then(orientacionDe);
    }).then(function (o) {
      orient = o;
      url = (window.URL || window.webkitURL).createObjectURL(archivo);
      return cargar(url);
    }).then(function (im) {
      var grande = dibujar(im, opts.max || MAX, orient);
      var chico = dibujar(grande, MAX_MINI, 1);
      try { (window.URL || window.webkitURL).revokeObjectURL(url); } catch (e) { /* nada */ }
      return { data: aData(grande, png, 0.85), mini: aData(chico, png, 0.8), ext: png ? 'png' : 'jpg' };
    });
  }

  function hacerMini(data, max) {
    return cargar(data).then(function (im) { return aData(dibujar(im, max || MAX_MINI, 1), esPng(data), 0.8); });
  }

  /* Recorte cuadrado para la cara del avatar (cuando no viene recortada desde la PC) */
  function recortarCara(archivo) {
    return procesarArchivo(archivo, { max: 900, forzarJpg: true }).then(function (r) {
      return cargar(r.data);
    }).then(function (im) {
      var w = im.naturalWidth, h = im.naturalHeight, lado = Math.min(w, h);
      var sx = (w - lado) / 2, sy = h > w ? (h - lado) * 0.25 : 0;
      var c = document.createElement('canvas');
      c.width = 400; c.height = 400;
      c.getContext('2d').drawImage(im, sx, sy, lado, lado, 0, 0, 400, 400);
      var data = c.toDataURL('image/jpeg', 0.88);
      return { data: data, mini: data, ext: 'jpg' };
    });
  }

  /* Hoja de contacto: rejilla de prendas numeradas (para que la IA diga "la 12") */
  function hojaContacto(prendas, numeroInicial) {
    var COLS = 6, CEL = 170, ETQ = 0;
    var filas = Math.ceil(prendas.length / COLS);
    var c = document.createElement('canvas');
    c.width = COLS * CEL; c.height = filas * (CEL + ETQ);
    var x = c.getContext('2d');
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, c.width, c.height);
    var p = Promise.resolve();
    prendas.forEach(function (pr, i) {
      p = p.then(function () {
        var src = CJ.mini(pr.foto);
        if (!src) return;
        return cargar(src).then(function (im) {
          var col = i % COLS, fila = Math.floor(i / COLS);
          var esc = Math.min((CEL - 16) / im.naturalWidth, (CEL - 16) / im.naturalHeight);
          var w = im.naturalWidth * esc, h = im.naturalHeight * esc;
          var ox = col * CEL + (CEL - w) / 2, oy = fila * CEL + (CEL - h) / 2;
          x.drawImage(im, ox, oy, w, h);
          x.strokeStyle = '#dddddd'; x.lineWidth = 2;
          x.strokeRect(col * CEL + 1, fila * CEL + 1, CEL - 2, CEL - 2);
          var n = String(numeroInicial + i);
          x.fillStyle = '#e0218a';
          x.beginPath(); x.arc(col * CEL + 24, fila * CEL + 24, 20, 0, Math.PI * 2); x.fill();
          x.fillStyle = '#ffffff'; x.font = 'bold 22px Helvetica, Arial, sans-serif';
          x.textAlign = 'center'; x.textBaseline = 'middle';
          x.fillText(n, col * CEL + 24, fila * CEL + 25);
        }, function () { /* miniatura dañada: se omite */ });
      });
    });
    return p.then(function () { return c.toDataURL('image/jpeg', 0.8); });
  }

  /* Color dominante (centro de la imagen, ignorando lo transparente) -> id de la paleta */
  function colorDominante(data) {
    return cargar(data).then(function (im) {
      var c = document.createElement('canvas'), L = 48;
      c.width = L; c.height = L;
      var x = c.getContext('2d');
      x.drawImage(im, 0, 0, L, L);
      var px = x.getImageData(0, 0, L, L).data;
      var png = esPng(data), bins = {}, mejor = null, max = 0;
      for (var yy = 0; yy < L; yy++) for (var xx = 0; xx < L; xx++) {
        if (!png && (xx < L * 0.25 || xx > L * 0.75 || yy < L * 0.25 || yy > L * 0.75)) continue;
        var i = (yy * L + xx) * 4;
        if (px[i + 3] < 200) continue;
        var k = (px[i] >> 4) + ',' + (px[i + 1] >> 4) + ',' + (px[i + 2] >> 4);
        bins[k] = (bins[k] || 0) + 1;
        if (bins[k] > max) { max = bins[k]; mejor = [px[i], px[i + 1], px[i + 2]]; }
      }
      if (!mejor) return null;
      var elegido = null, dist = 1e9;
      CJ.COLORES.forEach(function (col) {
        if (!col.hex) return;
        var r = parseInt(col.hex.substr(1, 2), 16), g = parseInt(col.hex.substr(3, 2), 16), b = parseInt(col.hex.substr(5, 2), 16);
        var rm = (r + mejor[0]) / 2;
        var d = (2 + rm / 256) * Math.pow(r - mejor[0], 2) + 4 * Math.pow(g - mejor[1], 2) + (2 + (255 - rm) / 256) * Math.pow(b - mejor[2], 2);
        if (d < dist) { dist = d; elegido = col.id; }
      });
      return elegido;
    }).catch(function () { return null; });
  }

  return {
    colorDominante: colorDominante,
    procesarArchivo: procesarArchivo, hacerMini: hacerMini, recortarCara: recortarCara,
    hojaContacto: hojaContacto, cargar: cargar, esPng: esPng, navegadorRota: navegadorRota
  };
})();
