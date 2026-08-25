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

O 3MF chega como **um objeto só** — o union implícito acontece mesmo. Mas o pipeline do PMM
entrega a cor de um jeito que o Bambu Studio entende, e para este caso de uso isso basta: a
pessoa escolhe as cores no customizador e não precisa reatribuir nada.

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

`mandala-flat.scad` — quatro desenhos (lótus, talavera, renda, sol), diâmetro de 40 a 150 mm,
furo no topo/no centro/nenhum, quatro cores em seletor. Rende em 0,3 a 0,5 s por desenho.

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

