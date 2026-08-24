#!/usr/bin/env bash
#
# Publica o Mandala Forge em alexfalcao.pro.br/mandala/.
#
# Existe porque a pasta `mandala/` do site é uma CÓPIA: o repo de origem é este,
# e o `AGENTS.md` de lá diz para nunca editar a cópia no lugar. A regra já foi
# quebrada duas vezes (os commits do cartão Open Graph e do rodapé nasceram no
# site e foram retroportados à mão). Enquanto publicar for um `cp` lembrado de
# cabeça, vai ser quebrada de novo.
#
#   ./publicar.sh              copia daqui para o site
#   ./publicar.sh --verificar  só compara e diz se divergiram (não escreve nada)
#
# O destino vem de $SITE, ou do padrão abaixo.

set -euo pipefail

ORIGEM="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE="${SITE:-$HOME/Documents/Projetos/alexfalcao.pro.br}"
DESTINO="$SITE/mandala"

# O que é publicável, como "origem|destino". O resto do repo — suíte, exportador
# em Python, documentos de referência — não vai para o site.
#
# O LICENSE vai junto porque a AGPL manda entregar uma cópia da licença com o
# programa, e o programa é servido dali. Vira .txt no destino: sem extensão, o
# GitHub Pages serve como octet-stream e o navegador baixa em vez de mostrar.
ITENS=(
  "index.html|index.html"
  "mandala-cloisonne.html|mandala-cloisonne.html"
  "img|img"
  "LICENSE|LICENSE.txt"
)

VERIFICAR=0
FORCAR=0
for arg in "$@"; do
  case "$arg" in
    --verificar|-v) VERIFICAR=1 ;;
    --forcar|-f)    FORCAR=1 ;;
    *) echo "uso: $(basename "$0") [--verificar] [--forcar]" >&2; exit 2 ;;
  esac
done

[ -d "$DESTINO" ] || { echo "destino não existe: $DESTINO" >&2; exit 1; }

# ---------------------------------------------------------------- verificação
divergiu=0
for par in "${ITENS[@]}"; do
  de="${par%%|*}"; para="${par#*|}"
  if diff -rq "$ORIGEM/$de" "$DESTINO/$para" >/dev/null 2>&1; then
    printf '  =  %s\n' "$para"
  else
    printf '  ≠  %s\n' "$para"
    divergiu=1
  fi
done

if [ "$VERIFICAR" = 1 ]; then
  if [ "$divergiu" = 0 ]; then
    echo "publicado está em dia com $ORIGEM"
    exit 0
  fi
  echo
  echo "divergiu — rode sem --verificar para publicar. Diferenças:"
  for par in "${ITENS[@]}"; do
    de="${par%%|*}"; para="${par#*|}"
    diff -rq "$ORIGEM/$de" "$DESTINO/$para" 2>&1 | sed 's/^/    /' || true
  done
  exit 1
fi

if [ "$divergiu" = 0 ]; then
  echo "nada a fazer: já está idêntico"
  exit 0
fi

# ---------------------------------------------------------------- publicação
# Publicar estado não commitado é como o histórico do site fica apontando para
# um commit que não descreve o que está no ar.
if [ -n "$(git -C "$ORIGEM" status --porcelain 2>/dev/null)" ] && [ "$FORCAR" = 0 ]; then
  echo >&2
  echo "há alterações não commitadas em $ORIGEM:" >&2
  git -C "$ORIGEM" status --short >&2
  echo >&2
  echo "commite antes de publicar, ou passe --forcar." >&2
  exit 1
fi

echo
for par in "${ITENS[@]}"; do
  de="${par%%|*}"; para="${par#*|}"
  # -R para a pasta img; --delete não existe no cp do macOS, então img/ é
  # apagada antes para que arquivo removido aqui suma lá também.
  if [ -d "$ORIGEM/$de" ]; then
    rm -rf "${DESTINO:?}/$para"
    cp -R "$ORIGEM/$de" "$DESTINO/$para"
  else
    cp "$ORIGEM/$de" "$DESTINO/$para"
  fi
  printf '  → %s\n' "$para"
done

echo
echo "copiado para $DESTINO"
echo
echo "falta commitar e empurrar no site (o Pages publica em ~1 min):"
echo "  cd $SITE && git add mandala && git commit && git push"
echo
git -C "$SITE" status --short -- mandala | sed 's/^/  /'
