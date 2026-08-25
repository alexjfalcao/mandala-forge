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

## A resposta: funciona no PMM

Medido em 25/08/2026, subindo o `spike-cor.scad` no Parametric Model Maker e abrindo o 3MF
gerado no Bambu Studio:

- **3 filamentos** em *Project Filaments*, nas três cores declaradas;
- as cores caem nas **regiões certas** (placa vermelha, pétalas amarelas, pontos laranja);
- **torre de purga no prato** ao fatiar — ou seja, há troca de ferramenta real. As cores
  imprimem, não são só desenho de tela.

O 3MF chega como **um objeto só** — o union implícito acontece mesmo. O que o PMM faz é
converter o `color()` do OpenSCAD em **dados de pintura por triângulo**, o mesmo formato que a
ferramenta de pintura do Bambu Studio grava.

Dissecado no `ParametricModelMaker.3mf` baixado do PMM: é um **projeto do Bambu** (16 entradas,
com `plate_1.json` e miniaturas), com `paint_color` em 45.298 dos 45.299 triângulos, quatro
valores distintos, e as quatro cores escolhidas em `filament_colour` no `project_settings`.
`model_settings` traz **um objeto, uma parte, extrusor 1** — e nenhum `basematerials`.

Ou seja, existe um **terceiro caminho** para cor num 3MF, além dos dois que este repo já
conhecia:

| | resultado |
|---|---|
| `basematerials` | fatiador ignora (medido, está no `CLAUDE.md`) |
| peças + `model_settings` + `project_settings` | funciona — é o que o gerador faz |
| **`paint_color` por triângulo, um objeto só** | **funciona — é o que o PMM produz** |

Isso explica tudo o que se observa: quatro filamentos, torre de purga, "um único modelo", e a
impossibilidade de reatribuir filamento por região — porque é pintura, não peça. Para este caso
de uso basta: a pessoa escolhe as cores no customizador e não precisa remapear nada.

⚠️ Consequência prática: **não dá para reatribuir filamento por região** no Studio, porque é
um objeto só. Quem quiser outras cores muda no customizador e gera de novo — que é justamente
o fluxo que o modelo propõe.

⚠️ Não confunda com o achado do `CLAUDE.md` ("fatiadores ignoram `basematerials`"). Aquele foi
medido em 3MF **de projeto Bambu** escrito por este repo, onde o `model_settings.config` manda.
Aqui o arquivo vem do PMM e o caminho é outro. Os dois achados convivem.

## Reproduzir

```bash
brew install --cask openscad@snapshot          # o 2021.01 está depreciado
openscad -o /tmp/a.3mf openscad/spike-cor.scad
openscad --enable=lazy-union -o /tmp/b.3mf openscad/spike-cor.scad
# e comparar a contagem de <object> nos dois
```

Render local: **0,034 s**. Tempo não é o gargalo aqui — a cor é.

## O gerador

`mandala-flat.scad` — quatro desenhos (lótus, talavera, renda, sol), diâmetro, borda,
espessura, repetições, furo e as quatro cores. Rende em 0,3 a 0,5 s por desenho.

**A borda encolhe o desenho, não o recorta.** Recortar cortaria a ponta das pétalas na
moldura; encolhendo, cada mandala mantém as próprias proporções. Daí `Rd = R - borda` ser o
raio do desenho, e `R` só a peça.

**As repetições são relativas (−4 a +4), não absolutas.** A largura de cada motivo sai de `n`,
e os presets estão afinados para a simetria deles: solto, o lótus em 24 vira teia e a renda em
6 vira quatro riscos perdidos.

⚠️ **O furo de pendurar mora no meio da borda.** Na primeira versão ficava em 0.90 R com
diâmetro fixo e caía **sempre** em cima do desenho — os motivos vão a 0.90–0.95 do raio nos
quatro presets.

**O desenho pode ir até a borda, e o furo pode encostar nele. É de propósito.** A borda é o
ajuste; quem quiser o furo limpo aumenta. O padrão é 2 mm, que deixa o desenho cheio.

A conta, para referência — o furo precisa de ~1,2 mm de material do lado de fora, e isso é
absoluto, não escala com a peça. Então quanto menor a peça, mais borda ele pede. O pior caso é
sempre a talavera, que vai a 0.95 do raio:

| | borda 2 | borda 3 |
|---|---|---|
| Ø 40 | colide 1,8 mm | colide 0,8 mm |
| Ø 60 | colide 1,3 mm | colide 0,3 mm |
| Ø 100 | colide 0,3 mm | limpo, 0,6 mm |
| Ø 150 | limpo, 1,0 mm | limpo, 1,9 mm |

Nada disso é silencioso: o preview do PMM mostra antes de a pessoa baixar.

As sete formas do gerador viraram polígono/círculo exatos; o filete é `offset()`. A pintura
por camadas ("a de cima cobre a de baixo") vira "subtraia tudo que vem depois".

**Filete por camada, não global.** Com largura fixa, `offset(-fio)` engolia o miolo dos motivos
pequenos. Aqui o filete nunca passa de 40% da meia-espessura do motivo, com piso de 0,45 mm —
a menor linha que um bico de 0,4 imprime.

Fora, com motivo: cone (é relevo), preenchimento `contornos` (offsets aninhados, risco de
timeout) e o modo vazado do `renda`, que sai com fundo.

## Teste

```bash
bash openscad/teste-cores.sh     # 4 desenhos × 6 pares de cores
```

**Duas cores não podem dividir volume.** Foi a invariante quebrada uma vez: as nervuras
existiam mas ficavam enterradas dentro da poça — dois sólidos de cores diferentes no mesmo
espaço. Sumia na tela e sairia um 3MF com sobreposição.

⚠️ O critério é **volume com tolerância**, não "está vazio". As regiões se tocam por faces
coincidentes e o CGAL devolve lascas de ~1e-8 mm³: exigir vazio reprova geometria correta. O
limiar é 1e-3 mm³. Com o bug reintroduzido, as sobreposições vão a 588–1062 mm³ — sete ordens
de grandeza acima do ruído, então o limiar não é chute.

## Licença

O `.scad` é **AGPL-3.0**, como o resto deste repo — o aviso está no topo do arquivo.

⚠️ **A licença do script não é a do modelo.** As mandalas que ele gera são de quem gera, e o
modelo publicado na MakerWorld fica sob **CC BY-NC-SA**, como o outro. A AGPL cobre o código,
não a saída dele. A descrição na MakerWorld precisa dizer isso em uma linha, senão quem baixar
não tem como saber sob que regra está.

