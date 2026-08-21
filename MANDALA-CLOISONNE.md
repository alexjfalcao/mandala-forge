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
MC.buildIndexed(cfg, res, cor) // um sólido só: { vx, nv, idx, tris, mat, paleta, ... }
MC.buildPartes(cfg, res)       // um sólido FECHADO por cor: { vx, nv, pecas: [...], ... }
MC.buildMesh(cfg, res)         // sopa de triângulos: { pos, n, tris, height, diam, parts }
MC.toSTL(mesh, nome)           // ArrayBuffer (STL binário, sem cor)
MC.to3MF(g, nome)              // Promise<ArrayBuffer> (3MF com cor)
MC.toOBJ(g, nome)              // { nome, obj, mtl } — DOIS arquivos, com cor
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

| | OBJ + MTL | 3MF peça única | 3MF peças por cor | STL |
|---|---|---|---|---|
| cor | por face, via `usemtl` | por triângulo | um sólido por cor | não |
| arquivos | **dois** (lado a lado) | um | um | um |
| Bambu Studio | importa e oferece mapear cor → filamento | ignora a cor | lê as peças e os extrusores | sem cor |
| aviso de config | **nunca** | sim | sim | não |
| triângulos | 1× | 1× | ~2,4× | 1× |
| tamanho | ~35% do STL | ~17% | ~40% | 100% |

**O padrão é 3MF · peças por cor** — é o único caminho *determinístico*: uma peça vira um
extrusor, sem intermediários.

⚠️ **O OBJ passa pelo agrupamento automático do Bambu e perde cor.** Ele chama
`cluster_adaptive` (visível no binário, junto de `ColorDecomposeDialog` e
`ColorDecomposeRecipeMode`), que decide **sozinho** quantos grupos criar. Num teste real com
AMS de 4 slots, um desenho de 6 cores entrou com **2**. O diálogo aparece, mas o número de
grupos não é o número de slots. Use OBJ para visualizador e para editar em ferramentas que
não leem 3MF; para imprimir colorido, use o 3MF de peças.

O aviso de config do Bambu **é cosmético**: ele diz "load geometry data only", mas o
`model_settings.config` é lido assim mesmo — a reexportação pelo CLI devolve as peças com
`extruder` de 1 a N. Verificado, não deduzido.

### Quantas cores o desenho pode ter

Cada cor distinta vira uma peça e pede um filamento. O rodapé mostra a contagem e fica
amarelo acima de 4 (o tamanho de um AMS). Acima do número de slots, alguém vai ter que
juntar cores — melhor você, editando as cores das camadas, do que o fatiador escolhendo
sozinho quais fundir.

### O aviso do Bambu Studio, em detalhe

A string está no binário: `The 3mf file has invalid config, load geometry data only`. Ela
dispara ao abrir **qualquer** 3MF que não tenha `Metadata/project_settings.config` — o que
inclui os 3MF de Fusion, Blender e qualquer outro gerador que não seja o próprio Bambu.

`project_settings.config` são ~74 kB de presets de impressora e filamento. **Não gere esse
arquivo**: ele forçaria um perfil de máquina no usuário, o que é pior que o aviso.

Com 3MF, o caminho é **File → Import → Import 3MF** (não Open Project). Com OBJ o problema
não existe.

### Por que existe o modo "peças por cor"

O Bambu Studio (e o PrusaSlicer) **ignoram `basematerials`**. Um 3MF de peça única com cor
por triângulo abre colorido num visualizador, mas entra cinza no fatiador. O que o fatiador
entende é **peça**: um objeto com vários `<component>`, cada um com seu extrusor declarado
em `Metadata/model_settings.config`.

`buildPartes` gera um sólido fechado por cor. Juntos eles ladrilham o disco sem sobrepor —
o volume da união bate com o da peça única. O custo é que as paredes internas aparecem duas
vezes, uma de cada lado da fronteira, daí os ~2,4× triângulos.

⚠️ **A cor atravessa toda a espessura.** Numa impressora com AMS isso significa troca de
filamento em todas as camadas da chapa, não só nas do relevo. Chapa fina (`base`) reduz o
desperdício de purga.

### Estrutura do pacote

```
[Content_Types].xml
_rels/.rels
3D/3dmodel.model                 basematerials + um <object> por cor + <object> raiz com <components>
Metadata/model_settings.config   de-para peça → extrusor      (só no modo peças)
```

Sem **nenhum** arquivo `Metadata/*.config`, o Bambu Studio mostra
`The 3mf file has invalid config, load geometry data only` (string confirmada no binário) e
descarta a cor, ficando só com a geometria.

⚠️ Esse aviso também aparece ao abrir o arquivo como **projeto** (File → Open Project), que
espera `Metadata/project_settings.config` — 74 kB de presets de impressora e filamento.
**Não gere esse arquivo**: forçaria um perfil de máquina no usuário. O caminho certo é
File → Import → Import 3MF.

### OBJ + MTL

O `.obj` referencia o `.mtl` por nome relativo (`mtllib ./nome.mtl`), então **os dois
precisam cair na mesma pasta**. É o custo do formato; em troca, o Bambu tem um caminho
dedicado para OBJ colorido (`obj_color_deal_algo`, `ColorDecomposeDialog` no binário) que
agrupa as cores e oferece mapear cada uma para um filamento.

⚠️ **Toda face precisa de `usemtl`.** Sem isso o Bambu recusa com
`error:some_face_no_color, please check mtl file and obj file`.

Obs.: o `trimesh` **lê** cor de OBJ (ao contrário do 3MF), mas ao carregar ele duplica os
vértices na fronteira entre materiais e depois se recusa a fundi-los, então reporta
`is_watertight: False` num arquivo que está correto. Confie no Bambu (`--info` →
`manifold = yes`), não nele, para esse ponto.

### Borda macia do filete

`filete()` devolve **0..1**, não 0/1. A faixa de transição acompanha a **célula da grade**
(`P.celR`/`P.celT`, ~0,7 célula no raio local), porque antisserrilhado só funciona se a
transição cobrir pelo menos uma célula. Com resposta binária, a fronteira do filete cai
exatamente numa linha da grade e vira degrau vertical.

`prepare(cfg, res)` recebe a grade para isso. Sem `res` — o preview pixel a pixel, bem mais
fino que a grade — cai num valor pequeno e fixo. Desligável em `cfg.suave`.

Consequências para quem for mexer: `out.fio` é fração, então `altura` faz
`out.fio * cfg.fioH` (não um ternário) e a **cor** decide por `out.fio >= 0.5`.

### Precisão das coordenadas

⚠️ Coordenadas saem com **5 casas decimais**, não 3. No primeiro anel da grade os nós
angulares vizinhos ficam a 0,00048 mm um do outro na qualidade máxima; com 3 casas, 1000
vértices colidiam e viravam triângulo degenerado no arquivo exportado. A suíte checa isso
nas quatro qualidades.

### Armadilhas do XML

Ambas descobertas com o `lib3mf` (implementação de referência do consórcio) e **nenhuma
delas gera erro de leitura**:

1. **`pid` tem que ir em cada `<triangle>`.** Sem ele, o leitor descarta o `p1` e aplica a
   propriedade do objeto — a peça inteira sai numa cor só, silenciosamente.
2. **`p1` é índice 0-based dentro do grupo**, não o id do material. O `lib3mf` renumera para
   1-based na leitura; escrever 1-based desloca todas as cores em uma e joga a última para
   fora do intervalo.

### Como verificar

Verificar cor com `trimesh` **não funciona**: o leitor de 3MF dele ignora materiais por
completo e devolve tudo cinza.

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

Espera-se **nenhum triângulo com `ResourceID == 0`** e a contagem distribuída entre as cores.

**O melhor validador é o próprio Bambu Studio**, que tem CLI:

```bash
B="/Applications/3D Software/BambuStudio.app/Contents/MacOS/BambuStudio"
"$B" mandala.3mf --info                                   # geometria
"$B" /caminho/abs/mandala.3mf --export-3mf volta.3mf --outputdir /caminho/abs/saida
```

Reexportar é o teste definitivo: o `Metadata/model_settings.config` do arquivo de volta
mostra o que o Bambu **entendeu**. Esperado — uma `<part>` por cor, `extruder` de 1 a N, e
`mesh_stat` com `edges_fixed="0" degenerate_facets="0" facets_reversed="0"` em todas.

Obs.: no modo peças, `--info` reporta `manifold = no` e centenas de `number_of_parts`. Isso
é esperado e não é defeito: ele funde tudo antes de medir, então vê as faces coincidentes
entre peças vizinhas e conta cada ilha (os 10 pontos, as 10 pétalas…) como uma peça.

### De onde vem a cor de cada triângulo

`buildIndexed(cfg, res, true)` e `buildPartes` amostram o **centro de cada célula** e converte em índice de
paleta pela mesma regra do preview (filete → `corFio`, poça → cor da camada, faixa ímpar →
`cor2`, sem camada → `corBase`). Topo e paredes da célula herdam essa cor; o **fundo sai
todo em `corBase`** — é o verso da peça.

---

## 7. Malha — as invariantes são as mesmas do gerador irmão

Grade polar `NR × NT`; alturas nos **nós**, presença no **centro da célula**.

`emitir(G, pertence, …)` é a **única** implementação da emissão de triângulos: recebe quais
células entram e fecha o sólido com paredes em toda fronteira com quem ficou de fora. A peça
inteira passa `presença`; cada peça de cor passa `presença && cor == k`. `buildMesh` só
expande os índices em sopa para o STL. Os vértices são numerados pela grade (o centro é um
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
QUAL = { teste: [140,720], bom: [240,1080], alta: [340,1440], max: [440,1800], fino: [220,2880] }
nt = múltiplo de 4·sym, teto 3600
```

**`nt` é o que decide se o filete sobrevive.** A célula no aro mede `pi·D/nt`; abaixo de umas
3 células por filete a borda sai em escada — o efeito de pente que aparece no fatiador.

| qualidade | grade | célula no aro (Ø120) | células por filete de 0,8 mm | triângulos |
|---|---|---|---|---|
| teste | 140 × 720 | 0,52 mm | 1,7 | 203 k |
| bom | 240 × 1080 | 0,35 mm | 2,6 | 521 k |
| alta | 340 × 1440 | 0,26 mm | 3,4 | 982 k |
| max | 440 × 1800 | 0,21 mm | 4,3 | 1,59 M |
| **fino** | **220 × 2880** | **0,13 mm** | **6,9** | **1,27 M** |

`fino` troca resolução radial (barata de sobra num campo de alturas) por angular: **menos**
triângulos que `max` e menos da metade da célula no aro. É a qualidade certa para este
desenho.

⚠️ **O serrilhado é intrínseco a amostrar um campo de alturas numa grade.** Aumentar `nt`
alivia, `filete()` com borda macia alivia, mas só some de vez com uma malha que siga as
curvas de nível em vez de amostrar a grade (marching squares / dual contouring). Alargar o
filete **não** resolve: acima de ~1,2 mm ele engole as poças e o desenho se perde.

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

A passada de exportação confere: mesmo número de triângulos do STL, todo índice dentro do
intervalo, toda cor dentro da paleta, os vértices indexados reproduzindo a sopa exatamente,
assinatura de ZIP e 3 entradas no diretório central. E, para o modo peças, **audita cada
sólido de cor isoladamente** (`openEdges === 0`) e confere que o `model_settings.config` foi
para dentro do pacote.

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
- **3D**: rasteriza a **mesma grade da exportação** com z-buffer, sem ordenar polígonos —
  é o único jeito de o preview mostrar o serrilhado que vai sair no arquivo. Tem teto de
  ~300 mil células (acima disso o rasterizador em JS trava a aba); quando o teto morde, o
  HUD mostra a grade do preview e a da exportação lado a lado.
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
2. **A cor atravessa toda a espessura no modo peças.** Cortar as peças no topo da chapa
   (chapa inteira numa cor, relevo colorido por cima) economizaria muita purga, mas exige
   tratar as células onde o relevo tem altura zero, que gerariam triângulos degenerados.
3. **Sem SVG** — as curvas de nível existem; um SVG por poça serviria de máscara de pintura
   e para corte a laser.
4. **`gotaint`/`pontoint` não têm cor própria** — saem na cor do filete, no preview e no 3MF. Um preenchimento
   com cor independente exigiria um terceiro canal em `amostra`.
5. **O 3D não tem sombra projetada nem oclusão** — a leitura do relevo depende só do Lambert.
6. **O OBJ sai em dois arquivos** — o navegador dispara dois downloads. Um .zip resolveria,
   mas obrigaria a descompactar antes de importar.
7. Motivos que faltam: entrelaçado, espiral, escama (telha), e um motivo "texto radial".
