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

# Os três itens publicáveis. O resto do repo — suíte, exportador em Python,
# documentos de referência — não vai para o site.
ITENS=(index.html mandala-cloisonne.html img)

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
for item in "${ITENS[@]}"; do
  if diff -rq "$ORIGEM/$item" "$DESTINO/$item" >/dev/null 2>&1; then
    printf '  =  %s\n' "$item"
  else
    printf '  ≠  %s\n' "$item"
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
  for item in "${ITENS[@]}"; do
    diff -rq "$ORIGEM/$item" "$DESTINO/$item" 2>&1 | sed 's/^/    /' || true
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
for item in "${ITENS[@]}"; do
  # -R para a pasta img; --delete não existe no cp do macOS, então img/ é
  # apagada antes para que arquivo removido aqui suma lá também.
  if [ -d "$ORIGEM/$item" ]; then
    rm -rf "${DESTINO:?}/$item"
    cp -R "$ORIGEM/$item" "$DESTINO/$item"
  else
    cp "$ORIGEM/$item" "$DESTINO/$item"
  fi
  printf '  → %s\n' "$item"
done

echo
echo "copiado para $DESTINO"
echo
echo "falta commitar e empurrar no site (o Pages publica em ~1 min):"
echo "  cd $SITE && git add mandala && git commit && git push"
echo
git -C "$SITE" status --short -- mandala | sed 's/^/  /'
