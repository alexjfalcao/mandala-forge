# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Textos de interface, comentários e documentação deste projeto são em **pt-BR** — mantenha esse padrão.

## Projeto

`mandala-stl.html` — app de página única (1108 linhas, zero dependências, sem build, sem CDN,
sem `localStorage`) que gera mandalas paramétricas em coordenadas polares e exporta **STL
binário estanque** para impressão 3D. Dois modos: `relevo` (disco cheio com padrão em relevo)
e `vazado` (material só onde o campo passa do limiar).

`MANDALA-STL.md` é o documento de referência completo: fórmulas de cada tipo de anel, modelo
de dados de config/anel, detalhes da triangulação e lista de limitações conhecidas. **Leia-o
antes de mexer na geometria.**

## Comandos

```bash
node teste.js                 # suíte de malha (8 casos + qualidade máxima); sai com 1 se falhar
open mandala-stl.html         # abrir o app no navegador (é só o arquivo, não há servidor)
```

`teste.js` resolve o HTML por `path.join(__dirname, …)` e o `package.json` local existe só para
marcar `"type": "commonjs"` — sem ele o Node herda o `"type": "module"` de um `package.json` que
está na home do usuário e `require` deixa de funcionar. O projeto continua sem dependências.
O `MANDALA-STL.md` chama o teste de `test-mandala.js`; o nome real é `teste.js`.

Não há test runner: cada caso é uma entrada no array `cases`. Para rodar só um caso, comente
os demais `cases.push(...)` ou filtre o laço final.

Validação externa opcional (`pip install trimesh`): `m.is_watertight` e `m.is_winding_consistent`
devem ser `True`.

## Arquitetura

O HTML tem três blocos e **essa separação é contratual**:

| Bloco | Linhas | Papel |
|---|---|---|
| `<style>` | 7–110 | tema escuro, layout flex |
| `<body>` | 112–192 | painel de controles + canvas + rodapé |
| `<script id="mandala-core">` | 194–561 | matemática, malha, STL — **sem nenhum DOM** |
| `<script id="mandala-ui">` | 563–1106 | presets, painel, preview 2D/3D, download |

`teste.js` extrai o núcleo por regex (`/<script id="mandala-core">([\s\S]*?)<\/script>/`) e o
roda em `vm`. Consequências: **não renomeie o `id` do bloco**, não use `document`/`window`
dentro do núcleo, e mantenha `MD` como `var` no topo do bloco (o harness faz `this.MD = MD`).

### Pipeline

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

### Invariantes que não podem quebrar

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

### Adicionar um tipo de anel

Toca em quatro pontos: `MD.TYPES`, o `switch` de `shape` (devolver `s` com sinal, positivo
dentro da forma), a faixa `lo`/`hi` em `prepare`, e — se usar campos novos — `RING_FIELDS` na
UI, que declara por tipo quais controles aparecem (`for: [...]`, `onlyOutline: true`).

### UI

Painel gerado por dados a partir de `RING_FIELDS`/`ringHTML()`; eventos por delegação em
`#scroll` lendo `data-g` (global), `data-r` + `data-i` (anel). Vista de topo sombreada por pixel
em `ImageData`; vista 3D em painter's algorithm sobre grade 200×200. `schedule()` renderiza a
42% durante o arraste e a 100% após 180 ms de ociosidade. Presets: `roseta`, `sol`, `vitral`,
`flor`, `labirinto`, `random`. Config inteira salva/abre como `.json`.
