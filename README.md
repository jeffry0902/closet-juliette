# 👗 Clóset de Juliette

Armario inteligente estilo *Clueless* para una iPad mini 2 (iOS 12.5.8, Safari 12) fija en la pared del clóset.

**App:** <https://jeffry0902.github.io/closet-juliette/> · **Instalación:** [GUIA-IPAD.md](GUIA-IPAD.md)

## Qué hace
- **Clóset por categorías**: tops, pantalones y shorts, faldas, vestidos, zapatos y accesorios. Cada prenda tiene foto, color, ocasión (💼 trabajo, 🏋️ gym, 🌴 casual) y marca opcional.
- **Armador Clueless**: carriles que cambian con swipe o flechas (arriba, abajo o vestido, zapatos, accesorio), con 🔒 para fijar una prenda base y **💡 Ideas** para armar outfits alrededor de ella.
- **✨ Sorpréndeme**: combinaciones al azar por ocasión que cuidan la armonía de colores y evitan lo usado hace poco. Funciona sin internet.
- **📸 Foto del outfit del día**: Claude reconoce las prendas de tu clóset en la foto y las guarda en el día.
- **💅 Pídele a Claude**: outfits a pedido ("3 outfits de gym", "plan de trabajo L-V sin repetir").
- **📅 Calendario** del mes con lo que se puso cada día, alertas ⚠️ de combinaciones repetidas y resumen mensual.
- **📊 Estadísticas**: cuántas veces se usó cada prenda, cuándo fue la última vez y qué % del clóset se usa.
- **❤️ Favoritos** y **🗓️ plan de la semana** (lunes a domingo).
- **👩 Avatar**: muñeca con la cara de Juliette que se viste con los outfits.
- **☁️ Nube privada** en GitHub, compartida entre iPad, celular y PC, más respaldo JSON para exportar e importar.
- **Overlay de errores** en pantalla para depurar sin herramientas.

## Estructura
```
index.html              Página única con meta tags de app a pantalla completa
manifest.json           Nombre, ícono y orientación vertical
css/app.css             Estilos (sin flex gap, aspect-ratio, :is/:where ni prefers-color-scheme)
js/errores.js           Overlay de errores (ES5, se carga primero)
js/base.js              Constantes, utilidades, ajustes (localStorage), modales y toasts
js/db.js                IndexedDB (datos + fotos como dataURL)
js/datos.js             Modelo, fusión por registro, usos, respaldo
js/imagen.js            Rotación EXIF, reducción a 800px, miniaturas y hojas de contacto
js/nube.js              Sincronización con un repo privado de GitHub (Git Data API)
js/ia.js                Claude: reconocer fotos y estilista (HTTP + streaming SSE)
js/motor.js             Armonía de colores, sorpréndeme, ideas y semana automática
js/muneca.js            Avatar/muñeca en SVG
js/v-*.js               Pantallas: hoy, clóset, armar, calendario, más, estilista, ajustes
js/app.js               Navegación y arranque
img/                    Íconos apple-touch-icon y pantalla de inicio
herramientas/estudio.py         Quita el fondo, embellece y sube las prendas (PC)
herramientas/requirements.txt   Dependencias de Python
herramientas/verificar-compat.js Revisa compatibilidad con Safari 12 (node + acorn)
```

## Compatibilidad con Safari 12
- JavaScript ES2017 como máximo: sin `?.`, `??`, campos `#`, spread de objetos, módulos ni top-level await. `errores.js` es ES5.
- Swipe con `touch*` (iOS 12 no tiene Pointer Events).
- Las fotos se guardan como dataURL en IndexedDB (los Blobs fallan en iOS 12) y se procesan en canvas con rotación EXIF manual.
- Para revisar antes de publicar: `npm install acorn && node herramientas/verificar-compat.js`

## Privacidad
Este repo es público y solo contiene el código. Las fotos, el calendario y la cara del avatar viven en el dispositivo y en el repo **privado** de datos. Los tokens y claves se guardan solo en cada dispositivo.
