# Mandala Cloisonné — gerador de mandala em filete e esmalte

Arquivo do app: **`mandala-cloisonne.html`** (autocontido, zero dependências).
Suíte: **`teste-cloisonne.js`**. Irmão de `mandala-stl.html`, que **não** foi alterado.

---

## 1. O que é e por que existe separado

`mandala-stl.html` gera relevo a partir de um **campo escalar suave** — bom para
medalhões e vazados, ruim para o desenho de cerâmica pintada, onde o que define a peça
é o **filete**: uma linha estreita em alto-relevo que cerca cada forma e represa a tinta.
O miolo fica rebaixado; a tinta se acumula ali. É a técnica *cloisonné* (champlevé), a
mesma do incensário de referência (`exemplo_mandala.jpg`).

A diferença estrutural: aqui a geometria é **por região com distância assinada**, não por
campo somado. Cada motivo sabe onde está sua borda, e é isso que permite ter contorno
elevado, contornos aninhados e nervuras internas.

---

## 2. Estrutura do arquivo

Mesma separação em três blocos do gerador irmão — **os testes dependem dela**.

```
mandala-cloisonne.html
├── <style>                    tema escuro, layout flex
├── <body>                     painel + canvas + rodapé
├── <script id="mandala-core"> ★ matemática, malha, STL — SEM DOM
└── <script id="mandala-ui">   presets, painel, preview, download
```

O núcleo é extraído por regex no teste:

```js
html.match(/<script id="mandala-core">([\s\S]*?)<\/script>/)[1]
```

---

## 3. API do núcleo (`MC`)

```js
MC.MOTIVOS                     // [['folha','Folha'], ...] contorno externo da peça
MC.PREENCH                     // [['contornos','Contornos'], ...] o que há dentro dela
MC.camada(over)                // camada com defaults + sobrescritas
MC.defaults()                  // config completa
MC.prepare(cfg)                // → { cam: [...], fioN } (fio normalizado)
MC.perfil(motivo, t, base, ponta)   // meia-largura 0..1 ao longo do eixo
MC.dist(g, r, th, o)           // distância assinada ao motivo (fração do raio)
MC.amostra(P, r, th, out)      // quem reivindica o ponto → { id, nivel, fio, banda, cor }
MC.altura(cfg, P, rmm, th, out)     // altura em MILÍMETROS (rmm em mm)
MC.alturaMax(cfg)              // teto da peça, em mm
MC.solid(cfg, P, rmm, th, out) // há material aqui?
MC.resolution(cfg, q)          // { nr, nt } para 'teste'|'bom'|'alta'|'max'
MC.buildIndexed(cfg, res, cor) // geometria INDEXADA: { vx, nv, idx, tris, mat, paleta, ... }
MC.buildMesh(cfg, res)         // sopa de triângulos: { pos, n, tris, height, diam, parts }
MC.toSTL(mesh, nome)           // ArrayBuffer (STL binário, sem cor)
MC.to3MF(g, nome)              // Promise<ArrayBuffer> (3MF com cor) — recebe o INDEXADO
MC.audit(mesh)                 // { openEdges, degenerate, nonFinite, tris }
```

`MC.audit(mesh).openEdges` **tem que ser 0** em qualquer configuração.

`amostra`/`dist` recebem `r` **normalizado 0..1**; `altura`/`solid` recebem `rmm` **em
milímetros**. Confundir os dois é o erro mais fácil de cometer aqui.

---

## 4. Modelo de dados

### Config global

```js
{
  diam: 120, base: 3,     // mm — Ø e espessura da chapa
  sym: 10, rot: 0,        // simetria e rotação global (graus)

  aro: 4, aroH: 1.2,      // mm — borda externa lisa e o quanto ela sobe

  fio: 0.9,               // mm — LARGURA do filete
  fioH: 1.0,              // mm — o quanto o filete sobe acima da poça
  degrau: 0.7,            // mm — altura de UM nível de camada

  cone: 22, coneH: 6, coneC: 0.75,   // cone central: Ø, altura, curvatura
  furo: 3, furoP: 9,                 // furo CEGO (vareta de incenso), Ø e profundidade

  modo: 'placa',          // 'placa' | 'vazado'
  conn: 0, connW: 1.6,    // vazado: barras radiais de ligação

  corBase, corFio, luz, verniz,      // só preview
  camadas: [ ... ]
}
```

### Camada

```js
{
  on: true,
  motivo: 'folha',    // folha | gota | arco | ponto | cunha | losango | anel
  mult: 1,            // n = round(sym * mult)
  r0: 0.35, r1: 0.85, // faixa radial, fração do raio
  larg: 0.9,          // largura relativa ao setor (1 = encosta no vizinho)
  base: 0.8,          // expoente da extremidade interna
  ponta: 1.0,         // expoente da extremidade externa
  fase: 0,            // graus
  nivel: 1,           // patamar: altura = nivel * degrau
  borda: true,        // desenha o filete de contorno externo?
  preench: 'nenhum',  // nenhum | contornos | nervuras | gotaint | pontoint
  passo: 2.2,         // mm — espaçamento dos contornos aninhados
  linhas: 5,          // nº de nervuras
  incl: 0.7,          // inclinação das nervuras (0 = galões retos)
  espinha: true,      // nervura central
  cor, cor2           // preview; cor2 alterna nas faixas de `contornos`
}
```

---

## 5. A matemática

### 5.1 Distância assinada — `dist(g, r, th, o)`

Trabalha no referencial local de **uma** repetição: `a = angOff(θ+fase, n)` é o desvio
angular até o eixo mais próximo, e `lat = a·r` é o afastamento lateral (em fração de raio,
não em radianos — é o que mantém a espessura do filete constante em milímetros).

| motivo | como |
|---|---|
| `anel` | `min(r−r0, r1−r)` — coroa inteira, ignora `n` |
| `arco` | cápsula ao longo de um arco: `half − hypot(r−mid, transbordo)` |
| `ponto` | `rad − dist_polar((r,a), (mid,0))` |
| `folha` `gota` `cunha` `losango` | `min(hw·w(t) − \|lat\|, r−r0, r1−r)` |

`w(t)` é o perfil de meia-largura, com um expoente por extremidade:

```
w(t) = t^base · (1−t)^ponta / max        (barriga em t = base/(base+ponta))
```

- expoente **< 0,6** → extremidade arredondada · **≈ 1** → bico de ~60° · **> 1,5** → bem afilada
- gota = `base 0,45 / ponta 1,2` · folha ogival = `0,8 / 0,9` · lente = `1 / 1`

`cunha` e `losango` usam lados retos em vez dessa fórmula.

⚠️ **Armadilha do arco**: a calota arredondada soma a espessura à extensão angular. Por isso
`prepare` desconta: `spanA = larg·π/n − half/mid`. Sem esse desconto, `larg = 1` faria os
arcos invadirem o vizinho e se fundirem num anel contínuo.

### 5.2 Filete — `filete(g, d, o, fioN)`

Devolve 1 (filete) ou 0 (poça), e `o.banda` para alternar cor:

```
borda externa : d < fio                        (se camada.borda)
contornos     : k = floor(d/passo); (d − k·passo) < fio     → banda = k
nervuras      : f = (t − incl·|lat|/len)·linhas; distância à linha inteira < fio
                + espinha em |lat| < fio
gotaint       : gota maciça acompanhando o eixo (tudo vira filete)
pontoint      : bolinha maciça no meio
```

### 5.3 Composição e altura

`amostra` percorre as camadas **em ordem do array e a última que reivindica vence** — é
pintura por cima, não soma. Por isso a ordem na pilha importa, e o painel tem ▲▼.

```
z = base
    + aro?            base + aroH
    + cone?           base + coneH·(1 − r/rcone)^coneC     (furo: base + coneH − furoP, mín. 0,8)
    + camada          base + nivel·degrau + (filete ? fioH : 0)
    + nada            base
```

O furo é **cego** — um cilindro raso no campo de alturas, não um vazio. Some com a
regra "sempre pelo menos 0,8 mm de fundo".

### 5.4 Presença — `solid`

```
r > R                    → não
modo === 'placa'         → sim
dentro do cone (+0,6 mm) → sim
r ≥ R − aro              → sim
barra de conector        → sim
alguma camada reivindica → sim
```

No vazado o fundo da placa some e sobra só o desenho: vira renda/suncatcher.

---

## 6. Exportação

| | STL | 3MF |
|---|---|---|
| cor | não | uma `base` por cor, apontada por triângulo |
| tamanho | 100% | ~17% (XML deflatado) |
| API | `toSTL(mesh)`, síncrona | `to3MF(g)`, **Promise** |

O 3MF é ZIP + XML escrito à mão (`zipar`, `crc32`, `deflateRaw` via `CompressionStream`) —
nenhuma dependência. Três entradas: `[Content_Types].xml`, `_rels/.rels`,
`3D/3dmodel.model`.

⚠️ **Duas armadilhas do 3MF, ambas descobertas com o `lib3mf` (implementação de
referência do consórcio) e nenhuma delas gera erro de leitura:**

1. **`pid` tem que ir em cada `<triangle>`.** Sem ele, o leitor descarta o `p1` e aplica a
   propriedade do objeto — a peça inteira sai numa cor só, silenciosamente.
2. **`p1` é índice 0-based dentro do grupo**, não o id do material. O `lib3mf` renumera para
   1-based na leitura; escrever 1-based no XML desloca todas as cores em uma e joga a
   última para fora do intervalo.

Verificar cor com `trimesh` **não funciona**: o leitor de 3MF dele ignora materiais por
completo e devolve tudo cinza. Use `lib3mf`:

```bash
pip install lib3mf --break-system-packages
```

```python
import lib3mf, collections
w = lib3mf.Wrapper(); m = w.CreateModel()
m.QueryReader("3mf").ReadFromFile('mandala.3mf')
it = m.GetBaseMaterialGroups(); it.MoveNext(); g = it.GetCurrent()
cores = {p: g.GetDisplayColor(p) for p in g.GetAllPropertyIDs()}
mi = m.GetMeshObjects(); mi.MoveNext(); o = mi.GetCurrentMeshObject()
print(collections.Counter(t.PropertyIDs[0] for t in o.GetAllTriangleProperties()))
```

Espera-se **nenhum triângulo com `ResourceID == 0`** (sem propriedade) e a contagem
distribuída entre todas as cores da paleta.

### De onde vem a cor de cada triângulo

`buildIndexed(cfg, res, true)` amostra o **centro de cada célula** e converte em índice de
paleta pela mesma regra do preview (filete → `corFio`, poça → cor da camada, faixa ímpar →
`cor2`, sem camada → `corBase`). Topo e paredes da célula herdam essa cor; o **fundo sai
todo em `corBase`** — é o verso da peça.

---

## 7. Malha — as invariantes são as mesmas do gerador irmão

Grade polar `NR × NT`; alturas nos **nós**, presença no **centro da célula**.

`buildIndexed` é a **única** implementação da geometria; `buildMesh` só expande os índices
em sopa de triângulos para o STL. Os vértices são numerados pela grade (o centro é um
vértice só, compartilhado), então não há dedupe por hash em lugar nenhum.

1. Os nós de `i=0` colapsam num ponto: altura mediada, **um** triângulo por célula, sem
   parede interna. (Não há furo passante neste gerador, então `rIn` é sempre 0.)
2. As paredes usam as alturas dos **nós compartilhados** — cada aresta aparece exatamente
   duas vezes, com sentidos opostos.
3. O fundo só vira **leque único** quando *todas* as células existem. Por coluna criaria
   T-junctions e furaria a malha.
4. `components()` conta peças soltas por flood-fill 4-vizinhos (o centro une tudo).

Os degraus de altura (patamar → filete) viram rampas de uma célula. Não quebram a
estanqueidade, mas **é a resolução angular que decide se o filete sobrevive**.

```js
QUAL = { teste: [140,720], bom: [240,1080], alta: [340,1440], max: [440,1800] }
nt = múltiplo de 4·sym, teto 2400
```

Custo (Ø120, placa cheia): `bom` ≈ 0,9 M tri / 43 MB · `max` ≈ 1,59 M tri / 76 MB / 0,75 s.

---

## 8. Verificação

```bash
node teste-cloisonne.js
```

8 casos (padrão, incensário com cone e furo cego, vazado com e sem conectores, todos os
motivos, todos os preenchimentos, extremos, anel único), **fuzz de 40 configurações
aleatórias** e uma passada de **3MF** sobre os mesmos 8 casos — inclusive com `r0 > r1` de propósito, `larg` extremo e furo mais fundo que a
peça. Cada caso confere:

```
openEdges === 0 · degenerate === 0 · nonFinite === 0
tris do cabeçalho STL === mesh.tris · byteLength === 84 + 50·tris
raio máximo ≤ diam/2 · z mínimo ≥ 0 · z máximo ≤ MC.alturaMax(cfg)
```

A passada de 3MF confere: mesmo número de triângulos do STL, todo índice dentro do
intervalo, toda cor dentro da paleta, os vértices indexados reproduzindo a sopa
exatamente, assinatura de ZIP e 3 entradas no diretório central.

Estado atual: **8/8 + 40/40 fuzz + 8/8 no 3MF**.

Validação externa, igual à do irmão:

```python
import trimesh
m = trimesh.load('mandala.stl'); m.merge_vertices()
print(m.is_watertight, m.is_winding_consistent, m.volume, m.euler_number)
```

---

## 9. UI

- **Painel por dados**: `CAM_FIELDS` declara os controles e quais aparecem por motivo
  (`para`/`nao`) e por preenchimento (`se`). Eventos por delegação lendo `data-g` (global)
  e `data-c` + `data-i` (camada). Cada card tem ▲▼ (ordem na pilha), duplicar e remover.
- **Topo**: cor plana por poça + sombreamento pela derivada da altura. Exato.
- **Relevo**: mesmo caminho, em tons de cinza por altura. Exato.
- **3D**: rasteriza a **mesma grade polar do STL** com z-buffer, sem ordenar polígonos.
  A primeira versão usava grade cartesiana com painter's algorithm e embolava — um filete
  de 0,8 mm não cabe numa célula de 0,5 mm. Vale lembrar disso antes de "simplificar" de
  volta.
- **Presets**: `incensário` (reprodução da foto de referência), `lótus`, `talavera`,
  `renda` (vazado), `sol`, `aleatório`.
- Persistência em `.json`. Textos em pt-BR, sem CDN, sem build, sem `localStorage`.

---

## 10. Ajustar um desenho sem se frustrar

Três regras que economizam tempo:

1. **Banda mais fina que `2 × fio` some**: só sobra filete. Um arco de 2,7 mm com filete de
   0,8 mm dos dois lados deixa 1,1 mm de cor. Para a cor aparecer, engrosse a banda ou
   afine o filete.
2. **`larg = 1` significa "encosta no vizinho"**. Acima disso as repetições se fundem — às
   vezes é o que se quer (uma coroa contínua), quase sempre não.
3. **Forma achatada vira bolha**: se `r1−r0` for parecido com a largura, `min(…, r−r0, r1−r)`
   trunca as pontas e o motivo perde o perfil. Gota quer comprimento ≥ 2× a largura.

---

## 11. Limitações conhecidas / próximos passos

1. **Sem chanfro nos filetes** — as laterais são verticais. Um bisel de 0,3 mm no topo
   imprimiria e pintaria melhor.
2. **O 3MF é um objeto só com cor por triângulo** — é o que os fatiadores leem para
   atribuir filamento por região. Exportar um objeto separado por cor (para quem prefere
   montar as peças no fatiador) ainda não existe.
3. **Sem SVG** — as curvas de nível existem; um SVG por poça serviria de máscara de pintura
   e para corte a laser.
4. **`gotaint`/`pontoint` não têm cor própria** — saem na cor do filete, no preview e no 3MF. Um preenchimento
   com cor independente exigiria um terceiro canal em `amostra`.
5. **O 3D não tem sombra projetada nem oclusão** — a leitura do relevo depende só do Lambert.
6. **Sem OBJ/MTL** — o 3MF cobre fatiadores e a maioria dos visualizadores; um OBJ+MTL
   seria útil para quem edita em ferramentas que não leem 3MF.
7. Motivos que faltam: entrelaçado, espiral, escama (telha), e um motivo "texto radial".
