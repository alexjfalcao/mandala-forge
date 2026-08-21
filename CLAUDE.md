# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Textos de interface, comentários e documentação deste projeto são em **pt-BR** — mantenha esse padrão.

## Projeto

Dois geradores de mandala para impressão 3D. Cada um é um HTML de página única,
autocontido, **zero dependências, sem build, sem CDN, sem `localStorage`** — e cada um tem
sua suíte e seu documento de referência:

| App | O que faz | Doc | Teste |
|---|---|---|---|
| `mandala-stl.html` | relevo por **campo escalar suave** em anéis concêntricos; modos relevo e vazado | `MANDALA-STL.md` | `teste.js` |
| `mandala-cloisonne.html` | **cloisonné**: filete em alto-relevo represando poças rebaixadas de esmalte, motivos por distância assinada | `MANDALA-CLOISONNE.md` | `teste-cloisonne.js` |

São irmãos independentes: compartilham a arquitetura (mesma separação em blocos, mesmo
mesher polar, mesmas invariantes de estanqueidade) mas **nenhum código**. Uma correção de
geometria num deles não se propaga sozinha para o outro — avalie se cabe nos dois.

`exemplo_mandala.jpg` é a foto de referência que originou o gerador cloisonné (o preset
`incensário` é a tentativa de reproduzi-la).

**Leia o `.md` do app antes de mexer na geometria dele** — as fórmulas de cada motivo, o
modelo de dados e as armadilhas estão lá, não no código.

## Comandos

```bash
node teste.js                 # suíte do gerador de relevo   (8 casos + qualidade máxima)
node teste-cloisonne.js       # suíte do cloisonné           (8 casos + fuzz 40× + qualidade máxima)
open mandala-stl.html         # abrir um app no navegador (é só o arquivo, não há servidor)
```

Ambas as suítes saem com código 1 se algum caso falhar. Não há test runner: cada caso é
uma entrada no array `cases`. Para rodar só um, comente os demais `cases.push(...)`.

O `package.json` local existe só para marcar `"type": "commonjs"` — sem ele o Node herda o
`"type": "module"` de um `package.json` que está na home do usuário e `require` para de
funcionar. O projeto continua sem dependências.

Se precisar abrir um app com automação de navegador, `file://` costuma ser bloqueado;
sirva com `python3 -m http.server` e acesse por `localhost`.

Validação externa opcional (`pip install trimesh`): `m.is_watertight` e
`m.is_winding_consistent` devem ser `True`.

## Arquitetura

### O que os dois têm em comum

Três blocos por arquivo, e **essa separação é contratual** nos dois: as suítes extraem o
núcleo por regex (`/<script id="mandala-core">([\s\S]*?)<\/script>/`) e o rodam em `vm`.
Logo, nos dois apps: **não renomeie o `id` do bloco**, não use `document`/`window` dentro do
núcleo, e mantenha o objeto exportado (`MD` / `MC`) como `var` no topo do bloco — o harness
faz `this.MD = MD`.

O mesher polar é o mesmo nos dois, com as mesmas invariantes (ver adiante). O que muda é
como a altura de cada ponto é calculada.

### `mandala-stl.html` — relevo por campo

O arquivo tem três blocos:

| Bloco | Linhas | Papel |
|---|---|---|
| `<style>` | 7–110 | tema escuro, layout flex |
| `<body>` | 112–192 | painel de controles + canvas + rodapé |
| `<script id="mandala-core">` | 194–561 | matemática, malha, STL — **sem nenhum DOM** |
| `<script id="mandala-ui">` | 563–1106 | presets, painel, preview 2D/3D, download |

`teste.js` extrai o núcleo por regex (`/<script id="mandala-core">([\s\S]*?)<\/script>/`) e o
roda em `vm`. Consequências: **não renomeie o `id` do bloco**, não use `document`/`window`
dentro do núcleo, e mantenha `MD` como `var` no topo do bloco (o harness faz `this.MD = MD`).

#### Pipeline

```
cfg → prepare()  → anéis ativos com faixa radial lo/hi pré-calculada
    → shape()    → máscara 0..1 de UM anel (valor com sinal s + perfil de altura)
    → field()    → campo combinado 0..1 (positivos por max, negativos subtraídos)
    → solid()    → há material aqui? (raio em MILÍMETROS, não normalizado)
    → buildMesh()→ grade polar NR×NT; alturas nos nós, presença no centro da célula
    → toSTL()    → ArrayBuffer binário
    → audit()    → { openEdges, degenerate, nonFinite, tris }
```

`field`/`shape` recebem `r` **normalizado 0..1**; `solid` recebe `rmm` **em milímetros**.
Confundir os dois é o erro mais fácil de cometer aqui.

### Invariantes que valem para os dois geradores

1. **`MD.audit(mesh).openEdges === 0` em qualquer configuração.** É o critério de aceitação de
   toda mudança em geometria. Rode `node teste.js` depois de mexer em `shape`, `field`, `solid`,
   `buildMesh` ou `resolution`.
2. **Centro colapsado** (`hole === 0`): as alturas de `i=0` são mediadas entre si e cada célula
   dessa linha emite **um** triângulo, não dois; não há parede interna ali.
3. **Paredes usam as alturas dos nós compartilhados** — é o que faz cada aresta aparecer duas
   vezes com orientações opostas.
4. **Otimização do fundo em leque** só vale quando *todas* as células estão presentes. Aplicá-la
   por coluna criaria T-junctions e furaria a malha.
5. **`nt` sempre múltiplo da simetria** (`resolution`), teto 2160. Resolução angular baixa
   fragmenta padrões finos — foi por isso que `teste` subiu de 240 para 480.
6. O corte por `lo`/`hi` em `shape` é o que mantém o preview fluido; ao adicionar um tipo de
   anel novo, calcule a faixa radial afetada em `prepare` com folga suficiente.

### `mandala-cloisonne.html` — relevo por região

Aqui a altura não vem de um campo somado, e sim de **regiões com distância assinada**:

```
cfg → prepare()  → camadas ativas
    → dist()     → distância assinada de UM motivo (positiva dentro)
    → filete()   → esse ponto é filete (linha alta) ou poça (rebaixada)?
    → amostra()  → percorre as camadas; a ÚLTIMA que reivindica vence (pintura, não soma)
    → altura()   → mm: base + nivel*degrau + (filete ? fioH : 0), com cone/furo/aro por cima
    → buildMesh/toSTL/audit — mesmo mesher do irmão
```

Consequências práticas ao mexer:

- A **ordem do array `camadas` é a ordem de pintura** — a última cobre as anteriores. O
  painel tem ▲▼ por isso.
- `dist`/`amostra` usam raio normalizado; `altura`/`solid` usam **milímetros**.
- No motivo `arco`, `prepare` desconta a calota (`spanA`) para que `larg = 1` signifique
  "encosta no vizinho". Mexer nisso funde os arcos num anel contínuo.
- Uma banda mais fina que `2 × fio` some — vira só filete, sem cor.
- A vista 3D rasteriza a **grade polar** com z-buffer justamente porque grade cartesiana
  com painter's algorithm não resolve um filete de menos de 1 mm. Não "simplifique" de volta.

### Adicionar um tipo de anel (`mandala-stl.html`)

Toca em quatro pontos: `MD.TYPES`, o `switch` de `shape` (devolver `s` com sinal, positivo
dentro da forma), a faixa `lo`/`hi` em `prepare`, e — se usar campos novos — `RING_FIELDS` na
UI, que declara por tipo quais controles aparecem (`for: [...]`, `onlyOutline: true`).

### Adicionar um motivo (`mandala-cloisonne.html`)

Toca em: `MC.MOTIVOS`, o `switch` de `dist` (devolver distância assinada, positiva dentro),
`perfil` se a forma tiver eixo, qualquer pré-cálculo em `prepare`, e `CAM_FIELDS` na UI, que
declara por motivo quais controles aparecem (`para`, `nao`, `se`).

### UI (`mandala-stl.html`)

Painel gerado por dados a partir de `RING_FIELDS`/`ringHTML()`; eventos por delegação em
`#scroll` lendo `data-g` (global), `data-r` + `data-i` (anel). Vista de topo sombreada por pixel
em `ImageData`; vista 3D em painter's algorithm sobre grade 200×200. `schedule()` renderiza a
42% durante o arraste e a 100% após 180 ms de ociosidade. Presets: `roseta`, `sol`, `vitral`,
`flor`, `labirinto`, `random`. Config inteira salva/abre como `.json`.
