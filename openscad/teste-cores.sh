#!/usr/bin/env bash
#
# Duas cores não podem dividir volume.
#
# É a invariante que este projeto quebrou uma vez: as nervuras existiam mas
# ficavam enterradas dentro da poça, dois sólidos de cores diferentes ocupando
# o mesmo espaço. Sumia na tela e sairia um 3MF com sobreposição.
#
# Roda os 4 desenhos × os 6 pares de cores e mede o VOLUME da interseção.
#
# Por que volume e não "está vazio": as regiões se tocam por faces coincidentes,
# e aí o CGAL devolve lascas de ~1e-8 mm³. Medido: a interseção fundo×filete da
# talavera dá 5,7e-8 mm³, ou 2,4e-12 da peça. Exigir vazio reprova geometria
# correta. O limiar abaixo é 1e-3 mm³ — cinco ordens de grandeza acima do ruído
# e muito abaixo de qualquer coisa que um bico de 0,4 consiga extrudar.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

LIMIAR=0.001
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

PARES=("fundo×filete" "fundo×poça1" "fundo×poça2" "filete×poça1" "filete×poça2" "poça1×poça2")
NOMES=("lótus" "talavera" "renda" "sol")

falhas=0
echo "cores dividindo volume (limiar ${LIMIAR} mm³):"
for d in 1 2 3 4; do
  linha=$(printf '  %-10s' "${NOMES[$((d-1))]}")
  for p in 0 1 2 3 4 5; do
    openscad -o "$TMP/i.stl" -D desenho=$d -D par=$p teste-cores.scad >/dev/null 2>&1 || true
    v=$(python3 - "$TMP/i.stl" <<'PY'
import re, io, sys, os
p = sys.argv[1]
if not os.path.exists(p) or os.path.getsize(p) == 0:
    print("0"); raise SystemExit
t = io.open(p, encoding='utf-8', errors='replace').read()
v = [tuple(map(float, m.groups())) for m in re.finditer(r'vertex\s+(\S+)\s+(\S+)\s+(\S+)', t)]
s = 0.0
for i in range(0, len(v), 3):
    a, b, c = v[i], v[i+1], v[i+2]
    s += (a[0]*(b[1]*c[2]-c[1]*b[2]) - a[1]*(b[0]*c[2]-c[0]*b[2]) + a[2]*(b[0]*c[1]-c[0]*b[1]))/6.0
print("%.10g" % abs(s))
PY
)
    if python3 -c "import sys; sys.exit(0 if float('$v') <= $LIMIAR else 1)"; then
      linha="$linha  ok"
    else
      linha="$linha  FALHA(${PARES[$p]}=${v}mm³)"
      falhas=$((falhas + 1))
    fi
    rm -f "$TMP/i.stl"
  done
  echo "$linha"
done

echo
if [ "$falhas" -eq 0 ]; then echo "TODOS OS TESTES PASSARAM"; else echo "$falhas sobreposições reais"; fi
exit $([ "$falhas" -eq 0 ] && echo 0 || echo 1)
