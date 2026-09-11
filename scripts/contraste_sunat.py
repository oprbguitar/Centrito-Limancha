"""Exporta el contraste SUNAT de los comercios OSM de Lima Centro.

Lee la base local del proyecto "Analisis de empresas" (solo lectura), toma los
establecimientos OSM de la zona que ya fueron conciliados con un RUC y publica
unicamente datos del padron de personas juridicas (RUC 20): razon social,
estado, condicion de domicilio y actividad CIIU. No exporta telefonos,
correos, representantes ni personas naturales.

Uso:
    python scripts/contraste_sunat.py [--db RUTA]
Salida: public/data/sunat-contraste.json
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
from pathlib import Path

DB_DEFAULT = r"C:/Users/oprbg/Documents/COPIA de DB/empresas_full.db"
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "sunat-contraste.json"
BBOX = (-12.0760, -77.0600, -12.0360, -77.0060)  # s, w, n, e (igual que src/model.js)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=DB_DEFAULT)
    args = parser.parse_args()

    con = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    s, w, n, e = BBOX
    rows = con.execute(
        """
        SELECT est.id, emp.ruc, emp.razon_social, emp.estado_ruc, emp.condicion_domicilio,
               emp.ciiu_descripcion, est.score_match
        FROM establecimiento est
        JOIN empresa emp ON emp.ruc = est.ruc_match
        WHERE est.latitud BETWEEN ? AND ? AND est.longitud BETWEEN ? AND ?
          AND emp.ruc LIKE '20%'
        """,
        (s, n, w, e),
    ).fetchall()

    corte = con.execute(
        "SELECT max(fecha) FROM ingesta WHERE lower(fuente) LIKE '%sunat%'"
    ).fetchone()[0]

    items = {}
    for osm_id, ruc, razon, estado, condicion, ciiu, score in rows:
        items[osm_id.removeprefix("osm:")] = {
            "ruc": ruc,
            "razon": razon,
            "estado": estado or "",
            "condicion": condicion or "",
            "ciiu": (ciiu or "").capitalize(),
            "score": round(score or 0, 2),
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                "padronCorte": (corte or "")[:10],
                "items": items,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"{len(items)} comercios con contraste SUNAT -> {OUT}")


if __name__ == "__main__":
    main()
