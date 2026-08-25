# Mandala chapada em OpenSCAD

Versão simplificada do Mandala Forge para o **Parametric Model Maker** da MakerWorld:
desenhos fixos, sem relevo, em que a pessoa escolhe tamanho e cores na própria tela de
customização.

**Ainda não existe.** O que existe aqui é o spike que decide se ela é possível.

## O problema

O OpenSCAD faz **union implícito no topo**. Uma mandala é `for` radial por definição, e a
suspeita era que isso destruísse o mapeamento cor→região no 3MF.

Medido localmente com o `spike-cor.scad` (OpenSCAD 2026.06.12), exportando 3MF:

| | objetos no 3MF | índices de material |
|---|---|---|
| `openscad -o x.3mf` | **1**, com 5037 triângulos | 1, 2 e 3 **misturados no mesmo objeto** |
| `openscad --enable=lazy-union -o x.3mf` | **3**, um `<item>` cada | objeto 2 → só `1`, objeto 3 → só `2`, objeto 4 → só `3` |

Ou seja: **`lazy-union` é o que faz a cor virar peça.** Sem ela o OpenSCAD grava a cor em
`basematerials`, por triângulo — e o `CLAUDE.md` deste repo registra, de medição própria,
que **fatiador ignora `basematerials`**: cor só chega ao Bambu/Prusa como *peça*.

Agrupar por cor no topo (`color(c) for(...)` em vez de trocar de cor dentro do laço) **não
resolve sozinho** — foi a primeira hipótese e ela caiu no teste acima. É necessária, mas não
suficiente: sem `lazy-union` o topo funde do mesmo jeito.

## A pergunta que sobra

A flag **não está disponível no Parametric Model Maker**. Mas o PMM tem pipeline próprio de
3MF e anuncia multicolor desde a v0.9.0, dizendo que o Bambu Studio mostra cada cor como um
filamento em *Project Filaments*.

Então falta medir no PMM, e só lá:

1. O 3MF gerado tem **vários `<object>`** ou **um só com `basematerials`**?
2. As cores aparecem certas ao abrir no Bambu Studio?
3. Dá para **reatribuir** o filamento de cada região?

⚠️ Cuidado ao interpretar: (2) e (3) são perguntas diferentes. Se as cores saírem certas mas
não puderem ser reatribuídas, **isso pode bastar** para o nosso caso — a pessoa já escolheu as
cores no customizador e não precisa remapear nada. O relato de falha que existe na comunidade
é sobre reatribuição, não sobre impressão.

## Reproduzir

```bash
brew install --cask openscad@snapshot          # o 2021.01 está depreciado
openscad -o /tmp/a.3mf openscad/spike-cor.scad
openscad --enable=lazy-union -o /tmp/b.3mf openscad/spike-cor.scad
# e comparar a contagem de <object> nos dois
```

Render local: **0,034 s**. Tempo não é o gargalo aqui — a cor é.
