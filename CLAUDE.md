# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Comentários e documentação deste projeto são em pt-BR** — mantenha esse padrão.

A **interface**, essa, fala duas línguas: pt-BR e inglês, por um dicionário no bloco de UI.
Texto novo na tela entra como chave nos dois idiomas, nunca literal.

## Projeto

Um gerador de mandala para impressão 3D: um HTML de página única, autocontido,
**zero dependências, sem build, sem CDN, sem `localStorage`**, com sua suíte e seu
documento de referência:

| App | O que faz | Doc | Teste |
|---|---|---|---|
| `mandala-cloisonne.html` | **cloisonné**: filete em alto-relevo represando poças rebaixadas de esmalte, motivos por distância assinada. Chama-se **"Mandala Forge"** na interface — o arquivo não muda de nome | `MANDALA-CLOISONNE.md` | `teste-cloisonne.js` |

### A via por contorno

`amostrar.js` + `exportar.py` + `teste-contorno.py` são uma **segunda via de exportação**
para o cloisonné, e a única parte do projeto com dependências (numpy, shapely, contourpy,
trimesh). Existe porque a malha por grade sai com bordas em escada e com a cor assada por
face; a via por contorno extrai curvas de nível sub-pixel e extruda um sólido por cor.

**Ela não reimplementa a matemática**: `amostrar.js` carrega o mesmo bloco `mandala-core`
em `vm` e só despeja o resultado. Se você mudar a geometria no HTML, ela acompanha sozinha.
O que precisa acompanhar à mão é o **formato do `.bin`** (magic `MCR3`), que os dois lados
conhecem.

`exportar.py preset:<nome>` puxa os presets recortando o literal `var PRESETS` do bloco de
UI — se esse bloco for renomeado ou reindentado, o regex quebra.

`exportar.py` no macOS precisa achar o `node`, que com nvm é função de shell e não binário
no PATH: ele procura em `~/.nvm/versions/node/*/bin/node` e aceita a variável `NODE`.

`exemplo_mandala.jpg` é a foto de referência que originou o gerador cloisonné (o preset
`incensário` é a tentativa de reproduzi-la).

### A via OpenSCAD

`openscad/mandala-flat.scad` é uma **terceira implementação**, para o Parametric Model Maker da
MakerWorld: quatro desenhos fixos, chapados, com as cores escolhidas na tela de customização.

⚠️ **Ela não compartilha uma linha com o núcleo, e não deve passar a compartilhar.** O núcleo
decide forma por distância assinada e exporta por curvas de nível; OpenSCAD é CSG. As sete
formas foram **reescritas** como polígono/círculo exatos — o SDF nunca foi necessário para as
regiões, só para o filete, que ali é `offset()`. Quem tentar unificar as duas vai reintroduzir
o campo de distância dentro do CSG, que é o pior dos dois mundos.

O que sabemos do PMM, medido e não suposto (detalhes em `openscad/README.md`):

- **`lazy-union` é o que faz cor virar peça.** Sem ela o OpenSCAD funde o topo num objeto só e
  grava cor em `basematerials`, por triângulo. A flag não existe no PMM — mas o pipeline dele
  entrega a cor de um jeito que o Bambu Studio entende, com torre de purga e tudo. Medido.
- **O PMM produz um TERCEIRO caminho de cor**, dissecando o 3MF que ele devolve: um objeto
  só, sem `basematerials`, com `paint_color` por triângulo — o mesmo formato da ferramenta de
  pintura do Bambu Studio — e as cores em `filament_colour`. Some, portanto, a contradição
  aparente com o "fatiadores ignoram `basematerials`" registrado acima: são três caminhos
  distintos, e só o do meio é o que este repo escreve.

    | | resultado |
    |---|---|
    | `basematerials` | fatiador ignora |
    | peças + os dois configs | funciona — é o que `to3MF` faz |
    | `paint_color` por triângulo | funciona — é o que o PMM produz |
- **Duas cores não podem dividir volume** — é a invariante, e `openscad/teste-cores.sh` a
  checa. O critério é volume com tolerância de 1e-3 mm³, não "está vazio": faces coincidentes
  devolvem lascas de 1e-8 mm³ e exigir vazio reprova geometria correta.

### Versão

`MC.VERSAO` no núcleo é a **fonte única**. A tela lê dali
(`getElementById('ver').textContent = 'v' + MC.VERSAO`) em vez de trazer o número escrito à
mão, e a suíte confere as duas coisas — o formato e o fato de a tela ler do núcleo — para não
existirem dois lugares para incrementar. Aparece na linha do crédito, entre o autor e a
licença, como texto simples: os dois vizinhos são links, e a versão não é.

Fica no núcleo, e não no bloco de UI, porque é o que `teste-cloisonne.js` e `amostrar.js`
alcançam por `vm`.

### Licença

**AGPL-3.0.** A escolha veio de o app ser UM arquivo: copiar e hospedar em outro domínio é
trivial, e a AGPL é o que obriga quem faz isso a publicar a versão modificada. Os dois HTML
levam o aviso completo em comentário logo **depois** do `<meta charset>` — não antes, porque
a declaração de charset precisa cair nos primeiros 1024 bytes e o aviso sozinho tem quase 900.

Na tela, a licença aparece como um link `AGPL-3.0` na linha do crédito (no app, dentro de
`Apoie o projeto`; na landing, à direita da primeira linha do rodapé). Ele aponta para o texto
canônico na `gnu.org`, e **não** para o repo: assim funciona servido, funciona local e não
depende de o repo estar público.

⚠️ Não há build nem minificação: **o HTML servido já é a fonte correspondente completa**, o
que é o que satisfaz a seção 13 da AGPL. O link `Source:` do cabeçalho é cortesia, e aponta
para este repo — enquanto ele for privado, o link não resolve para ninguém.

**Leia o `MANDALA-CLOISONNE.md` antes de mexer na geometria** — as fórmulas de cada motivo,
o modelo de dados e as armadilhas estão lá, não no código.

## Comandos

```bash
node teste-cloisonne.js       # suíte do cloisonné           (8 casos + fuzz 40× + exportação)
python3 teste-contorno.py     # suíte da via por contorno     (5 presets, ~12 s)
open mandala-cloisonne.html   # abrir o app no navegador (é só o arquivo, não há servidor)

python3 exportar.py preset:incenso saida.3mf   # exportação por contorno, bordas lisas
python3 exportar.py minha.json peca.3mf --impressora a1   # h2c (padrão), a1, p1s ou x1c
```

As duas suítes saem com código 1 se algum caso falhar. Não há test runner: em
`teste-cloisonne.js` cada caso é uma entrada no array `cases`. Para rodar só um, comente os
demais `cases.push(...)`.

O `package.json` local existe só para marcar `"type": "commonjs"` — sem ele o Node herda o
`"type": "module"` de um `package.json` que está na home do usuário e `require` para de
funcionar. O projeto continua sem dependências.

Se precisar abrir um app com automação de navegador, `file://` costuma ser bloqueado;
sirva com `python3 -m http.server` e acesse por `localhost`.

Validação externa opcional:

- geometria — `pip install trimesh networkx`: `m.is_watertight` e `m.is_winding_consistent`
  devem ser `True`;
- **cor no 3MF** — `pip install lib3mf`. O `trimesh` **não serve**: o leitor de 3MF dele
  ignora materiais e devolve tudo cinza, o que dá falso negativo;
- **validação de ponta a ponta** — o Bambu Studio tem CLI em
  `/Applications/3D Software/BambuStudio.app/Contents/MacOS/BambuStudio`. **Fatiar**
  (`--slice 0 --outputdir <abs>`) é o único teste que pega perfil torto: espere
  `return_code: 0` no `result.json`. Reexportar (`--export-3mf`, com caminhos absolutos) e
  ler o `model_settings.config` da volta mostra o que o fatiador entendeu da geometria.
  Receita completa nas seções 7 e 9 do `MANDALA-CLOISONNE.md`.

## Arquitetura

### Blocos do arquivo

O HTML tem quatro blocos, e **essa separação é contratual**: `teste-cloisonne.js` e
`amostrar.js` extraem o núcleo por regex
(`/<script id="mandala-core">([\s\S]*?)<\/script>/`) e o rodam em `vm`. Logo: **não renomeie
o `id` do bloco**, não use `document`/`window` dentro do núcleo, e mantenha `MC` como `var`
no topo do bloco — o harness faz `this.MC = MC`. `<style>` e `<body>` (painel de controles,
canvas, rodapé) vêm antes; `<script id="mandala-ui">` traz presets, painel, preview 2D/3D e
download, e é de lá que `exportar.py` recorta o literal `var PRESETS`.

### `mandala-cloisonne.html` — relevo por região

A altura não vem de um campo somado, e sim de **regiões com distância assinada**:

```
cfg → prepare()  → camadas ativas
    → dist()     → distância assinada de UM motivo (positiva dentro)
    → filete()   → esse ponto é filete (linha alta) ou poça (rebaixada)?
    → amostra()  → percorre as camadas; a ÚLTIMA que reivindica vence (pintura, não soma)
    → altura()   → mm: base + nivel*degrau + (filete ? fioH : 0), com cone/furo/aro por cima
    → buildContorno → to3MF | toOBJ   (buildIndexed/buildMesh só na auditoria)
```

Consequências práticas ao mexer:

- A **ordem do array `camadas` é a ordem de pintura** — a última cobre as anteriores. O
  painel tem ▲▼ por isso.
- `dist`/`amostra` usam raio normalizado; `altura`/`solid` usam **milímetros**.
- **Fase mora em `fasePasso`**, fração do passo da simetria (1 passo = `360/n`), não em
  graus: meio passo segue meio passo quando `sym` muda. `prepare` cai no `fase` em graus só
  quando `fasePasso` não é finito (config antiga); a UI converte na carga (`migraFase`) e
  mantém `fase` como espelho.
- No `anel` a fase e a largura não mexem no contorno (é uma volta inteira) mas **mexem no
  preenchimento** — `nervuras`, `gotaint` e `pontoint` são n-fold e giram com a fase. O
  painel mostra esses dois controles quando o interior é um desses três (`salvoSe`).
- No motivo `arco`, `prepare` desconta a calota (`spanA`) para que `larg = 1` signifique
  "encosta no vizinho". Mexer nisso funde os arcos num anel contínuo.
- Uma banda mais fina que `2 × fio` some — vira só filete, sem cor.
- **`buildContorno`** é a via de exportação padrão: marching squares com recorte por célula,
  bordas lisas, sem dependências. Suas armadilhas (cruzamento em cima do nó, sela
  desconectada, T-junction contra retângulo fundido, moldura apertada) estão detalhadas na
  seção 6 do `MANDALA-CLOISONNE.md` e cobertas na suíte — **leia antes de mexer nela**.
- A vista 3D rasteriza a **grade da exportação** com z-buffer (teto de ~300 mil células).
  Grade cartesiana com painter's algorithm não resolve um filete de menos de 1 mm — não
  "simplifique" de volta. E se o preview usar grade diferente da exportação, ele deixa de
  mostrar o serrilhado que o usuário vai ver no fatiador.
- **É `nt` (resolução angular) que decide se o filete sobrevive**: a célula no aro mede
  `pi·D/nt` e abaixo de ~3 células por filete a borda sai em escada. A qualidade `fino`
  (220×2880) troca resolução radial por angular e dá 6,9 células por filete com menos
  triângulos que `max`. Alargar o filete não resolve — acima de ~1,2 mm ele engole as poças.
- **`cfg.baseSolida`** (padrão desligado) parte a peça em duas fatias: a base, em `corBase`,
  de 0 até `cfg.base`, e o desenho, extrudado do topo dela para cima. Sem ele toda região sai
  do plano da mesa e a cor da poça atravessa a peça inteira — 31,9 cm³ de filamento colorido
  no preset padrão contra 8,9 cm³ com a base sólida ligada. A espessura é o `cfg.base` em mm
  nos dois modos; o slider vai de 0,4 a 10 mm em passos de 0,2, para cair sempre em camada
  inteira.
- `malhaRegiao(cov, N, quadro, passo, z, z0)` extruda de `z0` (padrão 0) até `z`. Toda cota
  de fundo vem de `topo ? z : z0` — **cota literal ali é bug**: o vértice central do leque do
  fundo tinha `0` escrito à mão, e só apareceu ao ligar a base sólida, puxando um bico até a
  mesa em cada retângulo fundido.
- O `.bin` da via por contorno é **`MCR3`**: 12 bytes por região (`float32 z`, `uint8 r,g,b`,
  `uint8 pad`, `float32 z0`), não mais 8. `amostrar.js` e `exportar.py` conhecem o formato à
  mão; mexer num sem o outro dá "arquivo de grade inválido ou de versão antiga".
- **Furo de pendurar** (`pend`/`pendA`/`pendR`): cilindro passante, e `solid()` é o único
  lugar onde ele existe — **antes** do `modo === 'placa' → true`, que o engoliria. Cobertura,
  grade polar e previews já filtram por `solid`, então o resto vem de graça. `pendA` é
  **negado** no cálculo porque a vista de topo desenha com o y da tela para baixo: o ângulo é
  medido na tela, 90° é o topo do que o usuário vê. Isso expôs que o topo é espelhado em
  relação ao modelo exportado — nunca incomodou porque todo desenho é n-fold, mas um
  preenchimento quiral (`nervuras` com `incl ≠ 0`) imprime com a inclinação espelhada.
- `cfg.nivelUnico` (padrão ligado) faz `prepare` ignorar o `nivel` das camadas e usar 1 em
  todas — mandala plana, só cone e aro com altura própria. `alturaMax` também respeita.
- `filete()` devolve **fração 0..1** com borda macia dimensionada pela célula da grade, não
  0/1. Logo `altura` multiplica (`out.fio * fioH`) e a cor decide por `out.fio >= 0.5`.
- Sobraram **dois** formatos de exportação, `3MF · contorno` (padrão) e `OBJ + MTL`, e os
  dois saem da **mesma** geometria (`buildContorno`). O STL sem cor, o 3MF de peça única, o
  3MF de peças por cor pela grade (`buildPartes`) e o OBJ pela grade foram removidos — não
  davam cor no fatiador ou saíam com borda em escada. Não os traga de volta sem motivo novo.
- `to3MF` e `toOBJ` aceitam **só** a forma de `buildContorno` (peças com vértices próprios).
  `to3MF` é **assíncrono** (comprime com `CompressionStream`); `toOBJ` emite os vértices de
  cada peça em sequência e soma o deslocamento nas faces, com um `usemtl` por peça.
- A grade polar (`emitir`/`buildIndexed`/`buildMesh`) **não exporta mais nada** — sobrou
  como malha auditada pela suíte, que é onde as invariantes de estanqueidade são checadas.
  `emitir()` continua sendo a única implementação da emissão de triângulos.
- **Fatiadores ignoram `basematerials`.** Cor no Bambu/Prusa só chega como *peça* (um objeto
  com vários `<component>` e o extrusor de cada um em `Metadata/model_settings.config`) ou
  via OBJ colorido — mas aí o Bambu abre o diálogo *Import Model* e agrupa as cores no
  **Color Count**, cujo valor inicial o "Auto" escolhe sozinho (6 cores viraram 2 num AMS de
  4 slots). O sintoma é o *Filament Mapping* listar cores que não estão na paleta: são
  centroides. Para imprimir colorido sem esse passo manual, o caminho determinístico é o
  3MF por contorno.
- **A cor precisa dos DOIS arquivos de config.** `model_settings.config` manda a peça i para
  o extrusor i+1; `project_settings.config` diz que o filamento i+1 tem a cor da peça i. Só
  com o primeiro, a peça vai para o extrusor certo com a cor do slot que o usuário tiver ali
  — era essa a causa das "cores trocadas".
- **Dois gatilhos, medidos no CLI do Bambu**: (1) o `<metadata name="Application">` tem que
  ser `BambuStudio-<versão numérica>`, senão o fatiador lê e descarta o project_settings;
  (2) esse project_settings tem que ser **completo** — uma config só com `filament_colour` é
  aceita pelo parser e ignorada ao montar os presets (testado no app: os slots não mudaram).
  Daí `var PERFIL_BAMBU` no núcleo: ~53 kB de despejo do Bambu para H2C bico 0.4 descrevendo
  UM filamento, replicado por cor em `projetoBambu(pal, diam)` segundo `var PERFIL_REPETE`.
  `exportar.py` puxa os dois do HTML por regex. Detalhes e a receita de regerar o molde
  estão na seção 7 do `MANDALA-CLOISONNE.md`.
- **O molde tem que sair de presets RESOLVIDOS.** Os `.json` do sistema só trazem o que
  sobrescreve o pai (`inherits`) e os gcodes vêm por `include`; passando o arquivo cru para
  o CLI, o resto cai no padrão do Slic3r. Foi assim que o molde da primeira versão saiu com
  `printable_height: "100"` e uma variante de bico só — o Bambu abria e não fatiava.
- **Replicar por cor não é repetir array de tamanho 1.** `filament_self_index` numera as
  variantes por filamento (`1×V, 2×V, …`), `flush_volumes_matrix` tem **`bicos × N²`**
  entradas (um bloco N×N por bico, não N×N — medido em 13 projetos escritos pelo Bambu),
  `flush_volumes_vector` tem `2N`, `flush_multiplier`/`_fast` uma por bico, `inherits_group` e
  `different_settings_to_system` têm N+2 entradas, e `extruder_nozzle_stats` uma por
  extrusor. Nada disso dá erro de leitura: o arquivo abre e falha só no fatiamento
  ("No valid nozzle found", e na interface "Wipe tower generation failed, possibly due to
  empty first layer").
- **`return_code: 0` não é critério.** A matriz de purga torta o CLI pega (`-100`, "Flush
  volumes matrix do not match to the correct size!"), mas o `filament_self_index` errado
  fatia com `return_code: 0` e deixa o erro só no log — filtre por `could not found
  extruder_type|No valid nozzle|Flush volumes|unprintable area`. Conferir os tamanhos na
  suíte continua sendo o guarda-corpo barato.
- **Quatro impressoras, por delta.** `PERFIL_BAMBU` é o molde do H2C; `PERFIS_MAQUINA` traz
  A1, P1S e X1C como as ~200 chaves que diferem, e `perfilDe(maq)` monta o perfil completo.
  Delta porque as três são **mono-extrusor**: as chaves "por extrusor" e "por variante" mudam
  de comprimento, e trocar a chave inteira resolve sem lógica. Como `projetoBambu` lê
  `bicos = nozzle_diameter.length`, a matriz de purga cai de `2N²` para `N²` sozinha.
  Os ~68 kB de gcode não dá para omitir — quem abre o projeto fatia com o gcode que está
  nele. Ao regerar: o X1C se chama `Bambu Lab X1 Carbon 0.4 nozzle`, e o P1S usa o processo
  `0.20mm Standard @BBL X1C` (o `@BBL P1P` dá "process not compatible with printer").
- **A torre de purga tem que caber na caixa comum aos extrusores.** Num H2C o extrusor 1 vai
  de x=0 a 325 e o 2 de x=25 a 330; o `wipe_tower_x` 15 que vem no molde é inalcançável pelo
  segundo. `torrePurga(diam)` põe a torre atrás da peça e grampeia na interseção.
- **Só `--slice` valida perfil.** `--info` e `--export-3mf` passam com um project_settings
  que o fatiador não consegue usar — foi por esse buraco que o bug da torre entrou.
- **Projeto não é auto-arranjado**: o `<build><item>` precisa levar
  `transform="1 0 0 0 1 0 0 0 1 <cx> <cy> 0"` com o centro de `printable_area`
  (`centroMesa()`, 165/160 no H2C), senão a peça — modelada em torno de (0,0) — abre no
  canto frontal esquerdo, quase toda fora da mesa.
- Coordenadas exportadas usam **5 casas decimais**: com 3, vértices vizinhos perto do centro
  colidiam na qualidade máxima e viravam triângulo degenerado.
- No XML do 3MF, a cor de cada peça vem do `pindex` do `<object>` (índice **0-based** na
  paleta). Errar isso não gera erro de leitura — só faz as cores saírem trocadas.

### Invariantes de estanqueidade

Valem para o mesher polar (`grade`/`emitir`) e para a via por contorno:

1. **`MC.audit(mesh).openEdges === 0` em qualquer configuração.** É o critério de aceitação de
   toda mudança em geometria. Rode `node teste-cloisonne.js` depois de mexer em `dist`,
   `amostra`, `altura`, `solid`, `grade`, `emitir`, `buildContorno` ou `resolution`.
2. **Centro colapsado**: o nó `i = 0` é um vértice único, com a altura mediada entre todos os
   `j`; cada célula dessa linha emite **um** triângulo de topo, não dois, e não há parede
   interna ali.
3. **Paredes usam as alturas dos nós compartilhados** — é o que faz cada aresta aparecer duas
   vezes com orientações opostas.
4. **Otimização do fundo em leque** só vale quando *todas* as células estão presentes. Aplicá-la
   por coluna criaria T-junctions e furaria a malha.
5. **`nt` sempre múltiplo de `4 × sym`** (`resolution`), com mínimo de 3 células por passo e
   teto 3600. Resolução angular baixa fragmenta padrões finos e serrilha o filete.
6. O corte por `lo`/`hi` (pré-calculado em `prepare`, testado em `amostra`) é o que mantém o
   preview fluido; ao adicionar um motivo novo, calcule a faixa radial afetada com folga
   suficiente.

### Adicionar um motivo

Toca em: `MC.MOTIVOS`, o `switch` de `dist` (devolver distância assinada, positiva dentro),
`perfil` se a forma tiver eixo, qualquer pré-cálculo em `prepare`, e `CAM_FIELDS` na UI, que
declara por motivo quais controles aparecem (`para`, `nao`, `se`).

### UI

Os botões `−`/`+` de cada slider e o campo hex de cada seletor de cor **não estão no HTML**:
`decoraControles()` os injeta e é rechamada no fim de todo `drawPanel()`, porque `#cams` é
reconstruído por `innerHTML`. O `data-deco` evita duplicar nas linhas estáticas. Ao acrescentar
qualquer coisa numa `.row`, lembre que `fieldset` só não estoura o painel por causa do
`min-width:0` no CSS (o UA lhe dá `min-inline-size:min-content`, e o `input[type=range]` tem
largura intrínseca de ~130 px).

**Desfazer é `marca()` + `hist`/`futuro`, no bloco de UI.** `cfg` é serializável e pequeno
(~4 kB), então 40 snapshots custam menos que um quadro do preview. `marca()` guarda o estado
**antes** da mudança e tem que ser chamada antes de escrever em `cfg` — os pontos de mutação
são o `input` de `#scroll` (global e camada), as ações `del/dup/up/down`, `addcam`, clique de
preset, `aplicaPaleta`, `reduzCores` e a importação de `.json`. Se você acrescentar outro,
acrescente o `marca()` junto.

A coalescência por chave (`'g:'+k`, `'c:'+i+':'+ck`, janela de 700 ms) é o que faz um arraste
de slider valer **um** passo e não um por pixel — 21 eventos de `input` viram um `⌘Z`. O
atalho não dispara quando o foco está num campo de texto, porque ali o `⌘Z` é do campo.

`aviso()` mostra o toast: um passo desfeito pode não mexer em nada visível (uma camada
recolhida que volta), e sem a confirmação o `⌘Z` parece não ter funcionado.

**Alvos de 24 px na linha de camada, com o `×` separado.** Eram de 11×12 a 16×12 px
encostados, e o `×` (que apaga) colava no `⧉` (que duplica). O chevron é um `<button>` de
verdade, com `aria-expanded`: era um `<span>` dentro de uma `<div>`, e abrir uma camada não
tinha como ser feito pelo teclado.

**O acento é champanhe (`--acc:#d2c2a4`), e a crômática baixa é de propósito.** O conteúdo
desta tela é uma mandala colorida: cromo saturado brigaria com ela. O que dá o ar caro é a
temperatura quente do acento contra o quase-preto frio dos neutros, que ficam como estão —
não tinte os neutros para "combinar", é a tensão que faz o efeito. O acento veio do assunto
(cloisonné é fio de metal represando esmalte), não de associação de categoria. Latão puro foi
descartado por colidir com o âmbar do `--warn`: acento e aviso ficariam da mesma cor.
`--on-acc` é o texto sobre o acento; `--acc2` é o mesmo tom mais fundo, para foco e hover.

**As superfícies que o navegador desenha sozinho também são a interface.** `accent-color` no
`html` (senão o checkbox sai azul de fábrica no meio de uma tela sem azul nenhum),
`::selection`, `caret-color` e a barra de rolagem, todos tirados da paleta.

**As paletas da mandala (`PALETAS`) são CONTEÚDO, não cromo.** Elas descrevem o que vai ser
impresso. Mexer no acento do painel não as toca.

**O fieldset `Apoie o projeto` é o último do painel e o único sem `?`.** Os popovers `aj-*`
explicam o que um controle faz, e ali não há controle — a seção *é* o conteúdo. Pelo mesmo
motivo ela é a única com prosa fixa depois da varredura dos 17 `hint`: não é documentação de
campo. Classe própria (`.apoio p`), nunca `.hint`, para a diferença ficar legível no CSS.

Ela traz os **primeiros links externos do app** (Buy Me a Coffee, GitHub Sponsors, MakerWorld,
Cults3D e o site do autor) — o arquivo não tinha nenhum, e continua autocontido: `<a href>` só
é seguido por clique, nada é carregado da rede. Os `href` ficam como markup estático e só o
texto ao redor é `data-i18n`, para a URL não existir em duas cópias, uma por idioma.

**Champanhe preenchido é a ação ÚNICA da tela** — o botão que exporta. Os links de apoio usam
o acento só como contorno e hover (`.apoio nav a.doar`), e MakerWorld/Cults3D ficam um degrau
abaixo, em `--line` e `--dim`. Um segundo botão cheio não cria ênfase: cria empate, e quem
perde é a exportação.

**A landing tem a mesma chamada, no rodapé** (`index.html`, terceira `.linha` do
`footer.rodape`, sem fio próprio — ela e a `.autor` leem como um bloco só, depois do fio que
separa as duas do que a página é): a frase e as duas pílulas
de doação, com o mesmo desenho de ícone. MakerWorld e Cults3D **não** se repetem ali — já
estão logo acima, em `.refs`. Duas chaves novas, `rod.apoio` e `rod.doar`, no I18N da
landing, que é um dicionário próprio e menor, sem relação com o do app.

**A interface é bilíngue; o código não.** `var I18N = { pt: {...}, en: {...} }` no bloco de UI,
com 180 chaves em cada, e `t(chave, a, b)` interpolando `{0}`/`{1}` (por `split`/`join`, porque
uma frase pode repetir o mesmo marcador). O **pt é o fallback**: chave que falte no `en` sai em
português em vez de sumir.

No HTML estático o texto é marcado com `data-i18n` (textContent), `data-i18n-html` (innerHTML,
para os popovers, que têm `<em>` e `<code>` dentro), `data-i18n-title`, `data-i18n-aria` e
`data-i18n-ph`. `aplicaIdioma()` percorre esses atributos e depois **remonta** o que é gerado
por JS: `drawPaletas`, `drawMaquinas`, `drawPanel`, `updateStats`, `render`.

Sem `localStorage` no projeto, a escolha mora na **URL** (`?lang=en`, via `history.replaceState`),
o que de quebra torna o link compartilhável já no idioma certo. Sem parâmetro, vale
`navigator.language`.

Os rótulos de `MC.MOTIVOS` e `MC.PREENCH` continuam em pt **no núcleo**, como dado; quem traduz
é a UI, por slug (`t('mot.' + slug)`), com o rótulo do núcleo como último recurso. O núcleo não
sabe que existe idioma, e a suíte não olha esses rótulos.

⚠️ Cuidado com `t` como nome de variável local: `decoraControles` e `camHTML` tinham um `var t`
que sombreava a função de tradução. Se um `t(...)` "não é função", é isso.

**Ajuda vai em popover, não em `<p class="hint">`.** O painel tinha 17 hints e 518 palavras
de explicação permanente, 36% da altura total; o fieldset *Cores* sozinho era 61% prosa. Hoje
cada seção tem um `?` no `<legend>` abrindo um `<div popover class="pop">`, e sobrou **um**
texto inline: `#avisoPend`, que é estado condicional e não documentação. A regra ao acrescentar
texto: se depende do valor de um campo, fica inline; se explica o que o campo faz, vai para o
popover.

O popover é o **nativo** (`popovertarget` + atributo `popover`), não `position:absolute`:
`#scroll` é `overflow-y:auto` e recortaria qualquer coisa posicionada dentro dele. De graça
vêm a top layer, o Esc e o fechar clicando fora. Ancorar com CSS anchor positioning só
funciona no Chrome, então a posição é calculada em JS no `beforetoggle` e corrigida no
`toggle`, quando a altura já é conhecida.

A escala tipográfica tem **três degraus**: `--fs-sm` (11px), `--fs` (12.5px) e `--fs-lg`
(15.5px). Eram cinco tamanhos entre 10 e 14px, o que é o mesmo que não ter hierarquia. O
reset `input,button,select,textarea{font-size:inherit}` existe porque sem ele os controles
caem no 13.333px do agente de usuário e reintroduzem um quarto tamanho.

O enquadramento das três vistas mora em `view = {z, x, y}`. O `x`/`y` é **fração do menor
lado do canvas**, não pixel — é o que faz o snapshot (que redimensiona o canvas antes de
renderizar) sair com o mesmo enquadramento da tela. A roda dá zoom no cursor via
`zoomPara()`, que recalcula a âncora no `z` novo porque o centro de projeção da 3D depende
da escala. Arrastar desloca em topo/relevo e gira na 3D (shift ou botão do meio desloca).

`reduzCores(alvo)` funde os pares mais próximos em **Lab** (nunca em RGB) até sobrar `alvo`
cores, vencendo sempre a de maior área. `corFio` não é fundido — é o contorno de toda poça —
mas **conta no alvo**, que é o número de slots do AMS. A suíte confere que as cores que
`varreCores()` conta são exatamente a paleta de `buildContorno`: sem isso, pedir 4 poderia
render 5 filamentos no 3MF.

**Caixa do hex não é identidade de cor.** `buildContorno` indexa as peças por
`corChave(cor)` — minúsculo — porque `#d3e3e8` e `#D3E3E8` são a MESMA cor e emitir uma peça
para cada pede dois filamentos do AMS para pintar igual. O caminho que produzia isso era
`reduzCores`, que reescreve em minúsculo só as camadas que fundiu e deixa as intocadas na
caixa original: pedir 4 cores dava 5 peças em ~43% das mandalas do preset `aleatorio`. As
`PALETAS` e os presets agora nascem em minúsculo, `normCores(cfg)` normaliza `.json` que vem
de fora, e a suíte constrói a colisão de propósito (fundir duas cores visíveis numa só,
trocando a caixa) — embaralhar a caixa ao acaso quase nunca colide e passava com o bug no
lugar.

⚠️ Sobra um desacordo **de resolução**, não de identidade: a varredura do rodapé é uma grade
polar 120 × ~720 e a exportação é marching squares em 200–700, então uma região fina pode
existir para um e não para o outro. Medido em ~2% das mandalas do `aleatorio`, nas duas
direções (rodapé 4 × exportação 5, e o inverso). Aumentar a resolução da varredura não
resolve — o desacordo é dos dois lados.

`varreCores()` é a fonte única das cores em uso — badge, quadradinhos do rodapé e remapeamento
de paleta. Pesa cada amostra pelo raio e só enxerga cor **visível**. `cfg.nome` vira nome de
arquivo por `nomeArquivo()`. O app abre no preset `aleatorio`. Detalhes na seção 10 do
`MANDALA-CLOISONNE.md`.
