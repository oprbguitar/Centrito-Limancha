"""Descubre y VERIFICA la web de comercios de Lima Centro.

Regla: una web solo se publica si la propia pagina confirma que es de ese
comercio (contiene su RUC o palabras distintivas de su nombre). Si no
responde o no confirma, no se publica. Tambien se extraen Facebook e
Instagram desde esa misma pagina verificada, nunca inventados.

Entradas:
  1. public/data/comercios.json  → comercios OSM con etiqueta website
  2. la base local de "Analisis de empresas" → empresas activas del rubro
     comercio con direccion geolocalizada a nivel de calle en la zona
  3. SEMILLAS (abajo) → webs encontradas a mano, igual pasan la verificacion

Salida: public/data/webs.json  {generated, items: {clave: {...}}}
  clave = id OSM (node/123) o "ruc:20123456789"

Uso: python scripts/webs_verificadas.py [--db RUTA] [--hilos 8]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sqlite3
import unicodedata
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "data"
DB_DEFAULT = r"C:/Users/oprbg/Documents/COPIA de DB/empresas_full.db"
BBOX = (-12.0760, -77.0600, -12.0360, -77.0060)
UA = "buscando-barato/0.3 (+https://oprbguitar.github.io/Centrito-Limancha/)"

# Webs halladas a mano para comercios conocidos del centro. Se verifican igual.
SEMILLAS = [
    {"key": "node/4353197837", "name": "Union Ychicawa", "url": "https://www.uysa.com.pe/"},
    {"key": "zona:campo-ferial", "name": "Campo Ferial Mesa Redonda", "url": "https://cfmesaredonda.com/"},
    {"key": "zona:malvinas", "name": "Las Malvinas Lima", "url": "https://www.lasmalvinaslima.com/"},
    {"key": "zona:polvos-azules", "name": "Centro Comercial Polvos Azules", "url": "https://ccpolvosazuleslimaperu.com/"},
]

PALABRAS_VACIAS = {
    "sac", "s", "a", "c", "srl", "eirl", "sa", "de", "del", "la", "el", "los", "las", "y", "e",
    "empresa", "individual", "responsabilidad", "limitada", "sociedad", "anonima", "cerrada",
    "comercial", "importaciones", "importadora", "distribuidora", "corporacion", "inversiones",
    "grupo", "peru", "lima", "negocios", "servicios", "generales", "multiservicios", "tienda",
}


def normaliza(texto: str) -> str:
    texto = unicodedata.normalize("NFD", str(texto or "").lower())
    texto = "".join(ch for ch in texto if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9ñ ]+", " ", texto)).strip()


def tokens_distintivos(nombre: str) -> list[str]:
    return [t for t in normaliza(nombre).split() if len(t) > 3 and t not in PALABRAS_VACIAS]


def normaliza_url(valor: str) -> str:
    valor = (valor or "").strip()
    if not valor or "@" in valor.split("/")[0]:
        return ""
    if not valor.startswith(("http://", "https://")):
        valor = "https://" + valor.lstrip("/")
    return valor if re.match(r"^https?://[^/\s]+\.[a-z]{2,}", valor, re.I) else ""


def descarga(url: str, timeout: int = 15) -> str:
    peticion = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "es-PE,es"})
    with urllib.request.urlopen(peticion, timeout=timeout) as respuesta:
        bruto = respuesta.read(400_000)
    for codificacion in ("utf-8", "latin-1"):
        try:
            return bruto.decode(codificacion)
        except UnicodeDecodeError:
            continue
    return ""


def redes(html: str) -> dict[str, str]:
    encontradas = {}
    for red, patron in (
        ("facebook", r"https?://(?:www\.)?facebook\.com/[A-Za-z0-9_.\-/]{3,60}"),
        ("instagram", r"https?://(?:www\.)?instagram\.com/[A-Za-z0-9_.]{3,40}"),
    ):
        for encontrado in re.findall(patron, html, re.I):
            if not re.search(r"(sharer|share\.php|/tr\?|plugins|/hashtag/|intent)", encontrado, re.I):
                encontradas[red] = encontrado.rstrip("/\"'")
                break
    return encontradas


def verifica(candidato: dict) -> dict | None:
    """Devuelve el registro solo si la pagina confirma el comercio."""
    url = normaliza_url(candidato["url"])
    if not url:
        return None
    try:
        html = descarga(url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, ValueError):
        return None
    if not html:
        return None
    texto = normaliza(re.sub(r"<[^>]+>", " ", html))
    ruc = candidato.get("ruc") or ""
    prueba = ""
    if ruc and ruc in re.sub(r"\D", "", html):
        prueba = "RUC en la página"
    else:
        tokens = tokens_distintivos(candidato["name"])
        acertados = [t for t in tokens if t in texto]
        if tokens and len(acertados) >= max(1, len(tokens) // 2):
            prueba = f"nombre en la página ({', '.join(acertados[:3])})"
    if not prueba:
        return None
    return {
        "key": candidato["key"],
        "name": candidato["name"],
        "url": url,
        "proof": prueba,
        "social": redes(html),
        "checked": dt.date.today().isoformat(),
        "origin": candidato["origin"],
    }


def candidatos(db: str) -> list[dict]:
    lista: list[dict] = []
    comercios = json.loads((DATA / "comercios.json").read_text(encoding="utf-8"))["items"]
    for comercio in comercios:
        if comercio["website"] and comercio["name"]:
            lista.append({"key": comercio["id"], "name": comercio["name"], "url": comercio["website"], "origin": "osm"})

    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    sur, oeste, norte, este = BBOX
    filas = con.execute(
        """
        SELECT e.ruc, e.razon_social, e.nombre_comercial, e.ciiu_descripcion, e.direccion_fiscal,
               g.latitud, g.longitud, e.sitio_web, e.redes_sociales
        FROM empresa e JOIN geocache g ON g.ruc = e.ruc
        WHERE e.ruc LIKE '20%' AND e.estado_ruc = 'ACTIVO' AND e.condicion_domicilio = 'HABIDO'
          AND e.ciiu_descripcion LIKE 'VENTA AL POR%'
          AND g.precision IN ('calle', 'osm')
          AND g.latitud BETWEEN ? AND ? AND g.longitud BETWEEN ? AND ?
        """,
        (sur, norte, oeste, este),
    ).fetchall()
    empresas = []
    for ruc, razon, comercial, ciiu, direccion, lat, lon, web, sociales in filas:
        empresas.append({
            "ruc": ruc, "razon": razon, "comercial": comercial or "", "ciiu": (ciiu or "").capitalize(),
            "direccion": direccion or "", "lat": round(lat, 6), "lon": round(lon, 6),
        })
        for url in [web] + list(json.loads(sociales).values() if sociales else []):
            if normaliza_url(url or "") and "facebook.com" not in (url or "") and "instagram.com" not in (url or ""):
                lista.append({"key": f"ruc:{ruc}", "name": razon, "ruc": ruc, "url": url, "origin": "base"})
    (DATA / "empresas-sunat.json").write_text(json.dumps({
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "items": empresas,
    }, ensure_ascii=False), encoding="utf-8")
    print(f"{len(empresas)} empresas SUNAT geolocalizadas -> empresas-sunat.json")

    lista.extend({**semilla, "origin": "semilla"} for semilla in SEMILLAS)
    return lista


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=DB_DEFAULT)
    parser.add_argument("--hilos", type=int, default=8)
    args = parser.parse_args()

    lista = candidatos(args.db)
    print(f"Verificando {len(lista)} candidatos…")
    with ThreadPoolExecutor(max_workers=args.hilos) as pool:
        resultados = [r for r in pool.map(verifica, lista) if r]

    items = {}
    for resultado in resultados:  # gana la primera verificacion por clave
        items.setdefault(resultado["key"], resultado)
    (DATA / "webs.json").write_text(json.dumps({
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "items": items,
    }, ensure_ascii=False), encoding="utf-8")
    con_redes = sum(1 for item in items.values() if item["social"])
    print(f"{len(items)} webs verificadas ({con_redes} con Facebook o Instagram) de {len(lista)} candidatas -> webs.json")


if __name__ == "__main__":
    main()
