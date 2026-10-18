# Guía de instalación: Clóset de Juliette

Necesitas unos 30 minutos la primera vez. Hay cuatro partes:

1. [La nube privada](#1-la-nube-privada-github) para que la iPad, el celular y la PC compartan el clóset.
2. [La clave de Claude](#2-la-clave-de-claude-opcional-pero-recomendada) para reconocer fotos y usar la estilista.
3. [La iPad en la pared](#3-instalar-la-app-en-la-ipad), con Acceso guiado.
4. [El estudio en la PC](#4-el-estudio-en-la-pc-windows-11) para quitar el fondo y dejar lindas las fotos.

---

## 1. La nube privada (GitHub)

La app se publica en un repo **público** (`closet-juliette`), pero las fotos y los datos van en otro repo **privado**. Nadie más los ve.

1. Entra a GitHub con tu cuenta `jeffry0902` y crea un repo nuevo:
   - Nombre: `closet-juliette-datos`
   - Visibilidad: **Private**
   - No hace falta agregar README; la app lo inicializa sola.
2. Crea un token que solo pueda tocar ese repo:
   - GitHub → tu foto → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
   - **Token name**: `closet-ipad`
   - **Expiration**: 1 año. Anota en tu calendario la fecha para renovarlo.
   - **Repository access**: *Only select repositories* → `closet-juliette-datos`
   - **Permissions** → **Repository permissions** → **Contents: Read and write** (Metadata se marca solo).
   - Copia el token. Empieza con `github_pat_…` y GitHub no lo vuelve a mostrar.

> El token vive solo en la iPad, en el celular y en un archivo de tu PC (`C:\Users\TU_USUARIO\.closet-juliette.json`). Nunca va al repo público. Si lo pierdes o sospechas algo, bórralo en GitHub y crea otro.

## 2. La clave de Claude (opcional, pero recomendada)

Sirve para dos cosas:
- **📸 Foto del outfit de hoy**: Claude mira la foto, reconoce qué prendas de tu clóset lleva y lo guarda en el calendario.
- **💅 Pídele a Claude**: arma outfits a pedido ("3 outfits de gym", "plan de trabajo L-V sin repetir").

Sin clave, todo lo demás funciona igual. "✨ Sorpréndeme" y "Armar semana automática" no usan internet.

1. Entra a <https://console.anthropic.com> → **API Keys** → **Create Key**. Empieza con `sk-ant-…`.
2. En **Billing → Limits**, pon un **límite de gasto mensual** (por ejemplo, US$5). Cada foto reconocida o pedido a la estilista cuesta unos pocos centavos.

## 3. Instalar la app en la iPad

### 3.1 Poner el ícono de la app en la iPad
La app no se baja del App Store: es una página web que Safari convierte en un ícono, como si fuera una app.

1. Enciende la iPad y desbloquéala.
2. Si estás dentro de alguna app, presiona una vez el **botón redondo de abajo** (botón de inicio) para volver a la pantalla con los íconos.
3. Busca el ícono de **Safari**: una **brújula azul**. Casi siempre está en la barra de abajo. Si no lo ves, desliza un dedo hacia abajo desde el centro de la pantalla, escribe `Safari` y tócalo.
4. En Safari, toca la **barra de dirección** (la barra blanca larga de arriba, en el centro). Aparece el teclado.
5. Borra lo que haya y escribe exactamente:
   `jeffry0902.github.io/closet-juliette`
   Luego toca **Ir** (la tecla azul del teclado).
6. Debe cargar la página con la cabecera amarilla a cuadros que dice **"Clóset de Juliette"**.
7. Arriba a la derecha, junto a la barra de dirección, toca el botón **Compartir**: un **cuadrito con una flecha hacia arriba ↑**.
8. Se abre un panel con dos filas de íconos. En la **fila de abajo** (íconos grises), busca **"Añadir a pantalla de inicio"** (un cuadrito con un **＋**). Si no lo ves, **desliza esa fila hacia la izquierda** con el dedo hasta encontrarlo. Si la iPad está en inglés, se llama **"Add to Home Screen"**.
9. Aparece una ventanita con el ícono amarillo y el nombre **"Clóset J"**. Puedes cambiar el nombre si quieres. Toca **Añadir** (arriba a la derecha).
10. La iPad te lleva sola a la pantalla de inicio y ahí está el **ícono nuevo** (amarillo a cuadros, con un gancho de ropa rosado y una "J"). Si no lo ves, desliza la pantalla hacia la izquierda: suele quedar en la última página de íconos.

### 3.2 Abrir la app desde el ícono
1. Toca el **ícono amarillo "Clóset J"**. No abras Safari.
2. Así sabes que lo hiciste bien: **no hay barra de dirección ni botones de Safari arriba**; la cabecera amarilla aparece pegada a la hora y la batería, y abajo están los botones Hoy, Clóset, Armar, Calendario y Más.
3. Si ves la barra de dirección de Safari arriba, estás en Safari, no en la app. Presiona el botón redondo y toca el ícono amarillo.

> **Importante:** usa siempre el ícono. Lo que guardas en la app abierta desde el ícono no se ve si abres la página en Safari, porque son espacios separados.

### 3.3 Pasar el token y la clave a la iPad sin escribirlos a mano
El token de GitHub (`github_pat_…`) y la clave de Claude (`sk-ant-…`) son larguísimos; escribirlos letra por letra es fácil que salga mal. Mejor copiarlos y pegarlos:
1. En la PC, mándate un **correo a ti mismo** con el token y la clave (cada uno en su propia línea).
2. En la iPad, abre la app **Mail** (sobre azul con un sobre blanco) y abre ese correo.
3. **Mantén el dedo** sobre el token hasta que se seleccione una palabra. Arrastra los puntitos azules hasta cubrir todo el token, de `github_pat_` hasta el último carácter, y toca **Copiar**.
4. Más adelante, para pegarlo: toca el campo de la app una vez para que aparezca el cursor, vuelve a tocarlo (o mantén el dedo) y toca **Pegar**.
5. Cuando todo funcione, **borra ese correo**: el token da acceso a tus datos.

### 3.4 Configurar la app (una sola vez)
1. Abre la app desde el ícono amarillo.
2. Abajo a la derecha toca **💖 Más**.
3. Toca el botón grande **⚙️ Ajustes** (abajo a la derecha de la cuadrícula).
4. En el recuadro **☁️ Nube (GitHub privado)**:
   - Toca **Usuario de GitHub** y escribe `jeffry0902`.
   - Toca **Repositorio de datos** y escribe `closet-juliette-datos`.
   - Toca **Token** y **pega** el token (paso 3.3). Se ve como puntitos ••••, es normal.
   - Toca el botón rosado **💾 Guardar y probar**.
   - Abajo debe salir un mensaje verde: **"✅ Conectado a jeffry0902/closet-juliette-datos"**. Si sale en rojo, toma una foto del mensaje y mándamela.
5. Desliza hacia abajo hasta el recuadro **💅 Claude**:
   - Toca el campo y **pega** la clave `sk-ant-…`.
   - Toca **💾 Guardar clave**. Debe salir "Clave guardada 💅".
6. Para cerrar el teclado, toca la tecla de abajo a la derecha del teclado (la que tiene un teclado con flecha hacia abajo).

Desde ese momento la nube ☁️ de arriba a la derecha se sincroniza sola: al abrir la app, cada 10 minutos y después de cada cambio. Tócala para sincronizar ya.

### 3.5 Dejarla fija en la pared
1. **Pantalla siempre encendida**: Ajustes de la iPad → **Pantalla y brillo** → **Bloqueo automático** → **Nunca**. Déjala conectada al cargador.
2. **Siempre vertical**: Centro de control (desliza desde abajo) → toca el **candado de rotación** con la iPad en vertical. En la iPad mini 2 también sirve: Ajustes → **General** → *Usar interruptor lateral para* → **Bloquear rotación**.
3. Opcional: baja un poco el brillo (Ajustes → Pantalla y brillo) para que la pantalla dure más.

### 3.6 Activar Acceso guiado (modo kiosco)
Así la iPad queda "encerrada" en la app y nadie sale por accidente.

**Activarlo (una sola vez):**
1. Ajustes → **General** → **Accesibilidad** → **Acceso guiado** → enciéndelo.
2. **Ajustes de código** → **Establecer código de Acceso guiado** → elige un código de 6 dígitos que tú recuerdes. La iPad mini 2 no tiene Touch ID, así que solo hay código.
3. Si ves **Bloqueo automático de pantalla** dentro de Acceso guiado, ponlo en **Nunca**.
4. Ajustes → General → Accesibilidad → **Función rápida** (al final) → marca **Acceso guiado**.

**Iniciarlo:**
1. Abre la app desde su ícono.
2. Haz **triple clic en el botón de inicio** (el botón redondo).
3. Toca **Opciones** (abajo a la izquierda) y deja:
   - **Botón de reposo/activación**: apagado
   - **Botones de volumen**: apagado
   - **Movimiento**: **apagado** (así no gira la pantalla)
   - **Teclados**: **encendido** (lo necesita "Pídele a Claude")
   - **Tocar**: encendido
   - **Límite de tiempo**: apagado
4. Toca **Iniciar** (arriba a la derecha).

**Para salir** (por ejemplo, para actualizar la iPad): triple clic → escribe el código → **Finalizar**.

> Si algo falla en la app, aparece un **recuadro rojo** arriba con el error. Tómale una foto con tu celular y mándamela. Luego toca **Recargar**.

## 4. El estudio en la PC (Windows 11)

El script `herramientas/estudio.py` toma las fotos que sacas con el celular y hace esto:
1. Quita el fondo (rembg).
2. Las deja lindas: endereza la orientación, recorta justo a la prenda, limpia los bordes y sube un poco la luz, el contraste, el color y la nitidez sin cambiar el color real.
3. Las guarda como PNG livianos (10–150 KB).
4. Detecta el color y, con `--ia`, también la categoría, la ocasión, un nombre y la marca si se ve.
5. **Las sube a la nube privada**: en la iPad aparecen solas.

### 4.1 Instalación (una vez)
1. Instala **Python 3.12 o 3.13** desde <https://www.python.org/downloads/>. En el instalador marca **"Add python.exe to PATH"**.
2. Descarga este proyecto: en GitHub, **Code → Download ZIP**, y descomprímelo (por ejemplo, en `C:\closet-juliette`).
3. Abre **PowerShell** y escribe:
   ```powershell
   cd C:\closet-juliette\herramientas
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python estudio.py config
   ```
   Si PowerShell no deja activar el entorno, ejecuta primero `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
   `config` te pide el usuario (`jeffry0902`), el repo (`closet-juliette-datos`) y el token.

### 4.2 Cada vez que tengas fotos nuevas
1. Pasa las fotos del celular a una carpeta de la PC, ordenadas por categoría. Las subcarpetas de ocasión son opcionales:
   ```
   C:\Fotos-closet\
     tops\              blusa-azul.jpg, camiseta.jpg
     tops\trabajo\      camisa-blanca.jpg
     pantalones\        jean.jpg, short-negro.jpg
     pantalones\gym\    leggings.jpg
     faldas\  vestidos\  zapatos\  accesorios\
   ```
   También acepta los nombres `shorts`, `jeans`, `tenis`, `bolsos`, `blusas`, etc.
2. En PowerShell:
   ```powershell
   cd C:\closet-juliette\herramientas
   .\.venv\Scripts\Activate.ps1
   python estudio.py prendas C:\Fotos-closet
   ```
3. Listo: en la iPad toca ☁️ o espera unos minutos. Puedes correrlo cuantas veces quieras; solo procesa las fotos nuevas.

**Con Claude etiquetando** (sirve también con fotos sueltas, sin subcarpetas):
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
python estudio.py prendas C:\Fotos-closet --ia
```

**Otras opciones útiles:** `--marca Zara` (pone la marca a toda la tanda), `--ocasion trabajo`, `--sombra` (sombra suave), `--bordes-finos` (mejor recorte de pelusa o encaje; más lento), `--sin-paleta` (máxima calidad), `--lote` (no sube; crea un `lote-*.json` para **Ajustes → Importar (combinar)**).

**Consejos para las fotos:** la prenda extendida sobre la cama o colgada en una pared lisa, con buena luz de día, de frente y sin otras cosas alrededor. Mientras más contraste haya entre la prenda y el fondo, mejor sale el recorte.

### 4.3 El avatar con la cara de Juliette
1. Toma una foto de frente, de los hombros para arriba, con buena luz.
2. `python estudio.py avatar C:\Fotos-closet\cara.jpg`
3. Revisa el archivo `cara-avatar.png` que se crea al lado. El script lo sube solo y la muñeca de la app aparece con su cara. En **Más → Mi avatar** se elige el tono de piel.

### 4.4 Usar la app en la PC o en el celular
Es la misma web: abre `https://jeffry0902.github.io/closet-juliette/` en Chrome (PC) o en Safari (celular, **Añadir a pantalla de inicio**). Configura la misma nube y la misma clave en Ajustes, y ves exactamente el mismo clóset. Así puedes:
- revisar estadísticas o planear la semana desde la PC sin tocar la iPad,
- **subir la foto del outfit del día desde el celular** al salir de casa (📸 en "Hoy"); en la iPad aparece sola en el calendario,
- **exportar un respaldo .json** desde la PC (Ajustes → Exportar). En iOS 12 la iPad no descarga archivos bien; allí el respaldo es la nube.

---

## Problemas frecuentes

| Problema | Solución |
|---|---|
| Recuadro rojo de error | Foto con el celular, mándamela y toca **Recargar**. |
| La nube ☁️ está en rojo | Revisa el Wi-Fi. Si sigue igual, el token pudo expirar: crea uno nuevo y ponlo en Ajustes y en `python estudio.py config`. |
| "La clave de Claude no es válida" | Pega de nuevo la clave en Ajustes; revisa que tengas saldo en console.anthropic.com. |
| Claude reconoció mal una prenda | En la confirmación toca la ✕ para quitarla y **＋ Agregar prenda** para elegir la correcta. |
| No aparecen las prendas nuevas | Toca ☁️. En la PC revisa que `estudio.py` haya dicho "✓ ¡Listo!". |
| Una actualización de la app no se ve | Sal de Acceso guiado, cierra la app (doble clic en inicio y desliza hacia arriba) y ábrela de nuevo. |
