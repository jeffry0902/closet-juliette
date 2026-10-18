#!/usr/bin/env python3
"""
Estudio del Clóset de Juliette (para tu PC con Windows 11).

Toma las fotos de las prendas (tomadas con el celular), les quita el fondo con rembg,
las deja "superlindas" (recorte ajustado, luz, color y nitidez suaves, bordes limpios),
las guarda como PNG livianos (paleta de 256 colores) y las sube a la nube privada
de GitHub para que aparezcan solas en la iPad.

Comandos:
  python estudio.py config                    Configura la nube (una sola vez)
  python estudio.py prendas CARPETA [opciones] Procesa y sube prendas
  python estudio.py avatar FOTO               Recorta la cara para el avatar y la sube
  python estudio.py subir CARPETA             Reintenta subir lo que quedó pendiente

Organización de CARPETA (el nombre de cada subcarpeta indica la categoría,
y opcionalmente una sub-subcarpeta indica la ocasión):
  fotos/
    tops/            blusa1.jpg, camiseta.jpg …
    tops/trabajo/    camisa-blanca.jpg …      (ocasión: trabajo)
    pantalones/      (también shorts, jeans, leggings)
    faldas/  vestidos/  zapatos/  accesorios/
    gym/             (si una carpeta se llama como una ocasión y no hay --ia,
                      pon la categoría con --categoria)

Opciones de "prendas":
  --ia               Claude adivina categoría, color, ocasión, nombre y marca visible
                     (necesita la variable ANTHROPIC_API_KEY)
  --categoria CAT    Categoría para fotos sueltas (tops, pantalones, faldas, vestidos, zapatos, accesorios)
  --ocasion OC       Ocasión para todas (trabajo, gym, casual). Se puede repetir.
  --marca MARCA      Marca para todas las fotos de esta tanda
  --lote             No subir: genera un archivo lote-*.json para importar en la app
  --sin-paleta       PNG a todo color (más pesado, máxima calidad)
  --bordes-finos     Recorte más fino de bordes (más lento)
  --sombra           Agrega una sombra suave debajo de la prenda
  --rehacer          Vuelve a procesar fotos ya procesadas
"""
import argparse
import base64
import hashlib
import io
import json
import os
import random
import string
import sys
import time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

try:
    import pillow_heif  # fotos HEIC del iPhone

    pillow_heif.register_heif_opener()
except ImportError:
    pass

CONFIG = Path.home() / ".closet-juliette.json"
MODELO_CLAUDE = "claude-opus-5-5"
EXTENSIONES = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}
LADO_MAX = 800

CATEGORIAS = ["tops", "pantalones", "faldas", "vestidos", "zapatos", "accesorios"]
OCASIONES = ["trabajo", "gym", "casual"]
ALIAS_CATEGORIA = {
    "tops": "tops", "top": "tops", "blusas": "tops", "blusa": "tops", "camisas": "tops", "camisetas": "tops",
    "pantalones": "pantalones", "pantalon": "pantalones", "shorts": "pantalones", "jeans": "pantalones",
    "leggings": "pantalones", "licras": "pantalones",
    "faldas": "faldas", "falda": "faldas",
    "vestidos": "vestidos", "vestido": "vestidos", "enterizos": "vestidos",
    "zapatos": "zapatos", "tenis": "zapatos", "sandalias": "zapatos", "calzado": "zapatos",
    "accesorios": "accesorios", "bolsos": "accesorios", "carteras": "accesorios", "joyas": "accesorios",
}

# Debe coincidir con CJ.COLORES en js/base.js
COLORES = {
    "negro": "#1b1b1b", "blanco": "#ffffff", "crema": "#f3e9d2", "beige": "#d8c3a5", "cafe": "#7b5236",
    "gris": "#9a9a9a", "marino": "#1f2a4d", "denim": "#4a6fa5", "oliva": "#6b7a3a", "dorado": "#c9a43b",
    "plateado": "#c0c4c8", "azul": "#2f6fd6", "celeste": "#9fd3f2", "verde": "#3fa35b", "amarillo": "#f5d33a",
    "naranja": "#f08a2c", "rojo": "#d62f2f", "vino": "#7a1f33", "rosado": "#f4a6c1", "fucsia": "#e0218a",
    "lila": "#c3a6e0", "morado": "#6a2c91",
}
COLORES_IA = list(COLORES) + ["estampado"]


def ahora_ms():
    return int(time.time() * 1000)


def nuevo_id(prefijo):
    t = ahora_ms()
    b36 = ""
    while t:
        t, r = divmod(t, 36)
        b36 = "0123456789abcdefghijklmnopqrstuvwxyz"[r] + b36
    return prefijo + b36 + "".join(random.choice(string.ascii_lowercase + string.digits) for _ in range(5))


# ---------------------------------------------------------------- imagen

_sesiones = {}


def sesion_rembg(nombre):
    if nombre not in _sesiones:
        from rembg import new_session

        print(f"  (cargando modelo {nombre}; la primera vez se descarga, ~170 MB)")
        _sesiones[nombre] = new_session(nombre)
    return _sesiones[nombre]


def abrir_foto(ruta):
    im = Image.open(ruta)
    im = ImageOps.exif_transpose(im)  # endereza fotos giradas del celular
    return im.convert("RGB")


def quitar_fondo(im, modelo, bordes_finos=False):
    from rembg import remove

    kw = {"session": sesion_rembg(modelo), "post_process_mask": True}
    if bordes_finos:
        kw.update(alpha_matting=True, alpha_matting_foreground_threshold=240,
                  alpha_matting_background_threshold=15, alpha_matting_erode_size=8)
    return remove(im, **kw).convert("RGBA")


def limpiar_alfa(rgba):
    """Bordes limpios: elimina restos semitransparentes y suaviza el contorno."""
    a = rgba.getchannel("A")
    a = a.point(lambda v: 0 if v < 24 else (255 if v > 232 else v))
    a = a.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba.putalpha(a)
    return rgba


def recortar_ajustado(rgba, margen=0.035):
    caja = rgba.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
    if not caja:
        raise ValueError("no se encontró la prenda (¿foto vacía o muy oscura?)")
    rgba = rgba.crop(caja)
    w, h = rgba.size
    m = int(max(w, h) * margen)
    lienzo = Image.new("RGBA", (w + 2 * m, h + 2 * m), (0, 0, 0, 0))
    lienzo.paste(rgba, (m, m))
    return lienzo


def embellecer_color(rgba):
    """Luz, contraste, color y nitidez suaves (sin cambiar el color real de la prenda)."""
    alfa = rgba.getchannel("A")
    rgb = rgba.convert("RGB")
    rgb = ImageEnhance.Brightness(rgb).enhance(1.04)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
    rgb = ImageEnhance.Color(rgb).enhance(1.08)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.6, percent=55, threshold=3))
    out = rgb.convert("RGBA")
    out.putalpha(alfa)
    return out


def agregar_sombra(rgba):
    w, h = rgba.size
    pad = int(max(w, h) * 0.06)
    lienzo = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    sombra = Image.new("RGBA", rgba.size, (58, 33, 64, 0))
    sombra.putalpha(rgba.getchannel("A").point(lambda v: int(v * 0.28)))
    sombra = sombra.filter(ImageFilter.GaussianBlur(max(4, pad // 2)))
    lienzo.alpha_composite(sombra, (pad, int(pad * 1.5)))
    lienzo.alpha_composite(rgba, (pad, pad))
    return lienzo


def reducir(rgba, lado=LADO_MAX):
    rgba = rgba.copy()
    rgba.thumbnail((lado, lado), Image.LANCZOS)
    return rgba


def png_liviano(rgba, paleta=True):
    if paleta:
        img = rgba.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG)
    else:
        img = rgba
    b = io.BytesIO()
    img.save(b, "PNG", optimize=True)
    return b.getvalue()


def color_dominante(rgba):
    peq = rgba.copy()
    peq.thumbnail((64, 64))
    cuenta = {}
    pixeles = peq.get_flattened_data() if hasattr(peq, "get_flattened_data") else peq.getdata()
    for r, g, b, a in pixeles:
        if a < 200:
            continue
        k = (r >> 4, g >> 4, b >> 4)
        cuenta.setdefault(k, [0, (r, g, b)])
        cuenta[k][0] += 1
    if not cuenta:
        return None
    r, g, b = max(cuenta.values(), key=lambda x: x[0])[1]

    def dist(h):
        r2, g2, b2 = int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)
        rm = (r + r2) / 2
        return (2 + rm / 256) * (r - r2) ** 2 + 4 * (g - g2) ** 2 + (2 + (255 - rm) / 256) * (b - b2) ** 2

    return min(COLORES, key=lambda c: dist(COLORES[c]))


def procesar_prenda(ruta, args):
    im = abrir_foto(ruta)
    im.thumbnail((1600, 1600), Image.LANCZOS)  # rembg es más rápido y no pierde calidad útil
    rgba = quitar_fondo(im, args.modelo, args.bordes_finos)
    rgba = limpiar_alfa(rgba)
    rgba = recortar_ajustado(rgba)
    rgba = embellecer_color(rgba)
    if args.sombra:
        rgba = agregar_sombra(rgba)
    return reducir(rgba)


# ---------------------------------------------------------------- avatar

def hacer_avatar(ruta):
    im = abrir_foto(ruta)
    im.thumbnail((1600, 1600), Image.LANCZOS)
    w, h = im.size
    caja = None
    try:
        import cv2
        import numpy as np

        gris = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY)
        clasif = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        caras = clasif.detectMultiScale(gris, scaleFactor=1.1, minNeighbors=6, minSize=(80, 80))
        if len(caras):
            x, y, fw, fh = max(caras, key=lambda c: c[2] * c[3])
            cx = x + fw / 2
            caja = (max(0, int(cx - fw * 1.05)), max(0, int(y - fh * 0.8)),
                    min(w, int(cx + fw * 1.05)), min(h, int(y + fh * 1.45)))
    except ImportError:
        print("  (sin opencv: recorto la parte superior central)")
    if not caja:
        lado = min(w, h)
        caja = ((w - lado) // 2, 0, (w + lado) // 2, lado)
        print("  No detecté la cara; uso un recorte cuadrado superior. Mejor usa una foto de frente.")
    im = im.crop(caja)
    rgba = quitar_fondo(im, "u2net_human_seg")
    rgba = limpiar_alfa(rgba)
    # Desvanece el cuello hacia abajo para que se una con el cuerpo de la muñeca
    W, H = rgba.size
    grad = Image.new("L", (1, H), 255)
    inicio = int(H * 0.80)
    for yy in range(inicio, H):
        grad.putpixel((0, yy), int(255 * (1 - (yy - inicio) / max(1, H - inicio))))
    grad = grad.resize((W, H))
    a = Image.composite(rgba.getchannel("A"), Image.new("L", (W, H), 0), grad)
    rgba.putalpha(a)
    rgba = recortar_ajustado(rgba, margen=0.01)
    rgba = embellecer_color(rgba)
    return reducir(rgba, 500)


# ---------------------------------------------------------------- Claude (opcional)

def etiquetar_con_ia(png_bytes, categoria_sugerida):
    import anthropic

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("Falta la variable ANTHROPIC_API_KEY para usar --ia")
    im = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    fondo = Image.new("RGB", im.size, (255, 255, 255))
    fondo.paste(im, mask=im.getchannel("A"))
    fondo.thumbnail((600, 600))
    b = io.BytesIO()
    fondo.save(b, "JPEG", quality=85)
    esquema = {
        "type": "object", "additionalProperties": False,
        "required": ["categoria", "color", "ocasiones", "nombre", "marca"],
        "properties": {
            "categoria": {"type": "string", "enum": CATEGORIAS},
            "color": {"type": "string", "enum": COLORES_IA},
            "ocasiones": {"type": "array", "items": {"type": "string", "enum": OCASIONES}},
            "nombre": {"type": "string"},
            "marca": {"type": "string"},
        },
    }
    cliente = anthropic.Anthropic()
    resp = cliente.beta.messages.create(
        model=MODELO_CLAUDE,
        max_tokens=2000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "low", "format": {"type": "json_schema", "schema": esquema}},
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                             "data": base64.b64encode(b.getvalue()).decode()}},
                {"type": "text", "text": (
                    "Es una prenda del clóset de Juliette (clima caliente; trabaja en oficina y va al gym). "
                    "Clasifícala. ocasiones: trabajo = formal de oficina, gym = deportiva, casual = día a día; "
                    "puede ser más de una. nombre: 2 a 4 palabras en español (ej. 'Blusa de lino'). "
                    "marca: solo si se lee en una etiqueta o logo; si no, cadena vacía."
                    + (f" La carpeta sugiere la categoría '{categoria_sugerida}'." if categoria_sugerida else "")
                )},
            ],
        }],
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError("Claude no pudo clasificar esta foto")
    texto = next(b.text for b in resp.content if b.type == "text")
    return json.loads(texto)


# ---------------------------------------------------------------- nube (GitHub privado)

class ErrorNube(Exception):
    def __init__(self, estado, msg):
        super().__init__(f"GitHub {estado}: {msg}")
        self.estado = estado


class Nube:
    def __init__(self, conf):
        import requests

        self.conf = conf
        self.rama = conf.get("rama", "main")
        self.s = requests.Session()
        self.s.headers.update({
            "Authorization": "Bearer " + conf["token"],
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        api = os.environ.get("CLOSET_GITHUB_API", "https://api.github.com")  # solo para pruebas
        self.base = f"{api}/repos/{conf['owner']}/{conf['repo']}"

    def api(self, metodo, ruta, cuerpo=None):
        r = self.s.request(metodo, self.base + ruta, json=cuerpo, timeout=120)
        if r.status_code >= 400:
            try:
                msg = r.json().get("message", r.text[:200])
            except ValueError:
                msg = r.text[:200]
            raise ErrorNube(r.status_code, msg)
        return r.json() if r.content else None

    def info(self):
        return self.api("GET", "")

    def _ref(self):
        try:
            return self.api("GET", f"/git/ref/heads/{self.rama}")
        except ErrorNube as e:
            if e.estado != 409:  # 409 = repositorio vacío
                raise
            texto = "# Datos del Clóset de Juliette\n\nNo edites a mano.\n"
            self.api("PUT", "/contents/LEEME.md", {
                "message": "Clóset de Juliette: repositorio de datos",
                "content": base64.b64encode(texto.encode()).decode(),
            })
            return self.api("GET", f"/git/ref/heads/{self.rama}")

    def publicar(self, aplicar, mensaje):
        """aplicar(datos_remotos) -> (datos_nuevos, {id_foto: bytes}). Reintenta si alguien sincronizó a la vez."""
        for _ in range(4):
            ref = self._ref()
            padre = ref["object"]["sha"]
            commit = self.api("GET", f"/git/commits/{padre}")
            arbol = self.api("GET", f"/git/trees/{commit['tree']['sha']}?recursive=1")
            remotos = {n["path"]: n["sha"] for n in arbol["tree"] if n["type"] == "blob"}
            datos = vacio()
            if "datos.json" in remotos:
                blob = self.api("GET", f"/git/blobs/{remotos['datos.json']}")
                datos = json.loads(base64.b64decode(blob["content"]).decode("utf-8"))
            datos_nuevos, fotos = aplicar(datos)
            entradas = []
            for i, (fid, contenido) in enumerate(fotos.items(), 1):
                ruta = "fotos/" + fid
                if ruta in remotos:
                    continue
                print(f"  subiendo foto {i}/{len(fotos)}", end="\r")
                b = self.api("POST", "/git/blobs", {"content": base64.b64encode(contenido).decode(), "encoding": "base64"})
                entradas.append({"path": ruta, "mode": "100644", "type": "blob", "sha": b["sha"]})
            texto = json.dumps(datos_nuevos, ensure_ascii=False, separators=(",", ":"))
            b = self.api("POST", "/git/blobs", {"content": base64.b64encode(texto.encode("utf-8")).decode(), "encoding": "base64"})
            entradas.append({"path": "datos.json", "mode": "100644", "type": "blob", "sha": b["sha"]})
            t = self.api("POST", "/git/trees", {"base_tree": commit["tree"]["sha"], "tree": entradas})
            nc = self.api("POST", "/git/commits", {"message": mensaje, "tree": t["sha"], "parents": [padre]})
            try:
                self.api("PATCH", f"/git/refs/heads/{self.rama}", {"sha": nc["sha"], "force": False})
                print(" " * 40, end="\r")
                return
            except ErrorNube as e:
                if e.estado not in (409, 422):
                    raise
                print("  la nube cambió mientras subía; reintento…")
        raise RuntimeError("No pude subir: la nube cambiaba constantemente. Intenta de nuevo.")


def vacio():
    return {"v": 1, "prendas": {}, "outfits": {}, "dias": {}, "semana": {}, "perfil": {"piel": "#e8b897", "act": 0}, "borrados": {}}


def leer_config():
    if CONFIG.exists():
        return json.loads(CONFIG.read_text(encoding="utf-8"))
    return None


# ---------------------------------------------------------------- comandos

def cmd_config(_args):
    viejo = leer_config() or {}
    print("Configuración de la nube (repositorio PRIVADO de GitHub). Enter = dejar igual.")
    owner = input(f"Usuario de GitHub [{viejo.get('owner', 'jeffry0902')}]: ").strip() or viejo.get("owner", "jeffry0902")
    repo = input(f"Repositorio de datos [{viejo.get('repo', 'closet-juliette-datos')}]: ").strip() or viejo.get("repo", "closet-juliette-datos")
    token = input("Token (github_pat_…): ").strip() or viejo.get("token", "")
    conf = {"owner": owner, "repo": repo, "token": token, "rama": "main"}
    info = Nube(conf).info()
    if not info.get("private"):
        print("⚠️  OJO: el repositorio es PÚBLICO. Hazlo privado en GitHub → Settings → General → Danger Zone.")
    if info.get("permissions") and not info["permissions"].get("push"):
        print("⚠️  El token no tiene permiso de escritura (Contents: Read and write).")
    CONFIG.write_text(json.dumps(conf, indent=2), encoding="utf-8")
    print(f"✓ Listo. Guardado en {CONFIG} (fuera de la carpeta del proyecto, para no subir el token por error).")


def categoria_de(ruta, base, args):
    partes = [p.lower() for p in ruta.relative_to(base).parts[:-1]]
    cat, ocas = None, []
    for p in partes:
        if p in ALIAS_CATEGORIA and not cat:
            cat = ALIAS_CATEGORIA[p]
        elif p in OCASIONES:
            ocas.append(p)
    return cat or args.categoria, ocas or list(args.ocasion or [])


def cmd_prendas(args):
    base = Path(args.carpeta).resolve()
    salida = base / "_listas"
    salida.mkdir(exist_ok=True)
    registro_ruta = salida / "registro.json"
    registro = json.loads(registro_ruta.read_text(encoding="utf-8")) if registro_ruta.exists() else {}
    fotos = sorted(p for p in base.rglob("*") if p.suffix.lower() in EXTENSIONES and "_listas" not in p.parts)
    if not fotos:
        print("No encontré fotos en", base)
        return
    print(f"Encontré {len(fotos)} fotos.")
    nuevas = 0
    for i, ruta in enumerate(fotos, 1):
        clave = str(ruta.relative_to(base)).replace("\\", "/")
        firma = f"{ruta.stat().st_size}-{int(ruta.stat().st_mtime)}"
        if clave in registro and registro[clave]["firma"] == firma and not args.rehacer:
            continue
        cat, ocas = categoria_de(ruta, base, args)
        if not cat and not args.ia:
            print(f"[{i}/{len(fotos)}] {clave}: ⚠️  sin categoría (ponla en una subcarpeta o usa --categoria / --ia)")
            continue
        print(f"[{i}/{len(fotos)}] {clave}: quitando fondo y embelleciendo…")
        try:
            rgba = procesar_prenda(ruta, args)
            png = png_liviano(rgba, paleta=not args.sin_paleta)
            meta = {"cat": cat, "ocas": ocas, "color": color_dominante(rgba), "nombre": "", "marca": args.marca or ""}
            if args.ia:
                try:
                    r = etiquetar_con_ia(png, cat)
                    meta["cat"] = cat or r["categoria"]
                    meta["ocas"] = ocas or r["ocasiones"]
                    meta["color"] = r["color"]
                    meta["nombre"] = r["nombre"]
                    meta["marca"] = args.marca or r["marca"]
                    print(f"     Claude: {meta['nombre']} · {meta['color']} · {', '.join(meta['ocas']) or '-'}")
                except Exception as e:  # la IA es opcional: si falla se sigue sin ella
                    print(f"     (Claude no pudo etiquetar: {e})")
                    meta["cat"] = meta["cat"] or "tops"
            pid = registro.get(clave, {}).get("id") or nuevo_id("p")
            # El nombre de la foto lleva un resumen de su contenido: si se rehace, la iPad baja la nueva
            fid = f"{pid}_{hashlib.sha1(png).hexdigest()[:8]}.png"
            archivo = salida / meta["cat"] / (ruta.stem + ".png")
            archivo.parent.mkdir(exist_ok=True)
            archivo.write_bytes(png)
            registro[clave] = {"firma": firma, "id": pid, "foto": fid, "png": str(archivo.relative_to(salida)).replace("\\", "/"),
                               "meta": meta, "subida": False}
            nuevas += 1
            print(f"     ✓ {archivo.name} ({len(png) // 1024} KB)")
        except Exception as e:
            print(f"     ✗ Error: {e}")
        registro_ruta.write_text(json.dumps(registro, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\nProcesadas {nuevas} fotos nuevas. Las PNG están en {salida}")
    subir_pendientes(salida, registro, registro_ruta, args.lote)


def armar_registros(salida, pendientes):
    prendas, fotos = {}, {}
    for clave, r in pendientes:
        fid = r.get("foto") or r["id"] + ".png"
        m = r["meta"]
        prendas[r["id"]] = {
            "id": r["id"], "cat": m["cat"], "foto": fid, "color": m.get("color"), "ocas": m.get("ocas", []),
            "marca": m.get("marca", ""), "nombre": m.get("nombre", ""), "notas": "", "creada": ahora_ms(), "act": ahora_ms(),
        }
        fotos[fid] = (salida / r["png"]).read_bytes()
    return prendas, fotos


def subir_pendientes(salida, registro, registro_ruta, solo_lote=False):
    pendientes = [(k, r) for k, r in registro.items() if not r.get("subida")]
    if not pendientes:
        print("No hay nada pendiente por subir.")
        return
    prendas, fotos = armar_registros(salida, pendientes)
    conf = leer_config()
    if solo_lote or not conf:
        if not conf:
            print("La nube no está configurada (python estudio.py config). Genero un lote para importar a mano.")
        lote = {"app": "closet-juliette", "tipo": "lote", "v": 1, "datos": {**vacio(), "prendas": prendas},
                "fotos": {fid: "data:image/png;base64," + base64.b64encode(b).decode() for fid, b in fotos.items()}}
        ruta = salida / time.strftime("lote-%Y%m%d-%H%M.json")
        ruta.write_text(json.dumps(lote, ensure_ascii=False), encoding="utf-8")
        print(f"✓ Lote listo: {ruta}\n  En la app: Más → Ajustes → Importar (combinar).")
        return

    def aplicar(datos):
        datos = {**vacio(), **datos}
        for pid, p in prendas.items():
            previa = datos["prendas"].get(pid)
            if previa:  # se conservan las ediciones hechas en la iPad (ocasión, marca…)
                p = {**p, **{k: previa[k] for k in ("cat", "ocas", "color", "marca", "nombre", "notas") if previa.get(k)}}
            datos["prendas"][pid] = {**p, "act": ahora_ms()}
            datos["borrados"].pop("prendas:" + pid, None)
        return datos, fotos

    print(f"Subiendo {len(prendas)} prendas a la nube…")
    Nube(conf).publicar(aplicar, f"Estudio PC: {len(prendas)} prendas nuevas")
    for k, _ in pendientes:
        registro[k]["subida"] = True
    registro_ruta.write_text(json.dumps(registro, indent=1, ensure_ascii=False), encoding="utf-8")
    print("✓ ¡Listo! En la iPad toca la nube ☁️ (o espera unos minutos) y aparecerán.")


def cmd_subir(args):
    salida = Path(args.carpeta).resolve() / "_listas"
    registro_ruta = salida / "registro.json"
    if not registro_ruta.exists():
        print("No hay registro en", salida)
        return
    registro = json.loads(registro_ruta.read_text(encoding="utf-8"))
    subir_pendientes(salida, registro, registro_ruta, args.lote)


def cmd_avatar(args):
    ruta = Path(args.foto)
    print("Recortando la cara y quitando el fondo…")
    rgba = hacer_avatar(ruta)
    png = png_liviano(rgba, paleta=False)
    destino = ruta.with_name(ruta.stem + "-avatar.png")
    destino.write_bytes(png)
    print(f"✓ Guardado {destino} ({len(png) // 1024} KB). Revísalo: debería verse la cabeza con el pelo y sin fondo.")
    conf = leer_config()
    if args.lote or not conf:
        print("Para usarlo sin nube: pásalo a la iPad y en Más → Mi avatar → Elegir foto.")
        return
    fid = nuevo_id("cara_") + ".png"

    def aplicar(datos):
        datos = {**vacio(), **datos}
        perfil = dict(datos.get("perfil") or {})
        perfil.update({"cara": fid, "caraRecortada": True, "act": ahora_ms()})
        datos["perfil"] = perfil
        return datos, {fid: png}

    Nube(conf).publicar(aplicar, "Estudio PC: cara del avatar")
    print("✓ Avatar subido a la nube.")


def main():
    ap = argparse.ArgumentParser(description="Estudio del Clóset de Juliette", formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("config", help="configurar la nube")
    p = sub.add_parser("prendas", help="procesar y subir fotos de prendas")
    p.add_argument("carpeta")
    p.add_argument("--ia", action="store_true")
    p.add_argument("--categoria", choices=CATEGORIAS)
    p.add_argument("--ocasion", choices=OCASIONES, action="append")
    p.add_argument("--marca")
    p.add_argument("--lote", action="store_true")
    p.add_argument("--sin-paleta", action="store_true")
    p.add_argument("--bordes-finos", action="store_true")
    p.add_argument("--sombra", action="store_true")
    p.add_argument("--rehacer", action="store_true")
    p.add_argument("--modelo", default="isnet-general-use", help="modelo de rembg (isnet-general-use, u2net, birefnet-general…)")
    a = sub.add_parser("avatar", help="recortar la cara para el avatar")
    a.add_argument("foto")
    a.add_argument("--lote", action="store_true")
    s = sub.add_parser("subir", help="subir lo pendiente")
    s.add_argument("carpeta")
    s.add_argument("--lote", action="store_true")
    args = ap.parse_args()
    try:
        {"config": cmd_config, "prendas": cmd_prendas, "avatar": cmd_avatar, "subir": cmd_subir}[args.cmd](args)
    except ErrorNube as e:
        print("✗", e)
        if e.estado == 401:
            print("  El token no es válido o expiró: python estudio.py config")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nCancelado.")


if __name__ == "__main__":
    main()
