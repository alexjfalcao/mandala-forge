#!/usr/bin/env python3
"""
Exporta a mandala como sólidos por CONTORNO, não por grade.

O gerador em HTML monta a peça amostrando um campo de alturas numa grade polar.
Isso serve para desenhar e para o preview, mas na hora de imprimir traz dois
problemas juntos:

  * toda fronteira sai em escada, com degraus da largura de uma célula;
  * a cor tem que ser assada por face, e aí o fatiador a agrupa como quiser.

Aqui a peça é montada ao contrário: extrai-se a curva de nível de cada região
(cor + altura) com precisão sub-pixel e extruda-se cada uma como um sólido
fechado. As bordas ficam lisas, cada cor vira uma peça, e o 3MF de saída diz ao
fatiador qual extrusor usar em cada uma — sem diálogo de agrupamento no meio.

A matemática do desenho continua morando no HTML: `amostrar.js` avalia o núcleo
em JS e despeja o mapa de regiões, que é o que este script consome. Não há
fórmula duplicada em Python.

Uso:
    python3 exportar.py config.json     saida.3mf [--grade 2400] [--sub 3]
    python3 exportar.py preset:incenso  saida.3mf
    python3 exportar.py -               saida.3mf

Dependências: numpy, shapely, contourpy, trimesh.
"""

import argparse
import json
import os
import struct
import subprocess
import sys
import tempfile
import zipfile

import numpy as np
import trimesh
from contourpy import FillType, contour_generator
from shapely.geometry import Polygon
from shapely.ops import unary_union

AQUI = os.path.dirname(os.path.abspath(__file__))


# --------------------------------------------------------------------------
# ponte com o núcleo em JS
# --------------------------------------------------------------------------
def achar_node():
    """Com nvm, `node` é uma função do shell e não um binário no PATH — o
    subprocess não a enxerga. Procura o executável de verdade."""
    import glob
    import shutil
    if os.environ.get("NODE"):
        return os.environ["NODE"]
    achado = shutil.which("node")
    if achado:
        return achado
    padroes = [os.path.expanduser("~/.nvm/versions/node/*/bin/node"),
               "/usr/local/bin/node", "/opt/homebrew/bin/node"]
    candidatos = sorted(c for p in padroes for c in glob.glob(p))
    if candidatos:
        return candidatos[-1]
    sys.exit("node não encontrado. Defina a variável NODE com o caminho do executável.")


def amostrar(config, destino, grade, sub):
    cmd = [achar_node(), os.path.join(AQUI, "amostrar.js"), config, destino,
           "--grade", str(grade), "--sub", str(sub)]
    saida = subprocess.run(cmd, capture_output=True, text=True)
    if saida.returncode != 0:
        sys.exit("amostrar.js falhou:\n" + saida.stderr)
    return json.loads(saida.stdout)


def ler_grade(caminho):
    dados = open(caminho, "rb").read()
    if dados[:4] != b"MCR2":
        sys.exit("arquivo de grade inválido ou de versão antiga")
    n, = struct.unpack_from("<I", dados, 4)
    quadro, = struct.unpack_from("<f", dados, 8)
    raio, = struct.unpack_from("<f", dados, 12)
    n_reg, = struct.unpack_from("<I", dados, 16)
    regioes = []
    for i in range(n_reg):
        z, r, g, b, _ = struct.unpack_from("<fBBBB", dados, 20 + i * 8)
        regioes.append({"z": z, "cor": "#%02x%02x%02x" % (r, g, b)})
    cob = np.frombuffer(dados, dtype=np.uint8, offset=20 + n_reg * 8)
    cob = cob.reshape(n_reg, n, n)
    return n, quadro, raio, regioes, cob


# --------------------------------------------------------------------------
# contorno → polígonos
# --------------------------------------------------------------------------
def poligonos_da_regiao(cobertura, eixo, tolerancia, area_minima, disco=None):
    """Curvas de nível em 50% de cobertura. A cobertura vem da sub-amostragem
    no JS, então o contorno é sub-pixel: é ela que tira a escada."""
    cg = contour_generator(x=eixo, y=eixo, z=cobertura.astype(np.float32) / 255.0,
                           fill_type=FillType.OuterOffset)
    pontos, offsets = cg.filled(0.5, 2.0)
    saida = []
    for pts, off in zip(pontos, offsets):
        aneis = [pts[off[i]:off[i + 1]] for i in range(len(off) - 1)]
        casca = aneis[0]
        if len(casca) < 4:
            continue
        buracos = [a for a in aneis[1:] if len(a) >= 4]
        try:
            p = Polygon(casca, buracos)
            if not p.is_valid:
                p = p.buffer(0)
            if tolerancia > 0:
                p = p.simplify(tolerancia, preserve_topology=True)
            if disco is not None:
                p = p.intersection(disco)          # o disco tem Ø exato, não o da moldura
            if p.is_empty:
                continue
            for parte in (p.geoms if p.geom_type == "MultiPolygon" else [p]):
                if parte.area >= area_minima and parte.is_valid:
                    saida.append(parte)
        except Exception:
            continue
    return saida


def extrudar(poligonos, altura):
    malhas = []
    for p in poligonos:
        try:
            m = trimesh.creation.extrude_polygon(p, altura)
            if len(m.faces):
                malhas.append(m)
        except Exception:
            continue
    return malhas


# --------------------------------------------------------------------------
# o cone central é curvo: sólido de revolução, não região extrudada
# --------------------------------------------------------------------------
def cone_central(cfg, segmentos=192):
    d = float(cfg.get("cone", 0) or 0)
    if d <= 0:
        return None
    base = float(cfg.get("base", 3))
    alt = float(cfg.get("coneH", 5))
    curva = max(0.1, float(cfg.get("coneC", 0.7)))
    furo = float(cfg.get("furo", 0) or 0)
    prof = float(cfg.get("furoP", 0) or 0)
    rc = d / 2.0

    # perfil (r, z) do eixo para fora, no topo
    passos = 28
    perfil = []
    r0 = furo / 2.0 if furo > 0 else 0.0
    if furo > 0:
        fundo = max(0.8, base + alt - prof)
        perfil.append((0.0, fundo))
        perfil.append((r0, fundo))
    for i in range(passos + 1):
        r = r0 + (rc - r0) * i / passos
        u = min(1.0, max(0.0, r / rc))
        perfil.append((r, base + alt * (1.0 - u) ** curva))
    if furo <= 0:
        perfil.insert(0, (0.0, base + alt))

    # fecha o contorno descendo até z=0 e voltando pelo eixo
    contorno = perfil + [(rc, 0.0), (0.0, 0.0)]
    poly = Polygon(contorno)
    if not poly.is_valid:
        poly = poly.buffer(0)
    return trimesh.creation.revolve(np.array(poly.exterior.coords), sections=segmentos)


# --------------------------------------------------------------------------
# 3MF com uma peça por cor e o de-para peça → extrusor
# --------------------------------------------------------------------------
CONTENT_TYPES = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
    '<Default Extension="config" ContentType="text/xml"/>'
    "</Types>"
)
RELS = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rel0" Target="/3D/3dmodel.model" '
    'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'
)


def escrever_3mf(pecas, caminho, nome="mandala"):
    """pecas: lista de (cor_hex, trimesh). Cada uma vira um <object> e um
    extrusor. O model_settings.config é o que faz o Bambu Studio atribuir
    filamento por peça em vez de agrupar cores por conta própria."""
    partes = ['<?xml version="1.0" encoding="UTF-8"?>\n'
              '<model unit="millimeter" xml:lang="en-US" '
              'xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">\n'
              '<metadata name="Application">Mandala Cloisonne</metadata>\n'
              f'<metadata name="Title">{nome}</metadata>\n'
              "<resources>\n<basematerials id=\"1\">\n"]
    for cor, _ in pecas:
        partes.append(f'<base name="{cor}" displaycolor="{cor.upper()}FF"/>\n')
    partes.append("</basematerials>\n")

    for i, (cor, malha) in enumerate(pecas):
        v = malha.vertices
        f = malha.faces
        partes.append(f'<object id="{2 + i}" type="model" pid="1" pindex="{i}">\n<mesh>\n<vertices>\n')
        partes.append("".join(
            '<vertex x="%.5g" y="%.5g" z="%.5g"/>\n' % (p[0], p[1], p[2]) for p in v))
        partes.append("</vertices>\n<triangles>\n")
        partes.append("".join(
            '<triangle v1="%d" v2="%d" v3="%d"/>\n' % (t[0], t[1], t[2]) for t in f))
        partes.append("</triangles>\n</mesh>\n</object>\n")

    raiz = 2 + len(pecas)
    partes.append(f'<object id="{raiz}" type="model">\n<components>\n')
    for i in range(len(pecas)):
        partes.append(f'<component objectid="{2 + i}"/>\n')
    partes.append("</components>\n</object>\n</resources>\n")
    partes.append(f'<build><item objectid="{raiz}"/></build>\n</model>\n')

    cfgxml = ['<?xml version="1.0" encoding="UTF-8"?>\n<config>\n',
              f'  <object id="{raiz}">\n',
              f'    <metadata key="name" value="{nome}"/>\n',
              '    <metadata key="extruder" value="1"/>\n']
    for i, (cor, _) in enumerate(pecas):
        cfgxml.append(
            f'    <part id="{2 + i}" subtype="normal_part">\n'
            f'      <metadata key="name" value="{nome} {cor}"/>\n'
            f'      <metadata key="extruder" value="{i + 1}"/>\n'
            '      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>\n'
            "    </part>\n")
    cfgxml.append("  </object>\n</config>\n")

    with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES)
        z.writestr("_rels/.rels", RELS)
        z.writestr("3D/3dmodel.model", "".join(partes))
        z.writestr("Metadata/model_settings.config", "".join(cfgxml))


# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Exporta a mandala por contorno (bordas lisas, uma peça por cor).")
    ap.add_argument("config", help="JSON salvo pelo app, 'preset:<nome>' (ex.: preset:incenso), ou - para a config padrão")
    ap.add_argument("saida", help="arquivo .3mf de saída")
    ap.add_argument("--grade", type=int, default=2400, help="lado da grade de amostragem (padrão 2400)")
    ap.add_argument("--sub", type=int, default=3, help="sub-amostras por eixo (padrão 3)")
    ap.add_argument("--tolerancia", type=float, default=0.015,
                    help="simplificação do contorno em mm (padrão 0,015)")
    ap.add_argument("--area-minima", type=float, default=0.05,
                    help="descarta ilhas menores que isto, em mm² (padrão 0,05)")
    args = ap.parse_args()

    with tempfile.TemporaryDirectory() as tmp:
        bin_path = os.path.join(tmp, "grade.bin")
        print("amostrando o desenho pelo núcleo em JS…")
        info = amostrar(args.config, bin_path, args.grade, args.sub)
        print("  grade %dx%d, %d sub-amostras por célula, %d regiões, %.1fs"
              % (info["grade"], info["grade"], info["sub"] ** 2, info["regioes"], info["segundos"]))
        n, quadro, raio, regioes, cob = ler_grade(bin_path)
    cfg = info["cfg"]          # resolvido pelo amostrador, seja .json ou preset

    eixo = np.linspace(-quadro, quadro, n)
    from shapely.geometry import Point
    disco = Point(0, 0).buffer(raio, quad_segs=512)   # recorta no Ø exato da peça
    mm_por_celula = 2 * quadro / n
    print("  1 célula = %.4f mm; tolerância do contorno = %.3f mm" % (mm_por_celula, args.tolerancia))

    por_cor = {}
    total_tri = 0
    print("extraindo contornos e extrudando…")
    for i, reg in enumerate(regioes):
        polys = poligonos_da_regiao(cob[i], eixo, args.tolerancia, args.area_minima, disco)
        malhas = extrudar(polys, reg["z"])
        if not malhas:
            continue
        tri = sum(len(m.faces) for m in malhas)
        total_tri += tri
        print("  %-9s z=%.2f  %3d ilhas  %6d triângulos" % (reg["cor"], reg["z"], len(polys), tri))
        por_cor.setdefault(reg["cor"], []).extend(malhas)

    c = cone_central(cfg)
    if c is not None:
        total_tri += len(c.faces)
        base_cor = cfg.get("corBase", "#5b2a7a")
        print("  %-9s cone central     %6d triângulos" % (base_cor, len(c.faces)))
        por_cor.setdefault(base_cor, []).append(c)

    pecas = []
    for cor, malhas in por_cor.items():
        junta = trimesh.util.concatenate(malhas)
        pecas.append((cor, junta))

    escrever_3mf(pecas, args.saida)
    tam = os.path.getsize(args.saida)
    print("\n%s — %d peças (uma por extrusor), %d triângulos, %.1f MB"
          % (args.saida, len(pecas), total_tri, tam / 1048576))
    for i, (cor, m) in enumerate(pecas):
        fechada = m.is_watertight
        print("  extrusor %d  %-9s %7d tri  %s"
              % (i + 1, cor, len(m.faces), "fechada" if fechada else "ABERTA"))


if __name__ == "__main__":
    main()
