#!/usr/bin/env python3
"""
Testa a via de exportação por contorno (amostrar.js + exportar.py).

Roda numa grade pequena de propósito: o que se verifica aqui é a cadeia, não o
acabamento. Para cada preset confere que toda peça sai fechada, que o disco tem
o diâmetro exato e que o 3MF é um pacote válido com o de-para peça → extrusor.

    python3 teste-contorno.py
"""
import json
import os
import subprocess
import sys
import tempfile
import zipfile

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import numpy as np                                    # noqa: E402
import trimesh                                        # noqa: E402
from shapely.geometry import Point                    # noqa: E402

import exportar                                       # noqa: E402

PRESETS = ["incenso", "lotus", "talavera", "renda", "sol"]
GRADE, SUB = 700, 2


def um_caso(nome, tmp):
    bin_path = os.path.join(tmp, nome + ".bin")
    info = exportar.amostrar("preset:" + nome, bin_path, GRADE, SUB)
    n, quadro, raio, regioes, cob = exportar.ler_grade(bin_path)
    cfg = info["cfg"]
    eixo = np.linspace(-quadro, quadro, n)
    disco = Point(0, 0).buffer(raio, quad_segs=256)

    por_cor, total_tri = {}, 0
    for i, reg in enumerate(regioes):
        polys = exportar.poligonos_da_regiao(cob[i], eixo, 0.02, 0.05, disco)
        malhas = exportar.extrudar(polys, reg["z"])
        if malhas:
            por_cor.setdefault(reg["cor"], []).extend(malhas)
    cone = exportar.cone_central(cfg)
    if cone is not None:
        por_cor.setdefault(cfg["corBase"], []).append(cone)

    pecas = [(cor, trimesh.util.concatenate(m)) for cor, m in por_cor.items()]
    saida = os.path.join(tmp, nome + ".3mf")
    exportar.escrever_3mf(pecas, saida, nome)

    problemas = []
    abertas = [c for c, m in pecas if not m.is_watertight]
    if abertas:
        problemas.append("peças abertas: " + ", ".join(abertas))
    if not pecas:
        problemas.append("nenhuma peça")

    # diâmetro exato
    todas = trimesh.util.concatenate([m for _, m in pecas])
    total_tri = len(todas.faces)
    lados = todas.bounds[1][:2] - todas.bounds[0][:2]
    if max(abs(lados - cfg["diam"])) > 0.02:
        problemas.append("diâmetro %.3f x %.3f, esperado %.1f" % (lados[0], lados[1], cfg["diam"]))
    if todas.bounds[0][2] < -1e-6:
        problemas.append("z negativo: %.4f" % todas.bounds[0][2])

    # o pacote 3MF
    with zipfile.ZipFile(saida) as z:
        if z.testzip() is not None:
            problemas.append("CRC do zip")
        nomes = set(z.namelist())
        for exigido in ("[Content_Types].xml", "_rels/.rels", "3D/3dmodel.model",
                        "Metadata/model_settings.config"):
            if exigido not in nomes:
                problemas.append("falta " + exigido)
        cfgxml = z.read("Metadata/model_settings.config").decode()
        for i in range(len(pecas)):
            if 'key="extruder" value="%d"' % (i + 1) not in cfgxml:
                problemas.append("sem extrusor %d no model_settings" % (i + 1))

    return pecas, total_tri, os.path.getsize(saida), problemas


def main():
    falhas = 0
    print("via por contorno — grade %dx%d, %d sub-amostras" % (GRADE, GRADE, SUB * SUB))
    with tempfile.TemporaryDirectory() as tmp:
        for nome in PRESETS:
            try:
                pecas, tri, tam, problemas = um_caso(nome, tmp)
            except Exception as e:
                print("FALHA %-10s exceção: %s" % (nome, e))
                falhas += 1
                continue
            ok = not problemas
            falhas += 0 if ok else 1
            print("%s %-10s %d peças  %7d tri  %5.2f MB %s"
                  % ("OK   " if ok else "FALHA", nome, len(pecas), tri, tam / 1048576,
                     "" if ok else "· " + " · ".join(problemas)))

    print("\n" + ("TODOS OS TESTES PASSARAM" if falhas == 0 else "%d CASO(S) COM FALHA" % falhas))
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
