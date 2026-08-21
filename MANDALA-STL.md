# Mandala STL — gerador paramétrico

Handoff para continuar o projeto em Claude Code / opencode.
Arquivo do app: **`mandala-stl.html`** (1108 linhas, autocontido, zero dependências).

---

## 1. O que é

App de página única que gera mandalas geométricas paramétricas e exporta **STL binário
estanque** para impressão 3D. Inspirado no gerador de vasos <https://www.huginen.nu/vazy/>,
mas com a geometria em coordenadas polares por **anéis concêntricos** em vez de perfil de
revolução.

Duas saídas possíveis do mesmo modelo:

| Modo | O que gera | Uso típico |
|---|---|---|
| `relevo` | disco cheio com o padrão em relevo | medalhão, base de copo, aplique |
| `vazado` | só há material onde o campo passa de um limiar | suncatcher, peça de parede vazada |

---

## 2. Estrutura do arquivo

Um único HTML, três blocos. **Manter essa separação** — os testes dependem dela.

```
mandala-stl.html
├── <style>                    linhas   7–110   tema escuro, layout flex
├── <body>                     linhas 112–192   painel de controles + canvas + rodapé
├── <script id="mandala-core"> linhas 194–561   ★ matemática, malha, STL — SEM DOM
└── <script id="mandala-ui">   linhas 563–1108  presets, painel, preview, download
```

O núcleo é extraído por regex nos testes:

```js
html.match(/<script id="mandala-core">([\s\S]*?)<\/script>/)[1]
```

Se renomear o bloco, atualize o harness da seção 7.

---

## 3. API do núcleo (`MD`)

```js
MD.TYPES                    // [['anel','Anel'], ['petalas','Pétalas'], ...]
MD.ring(over)               // objeto de anel com defaults + sobrescritas
MD.defaults()               // config completa padrão
MD.prepare(cfg)             // pré-processa anéis ativos → { rings: [...] }
MD.shape(g, r, th)          // máscara 0..1 de UM anel pré-processado
MD.field(P, r, th)          // campo combinado 0..1   (r normalizado 0..1)
MD.solid(cfg, rmm, th, v)   // há material aqui? (rmm em MILÍMETROS)
MD.resolution(cfg, q)       // { nr, nt } para 'teste'|'bom'|'alta'|'max'
MD.buildMesh(cfg, res)      // { pos: Float32Array, n, tris, height, diam, parts }
MD.toSTL(mesh, nome)        // ArrayBuffer (STL binário)
MD.audit(mesh)              // { openEdges, degenerate, nonFinite, tris }
MD.clamp(v, a, b)
```

`MD.audit` é o guardião: **`openEdges` tem que ser 0** em qualquer configuração.

---

## 4. Modelo de dados

### Config global

```js
{
  diam: 120,        // mm
  base: 2,          // mm — espessura da chapa
  relief: 3.5,      // mm — altura máxima do relevo acima da base
  sym: 12,          // simetria N-fold global
  rot: 0,           // graus — rotação de tudo

  mode: 'relevo',   // 'relevo' | 'vazado'
  thresh: 0.35,     // limiar de material no modo vazado
  rim: 3,           // mm — aro externo sempre sólido
  conn: 0,          // nº de barras radiais de ligação (0 = sem)
  connW: 1.6,       // mm — largura das barras

  hole: 0,          // mm — Ø do furo central
  hang: false,      // furo de pendurar (com ilhó sólido em volta)
  hangD: 4,         // mm

  color: '#d8b26a', // só preview
  light: 315,       // graus — azimute da luz, só preview

  rings: [ ... ]
}
```

### Anel

```js
{
  on: true,
  type: 'petalas',    // anel | petalas | estrela | dentes | poligono | raios | pontos
  outline: false,     // false = cheio, true = só o contorno
  mult: 1,            // n = round(sym * mult)   → 0.25, 0.5, 1, 1.5, 2, 3, 4
  r0: 0.20, r1: 0.55, // faixa radial, fração do raio (0..1)
  amp: 0.8,           // amplitude da ondulação (petalas/estrela/dentes)
  phase: 0,           // graus
  w: 0.03,            // espessura do contorno, fração do raio
  size: 0.8,          // tamanho relativo (pontos/raios)
  soft: 0.02,         // suavidade da borda, fração do raio
  profile: 'domo',    // plano | domo | bisel
  h: 0.8              // altura relativa −1..1 (negativo = entalha)
}
```

---

## 5. A matemática

### 5.1 Campo de um anel — `shape(g, r, th)`

Cada tipo produz um **valor com sinal `s`** (positivo = dentro da forma). Isso unifica os
modos cheio e contorno:

```
cheio    : s = min(R(θ) − r, r − r0)        região entre r0 e a curva de contorno
contorno : s = w − |R(θ) − r|               faixa em volta da curva
```

Curva de contorno `R(θ)` por tipo (com `a = θ + fase`, `mid = (r0+r1)/2`, `half = (r1−r0)/2`):

| tipo | R(θ) | observação |
|---|---|---|
| `anel` | `r1` (cheio) / `mid` (contorno) | círculo |
| `petalas` | `mid + amp·half·cos(n·a)` | lóbulos suaves |
| `estrela` | `mid + amp·half·tri(n·a)` | `tri` = onda triangular, pontas retas |
| `dentes` | `mid + amp·half·tanh(6·sin(n·a))` | quadrada suavizada |
| `poligono` | `r1 · cos(π/n)/cos((a mod 2π/n) − π/n)` | n-gono regular |
| `raios` | — | `s = min(half − \|r − mid\|, arc − \|angDist(a,n)\|·r)` |
| `pontos` | — | `s = dot − dist((r,θ), centro mais próximo)` |

`raios` e `pontos` já devolvem `s` diretamente (região), e o modo contorno vira `w − |s|`
— o que transforma `pontos + contorno` em anéis/argolas.

Depois vem o perfil de altura, com `t = clamp(s / soft, 0, 1)`:

```
plano : t²(3−2t)          domo : √(1−(1−t)²)          bisel : t
```

### 5.2 Combinação — `field`

```
positivos → v = max(h_i · m_i)      camadas se sobrepõem sem somar altura
negativos → v = v − Σ|h_i · m_i|    entalhe
v = clamp(v, 0, 1)
```

Otimização importante: cada anel carrega `lo`/`hi` (faixa radial afetada + folga) e o
`shape` retorna 0 imediatamente fora dela. É o que mantém o preview pixel a pixel fluido.

### 5.3 Presença — `solid`

Ordem de decisão (a primeira que bate vence):

```
r > R                    → não
r < hole/2               → não
dentro do furo de pendurar → não
até 1.7 mm além dele     → SIM (ilhó sólido)
mode === 'relevo'        → sim
r ≥ R − rim              → sim  (aro externo)
barra de conector        → sim
v > thresh               → sim
```

**Altura final:** `z = base + relief · v`.

---

## 6. Geração da malha — não quebre estas invariantes

Grade polar de `NR × NT` células. Alturas avaliadas nos **nós**, presença avaliada no
**centro da célula**.

Por célula presente, com `A=(i,j) B=(i,j+1) C=(i+1,j+1) D=(i+1,j)`:

- **topo**: `(A,D,C)` e `(A,C,B)` — anti-horário visto de +z
- **fundo**: mesmos vértices em z=0, invertidos
- **paredes**: em toda fronteira com célula ausente (ou borda da grade), quad do z=0 até a
  altura dos nós daquela aresta

Quatro detalhes que garantem a estanqueidade:

1. **Centro** (`hole === 0`): os nós de `i=0` colapsam num ponto. As alturas de `z[0][*]`
   são **mediadas** e cada célula de `i=0` emite **um** triângulo em vez de dois (o segundo
   seria degenerado). Sem parede interna ali.
2. **Paredes usam alturas de nós compartilhados** — por isso cada aresta aparece exatamente
   duas vezes, com orientações opostas.
3. **Otimização do fundo**: se *todas* as células estão presentes (`full`), o fundo vira um
   leque/coroa único de `NT` (ou `2·NT`) triângulos em vez de `2·NR·NT`. Corta a malha pela
   metade. ⚠️ Só é válido no caso 100% cheio — aplicar por coluna criaria T-junctions e
   furaria a malha.
4. **`components()`** conta peças soltas por flood-fill 4-vizinhos na grade de presença
   (com o centro unindo tudo quando `hole === 0`). É o aviso "N peças soltas" do rodapé.

### Resoluções

```js
QUAL = { teste: [120,480], bom: [220,720], alta: [320,1080], max: [420,1440] }  // [nr, nt]
nt final = max(sym·8, round(nt/sym)·sym)   // sempre múltiplo da simetria, teto 2160
```

Resolução **angular** é o que decide se detalhes finos sobrevivem. Foi por isso que `teste`
subiu de 240 para 480: com 240, o preset "vitral" saía em 73 pedaços soltos.

Custo real (Ø120 mm, relevo cheio): `bom` ≈ 116 k tri / 5,5 MB / 140 ms · `max` ≈ 1,21 M tri
/ 58 MB / 1,1 s. Com furo de pendurar a malha dobra (o fundo deixa de ser leque).

---

## 7. Verificação

### 7.1 Testes de malha (Node, sem dependências)

`test-mandala.js` — extrai o núcleo do HTML com `vm`, roda 8 configurações
(relevo, furo central, vazado com/sem aro, todos os 7 tipos juntos, relevo zero + sym 48,
limiar alto, preset vitral) e confere para cada uma:

```
openEdges === 0 · degenerate === 0 · nonFinite === 0
tris do cabeçalho STL === mesh.tris · byteLength === 84 + 50·tris
raio máximo ≤ diam/2 · z mínimo ≥ 0
```

```bash
node test-mandala.js
```

Esqueleto do extrator:

```js
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('mandala-stl.html', 'utf8');
const core = html.match(/<script id="mandala-core">([\s\S]*?)<\/script>/)[1];
const ctx = { console }; vm.createContext(ctx);
vm.runInContext(core + '\nthis.MD = MD;', ctx);
const MD = ctx.MD;
```

### 7.2 Fuzz

40 configurações aleatórias (inclusive com `r0 > r1` de propósito, `mult` extremos, alturas
negativas, furos combinados) → `buildMesh` + `audit`. Status atual: **40/40 sem arestas
abertas**.

### 7.3 Validação externa

```bash
pip install trimesh --break-system-packages
```

```python
import trimesh
m = trimesh.load('mandala.stl'); m.merge_vertices()
print(m.is_watertight, m.is_winding_consistent, m.volume, m.euler_number)
```

Resultado esperado: `True True <volume>0> <euler>`. Euler = 2 no disco cheio, −2 com dois
furos, bem negativo no vazado (um furo por vão).

### 7.4 UI (Playwright)

Screenshot de cada preset nas duas abas + clique real no botão de download conferindo o
cabeçalho do STL baixado. Rodou sem erros de console.

```js
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
```

---

## 8. UI — como está montada

- **Painel** gerado por dados: `RING_FIELDS` descreve os controles de anel e
  `ringHTML()` monta os cards; campos irrelevantes ao tipo são omitidos
  (`for: [...]`, `onlyOutline: true`). Eventos por delegação em `#scroll` lendo
  `data-g` (global) e `data-r` + `data-i` (anel).
- **Vista de topo**: sombreamento por pixel em `ImageData` — normal pela derivada do campo
  de altura, Lambert + specular. `schedule()` desenha a 42% durante o arraste e a 100%
  após 180 ms de ociosidade.
- **Vista 3D**: grade cartesiana 200×200, quads ordenados por profundidade (painter's
  algorithm) + saias verticais nas fronteiras. Órbita por `pointerdown/move`.
- **Presets**: `roseta`, `sol`, `vitral`, `flor`, `labirinto`, `random`.
- **Persistência**: salvar/abrir `.json` da config inteira.

Textos da interface em **pt-BR**. Sem `localStorage`, sem CDN, sem build.

---

## 9. Limitações conhecidas / próximos passos

1. **Fundo não otimizado quando há furo de pendurar** — a malha dobra de tamanho. Uma
   solução correta exige triangulação que respeite as subdivisões das paredes (T-junctions);
   ou rodar um decimador de coplanares no fim.
2. **Sem chanfro na borda externa** — a lateral é um cilindro reto. Um bisel de 0,4 mm no
   topo do aro melhoraria o acabamento impresso.
3. **Vazado com anéis de contorno ainda pode sair em pedaços** se o usuário zerar aro e
   conectores. O aviso existe; faltaria um botão "conectar automaticamente" que ache o
   número mínimo de barras.
4. **Sem espelhamento no verso** — o relevo é só no topo (o que é o certo para FDM, mas
   limita peças de dupla face).
5. **Sem exportação 2D** — um SVG do contorno no modo vazado sairia quase de graça
   (as curvas de nível já existem) e serviria para corte a laser.
6. **`estrela` e `dentes` no modo contorno com `amp` alto** podem se auto-intersectar
   visualmente; não quebra a malha, mas fica feio.
7. Ideias de tipos novos: espiral logarítmica, entrelaçado (nós celtas), texto radial,
   subdivisão fractal por anel.

---

## 10. Prompt sugerido para retomar

> Estou continuando o `mandala-stl.html` (gerador paramétrico de mandalas com exportação
> STL, arquivo único sem dependências). Leia `MANDALA-STL.md` para o contexto: o núcleo
> matemático está no bloco `<script id="mandala-core">` e não pode depender de DOM; a malha
> precisa continuar estanque (`MD.audit(...).openEdges === 0`) — rode `node test-mandala.js`
> depois de qualquer mudança na geometria. Quero <sua tarefa aqui>.
