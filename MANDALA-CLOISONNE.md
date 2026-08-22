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
├── <script id="mandala-core"> ★ matemática, malha, 3MF/OBJ — SEM DOM
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
MC.buildContorno(cfg, N, SUB)  // um sólido FECHADO por cor, por curva de nível: { pecas, ... }
MC.buildMesh(cfg, res)         // sopa de triângulos: { pos, n, tris, height, diam, parts }
MC.to3MF(g, nome)              // Promise<ArrayBuffer> — SÓ a forma de buildContorno
MC.toOBJ(g, nome)              // { nome, obj, mtl } — idem; DOIS arquivos, com cor
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
  nivelUnico: true,       // todas as camadas no mesmo patamar
  suave: true,            // borda macia do filete (antisserrilhado)

  corBase, corFio, luz, verniz,      // só preview
  camadas: [ ... ]
}
```

### Fase: passo, não grau

`fasePasso` é a posição do elemento **dentro do seu passo**, com 1 passo = `360/n`. Meio
passo continua meio passo quando a simetria muda: trocar `sym` de 10 para 12 leva a fase de
18° para 15° sozinha, e as camadas não se desalinham entre si. Fase em graus absolutos era
o oposto — cada troca de simetria exigia retocar camada por camada, e camadas com `mult`
diferente nunca casavam com o mesmo valor.

`prepare` usa `fasePasso` quando ele é um número finito e cai em `fase` (graus) quando não
é, então `.json` antigo continua abrindo igual. A UI converte na carga (`migraFase`) e
mantém `fase` como espelho em graus, para quem abrir o arquivo numa versão anterior do app.

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
  fase: 0,            // graus — LEGADO, só vale se fasePasso for nulo
  fasePasso: 0,       // fração do passo da simetria (1 passo = 360/n)
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

Com **`nivelUnico`** (o padrão), `prepare` ignora o `nivel` de cada camada e usa 1 para
todas: a mandala fica plana, com **um** patamar para as poças e **um** para o filete. Só o
cone e o aro mantêm altura própria. É o desenho de esmalte clássico, e de quebra junta
regiões na exportação por contorno — o incensário cai de 12 para 8 regiões e de 202 mil
para 105 mil triângulos. Desligue para escalonar as camadas pelo campo `nivel`.

Para deixar as poças rentes à chapa em vez de 0,5 mm acima dela, zere o `degrau`.


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

## 6. Duas vias de exportação

O desenho é montado **amostrando um campo de alturas**. Para o preview isso basta, mas para
imprimir traz um problema: cada célula da grade tem uma altura só, então toda fronteira sai
em escada de uma célula.

A via por **contorno** inverte: a fronteira é a curva de nível, e a grade só decide de
quantos segmentos ela é feita. Existe em duas implementações, com a mesma ideia:

| | grade polar | contorno no navegador | contorno em Python |
|---|---|---|---|
| onde | `mandala-core` | `mandala-core` | `exportar.py` |
| bordas | escada de ~1 célula | **lisas** | **lisas** |
| triângulos (incensário) | 520 k | ~400 k | **~105 k** |
| dependências | nenhuma | nenhuma | numpy, shapely, contourpy, trimesh |
| tempo | ~1 s | ~1 s | ~12 s |

**O padrão do app é o contorno no navegador.** A versão em Python rende bem menos
triângulos porque extrai polígonos globais e os simplifica — uma reta vira um segmento só.
A do navegador recorta célula a célula, então gasta um punhado de triângulos por célula de
fronteira. Em compensação não precisa de triangulação genérica com furos, que é a parte
difícil de portar.

### Contorno no navegador — `buildContorno`

Cada célula emite o **seu pedaço recortado** pela curva de nível (marching squares com
recorte). Células inteiramente dentro são fundidas em retângulos, senão áreas lisas
explodiriam a contagem.

⚠️ **Três armadilhas, todas com teste na suíte:**

1. **Cruzamento em cima do nó.** Quando a cobertura vale exatamente o limiar, `t` dá 0 ou 1
   e o cruzamento coincide com um nó. Sem grudar nele, saem dois vértices distintos no mesmo
   ponto: degenerados e malha aberta. Por isso `SUB` é forçado a **ímpar** (com SUB par a
   cobertura pode dar exatamente 0,5) **e** `cruz()` gruda no nó quando `t` chega perto de 0
   ou 1. Os dois quadrados que compartilham a aresta calculam o mesmo `t`, então grudam
   juntos.
2. **Sela desconectada.** Dois cantos opostos dentro: o centro decide se estão ligados. O
   caso desconectado é montado **a partir dos cantos**, não por índices fixos no polígono —
   o layout do polígono muda conforme *quais* cantos estão dentro.
3. **T-junction contra retângulo fundido.** A borda do retângulo mantém **todos** os nós da
   grade e é triangulada em leque a partir do **centro**, não de um canto (um canto geraria
   triângulos colineares). Sem isso, a aresta longa do retângulo não casa com as arestas
   curtas dos vizinhos e a malha abre.

E uma quarta, fora do meshing: a **moldura de amostragem precisa sobrar duas células além
do disco** (`quadro = R·(1+4/N)`). Se o centro da célula mais externa cair dentro da peça, o
contorno não tem onde fechar e a malha abre no aro inteiro.

Grade por qualidade (`QUAL_CONT`), independente da polar:

| qualidade | N | célula | triângulos (incensário) |
|---|---|---|---|
| teste | 200 | 0,60 mm | 193 k |
| bom | 320 | 0,375 mm | 403 k |
| alta | 420 | 0,29 mm | 618 k |
| max | 560 | 0,21 mm | 985 k |

### Contorno em Python — `exportar.py`

### Como funciona

1. **`amostrar.js`** varre uma grade cartesiana com sub-amostragem (`--sub` por eixo) e,
   para cada célula, guarda a **cobertura 0..255 de cada região**. Uma região é um par
   (cor, altura). É a cobertura fracionária que permite o contorno sub-pixel depois.
2. A altura, que é contínua por causa da borda macia do filete, volta a ser **discreta**:
   cada região tem uma altura só, porque vira um prisma.
3. **`exportar.py`** passa `contourpy` na cobertura de cada região no nível 0,5, monta
   polígonos com furos no shapely, simplifica (`--tolerancia`, 0,015 mm), recorta no disco
   de Ø exato e extruda com `trimesh.creation.extrude_polygon`.
4. As regiões de mesma cor viram uma peça; cada peça vira um `<object>` e um extrusor no
   `Metadata/model_settings.config`.

### O que fica de fora e por quê

- **O cone central não é região**: é curvo, então sai como sólido de revolução
  (`trimesh.creation.revolve`), com o furo cego no perfil.
- **A cor atravessa toda a espessura**, igual à via por grade: cada região é extrudada de
  z=0 até a sua altura.
- **As peças se tocam face a face** e os contornos de regiões vizinhas são extraídos
  independentemente, então pode haver costura sub-pixel entre elas. Para o fatiador isso é
  irrelevante (peças encostadas são o normal em multimaterial), mas não espere que a união
  das peças seja uma malha 2-manifold perfeita.
- **`node` precisa ser achável**. Com nvm ele é uma função do shell, não um binário no
  PATH; `exportar.py` procura em `~/.nvm/versions/node/*/bin/node` e aceita a variável
  `NODE`.

---

## 7. Exportação a partir do HTML

Sobraram **dois** formatos, e os dois saem da **mesma** geometria — `buildContorno`, uma
peça fechada por cor com as bordas na curva de nível. As vias que não deram certo — 3MF de
peça única (o fatiador ignora `basematerials` e abre tudo cinza), 3MF de peças por cor pela
grade (bordas em escada e ~2,4× triângulos), OBJ pela grade (mesma escada) e STL (sem cor
nenhuma) — foram removidas.

| | 3MF · contorno | OBJ + MTL |
|---|---|---|
| geometria | contorno | contorno (a mesma) |
| cor | um sólido por cor, `pindex` na paleta | um `usemtl` por peça |
| arquivos | um | **dois** (lado a lado) |
| Bambu Studio | lê as peças e os extrusores | importa e oferece mapear cor → filamento |
| aviso de config | sim (cosmético) | **nunca** |
| tamanho | 1× | ~4× (texto, sem compressão) |

**O padrão é 3MF · contorno** — é o único caminho *determinístico*: uma peça vira um
extrusor, sem intermediários.

⚠️ **O OBJ passa pelo agrupamento de cores do Bambu.** Ao importar, ele abre o diálogo
*Import Model* com um campo **Color Count** (atalhos 4 / 8 / 16 e um contador) e um botão
*Apply*. O valor inicial vem do "Auto" (`cluster_adaptive` no binário), que **decide sozinho**
quantos grupos criar — num caso real, com AMS de 4 slots, um desenho de 6 cores veio com
`Color Count = 2`.

O sintoma é característico: as cores que aparecem no *Filament Mapping* **não são as suas**,
são centroides. Seis cores agrupadas em duas viraram `#65377B` e `#F8C370`, que não existem
na paleta — são a média de {roxo, ameixa} e de {creme, laranja, amarelo, violeta}.

Quem for usar OBJ tem que subir o Color Count para o número de cores do desenho e clicar
*Apply*. Para imprimir colorido sem esse passo manual, use o 3MF por contorno.

Com o `project_settings.config` no pacote o aviso `The 3mf file has invalid config` não
aparece mais — e, mesmo antes, ele era cosmético para a geometria: o `model_settings.config`
era lido assim mesmo e a reexportação devolvia as peças com `extruder` de 1 a N. Verificado,
não deduzido.

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

### Por que o 3MF sai em peças

O Bambu Studio (e o PrusaSlicer) **ignoram `basematerials`**. Um 3MF de peça única com cor
por triângulo abre colorido num visualizador, mas entra cinza no fatiador — foi por isso que
essa via saiu. O que o fatiador entende é **peça**: um objeto com vários `<component>`, cada
um com seu extrusor declarado em `Metadata/model_settings.config`.

`buildContorno` gera um sólido fechado por cor. Juntos eles ladrilham o disco sem sobrepor.

⚠️ **A cor atravessa toda a espessura.** Numa impressora com AMS isso significa troca de
filamento em todas as camadas da chapa, não só nas do relevo. Chapa fina (`base`) reduz o
desperdício de purga.

### A cadeia cor → peça → filamento → extrusor

São **dois** arquivos de config, e os dois são necessários:

```
Metadata/model_settings.config    peça i  → extrusor i+1     (XML)
Metadata/project_settings.config  filamento i+1 → cor da peça i   (JSON)
```

Só com o primeiro a peça vai para o extrusor certo, mas a cor exibida é a do **slot** que o
usuário tiver ali. Foi exatamente esse o bug das "cores trocadas": num projeto com 8
filamentos carregados (`#161616`, `#65377B`, …), a peça 1 (`#5b2a7a`) ia para o extrusor 1 e
saía preta. Nada estava adivinhando cor — faltava a tabela.

### O gatilho: `Application`

Medido por reexportação no CLI do Bambu, com o arquivo variando um item de cada vez:

| `<metadata name="Application">` | `project_settings.config` | o que o Bambu faz |
|---|---|---|
| `Mandala Cloisonne` | ausente, parcial ou completo | **ignora** a config; cor = slot do usuário |
| `BambuStudio-<versão>` | só filamentos | lê o JSON e **descarta** na hora de montar os presets |
| `BambuStudio-<versão>` | **completo** | adota: `filament_colour` vira a paleta, peças nos extrusores 1..N |

Ou seja: o arquivo precisa se declarar projeto do BambuStudio **e** levar um
`project_settings.config` completo. Meio termo não existe — e a versão no nome tem que ser
numérica (`BambuStudio-Mandala Cloisonne` faz o Bambu abortar a leitura).

### O molde `PERFIL_BAMBU`

Por isso o núcleo carrega `var PERFIL_BAMBU` (~21 kB): o despejo do próprio Bambu Studio
02.08.02.61 para **Bambu Lab H2C bico 0.4 + 0.20mm Standard + Bambu PLA Basic**. Todo array
"por filamento" tem **uma** entrada; `projetoBambu(pal)` replica cada uma por cor e escreve
`filament_colour` na ordem das peças. Abrindo em outra impressora o Bambu substitui os
presets e mantém as cores.

⚠️ Regerar o molde: rode o CLI com máquina **e** processo **e** filamento carregados —

```bash
BambuStudio --datadir "$HOME/Library/Application Support/BambuStudio" \
  --load-settings ".../machine/Bambu Lab H2C 0.4 nozzle.json;.../process/0.20mm Standard @BBL H2C.json" \
  --load-filaments ".../filament/Bambu PLA Basic @BBL H2C.json" \
  --export-3mf volta.3mf entrada.3mf
```

Sem `--load-filaments` o despejo sai **sem** 21 chaves de filamento (`filament_settings_id`,
`filament_retraction_length`, …) e o Bambu rejeita o projeto — silenciosamente, sem exportar
nada e com `return_code: 0` no `result.json`.

### Posição na mesa

Como projeto, o Bambu **não arranja sozinho**: ele põe a peça exatamente onde o
`<build><item>` mandar. A mandala é modelada em torno de (0,0), então sem translação ela
abre no canto frontal esquerdo, quase toda fora da mesa. Por isso o `<item>` sai com

```xml
<item objectid="8" transform="1 0 0 0 1 0 0 0 1 165 160 0" printable="1"/>
```

— os três últimos números são a translação, e 165/160 é o centro de `printable_area` lido do
próprio `PERFIL_BAMBU` (mesa 330×320 do H2C). Trocando o molde por outra máquina, o centro
acompanha. É o mesmo `transform` que o Bambu escreve nos projetos dele.

### Estrutura do pacote

```
[Content_Types].xml
_rels/.rels
3D/3dmodel.model                 Application=BambuStudio-<versão> + basematerials
                                 + um <object> por cor + <object> raiz com <components>
Metadata/model_settings.config   peça → extrusor
Metadata/project_settings.config filamento → cor  (molde H2C 0.4 + a paleta)
```

`basematerials` continua sendo escrito para visualizadores genéricos, mas **não** é o que o
fatiador lê: 6 objetos independentes com `pid`/`pindex` foram testados e caíram todos no
extrusor 1.

### OBJ + MTL

Consome a **mesma** geometria do 3MF: cada peça de cor entra com os seus vértices, em
sequência, e as faces somam o deslocamento da peça (`g cor<i>` + `usemtl material_<i+1>`).
Pela grade polar o OBJ saía com a mesma escada do 3MF de peças — por isso mudou de via.

O `.obj` referencia o `.mtl` por nome relativo (`mtllib ./nome.mtl`), então **os dois
precisam cair na mesma pasta**. É o custo do formato; em troca, o Bambu tem um caminho
dedicado para OBJ colorido (`obj_color_deal_algo`, `ColorDecomposeDialog` no binário) que
agrupa as cores e oferece mapear cada uma para um filamento.

⚠️ **Toda face precisa de `usemtl`.** Sem isso o Bambu recusa com
`error:some_face_no_color, please check mtl file and obj file`.

Obs.: o `trimesh` **lê** cor de OBJ (ao contrário do 3MF) — `group_material=True` devolve
uma malha por cor com o `diffuse` certo, e é um jeito rápido de conferir a exportação. Mas
`is_watertight` dele diz `False` em duas ou três peças mesmo quando o arquivo está correto:
uma peça é a união das regiões daquela cor, que se tocam face a face, e depois do
`merge_vertices` essas paredes coladas viram arestas com **4** faces. O que importa é não
haver aresta com **1** face (contado à mão: zero), e é isso que `MC.audit` já garante.

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

Obs.: `--info` reporta `manifold = no` e centenas de `number_of_parts`. Isso
é esperado e não é defeito: ele funde tudo antes de medir, então vê as faces coincidentes
entre peças vizinhas e conta cada ilha (os 10 pontos, as 10 pétalas…) como uma peça.

### De onde vem a cor de cada peça

Na via por contorno a cor **é** a região: `cobertura` agrupa os pontos por `cor@z` (filete →
`corFio`, poça → cor da camada, faixa ímpar → `cor2`, sem camada → `corBase`), e cada grupo
vira uma malha extrudada de z=0 até a sua altura. As malhas de mesma cor são unidas numa
peça só — daí uma peça poder ter várias ilhas e paredes internas coladas.

Na grade polar (só a auditoria usa hoje) a cor vem do **centro de cada célula**, pela mesma
regra; topo e paredes herdam essa cor e o **fundo sai todo em `corBase`**.

---

## 8. Malha — as invariantes são as mesmas do gerador irmão

Grade polar `NR × NT`; alturas nos **nós**, presença no **centro da célula**.

`emitir(G, pertence, …)` é a **única** implementação da emissão de triângulos: recebe quais
células entram e fecha o sólido com paredes em toda fronteira com quem ficou de fora. A peça
inteira passa `presença`. `buildMesh` só expande os índices em sopa para a auditoria. Os vértices são numerados pela grade (o centro é um
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

## 9. Verificação

```bash
node teste-cloisonne.js
```

8 casos (padrão, incensário com cone e furo cego, vazado com e sem conectores, todos os
motivos, todos os preenchimentos, extremos, anel único), **fuzz de 40 configurações
aleatórias**, uma passada de **grade indexada** e outra de **contorno + 3MF + OBJ** sobre os
mesmos 8 casos —
inclusive com `r0 > r1` de propósito, `larg` extremo e furo mais fundo que a peça. Cada caso
confere:

```
openEdges === 0 · degenerate === 0 · nonFinite === 0
raio máximo ≤ diam/2 · z mínimo ≥ 0 · z máximo ≤ MC.alturaMax(cfg)
```

A passada da grade indexada confere: todo índice dentro do intervalo, toda cor dentro da
paleta e os vértices indexados reproduzindo a sopa exatamente. A de contorno **audita cada
sólido de cor isoladamente** (`openEdges === 0`) e depois exporta os dois formatos.

`confere3MF` abre o pacote de verdade (`lerZip` infla com o `zlib` do Node, sem dependência)
e confere, para cada caso:

1. zip íntegro, com as 5 entradas esperadas;
2. `Application` no formato `BambuStudio-<versão>` — sem isso o fatiador ignora as cores;
3. um `<object>` de malha por cor, cada um com vértices e triângulos;
4. **contagem de triângulos e de vértices idêntica à da malha** — a exportação não pode
   mexer na geometria;
5. uma `<part>` por peça, com `extruder` explícito e na ordem da paleta;
6. `filament_colour[i]` **exatamente igual** (comparação de hex, sem tolerância) à cor da
   peça i, e `filament_type`/`filament_settings_id`/`filament_ids` com uma entrada por cor.

No OBJ: `usemtl` em toda face, um material por peça, todo índice no intervalo e todo material
usado declarado no `.mtl`.

A precisão das 5 casas decimais é conferida direto nos vértices da grade nas 5 qualidades:
arredondar não pode fundir dois vértices distintos.

Estado atual: **8/8 + 40/40 fuzz + 8/8 na grade indexada + 8/8 no contorno (3MF e OBJ)**.

De ponta a ponta, o teste que fecha a conta é a reexportação pelo CLI do Bambu:

```bash
python3 exportar.py preset:incenso saida.3mf     # ou baixe pelo app
BambuStudio --datadir "$HOME/Library/Application Support/BambuStudio" \
            --export-3mf volta.3mf saida.3mf
```

No `volta.3mf`: `filament_colour` = a paleta na ordem das peças, uma `<part>` por cor com
`extruder` de 1 a N, `face_count` igual ao nosso por peça e `edges_fixed="0"
degenerate_facets="0"`.

Validação externa, igual à do irmão:

```python
import trimesh
m = trimesh.load('mandala.stl'); m.merge_vertices()
print(m.is_watertight, m.is_winding_consistent, m.volume, m.euler_number)
```

---

## 10. UI

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

## 11. Ajustar um desenho sem se frustrar

Três regras que economizam tempo:

1. **Banda mais fina que `2 × fio` some**: só sobra filete. Um arco de 2,7 mm com filete de
   0,8 mm dos dois lados deixa 1,1 mm de cor. Para a cor aparecer, engrosse a banda ou
   afine o filete.
2. **`larg = 1` significa "encosta no vizinho"**. Acima disso as repetições se fundem — às
   vezes é o que se quer (uma coroa contínua), quase sempre não.
3. **Forma achatada vira bolha**: se `r1−r0` for parecido com a largura, `min(…, r−r0, r1−r)`
   trunca as pontas e o motivo perde o perfil. Gota quer comprimento ≥ 2× a largura.

---

## 12. Limitações conhecidas / próximos passos

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
