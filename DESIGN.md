---
name: Mandala Forge
description: Gerador de mandala cloisonné no navegador, com a landing page que o publica
colors:
  ground: "#0f1116"
  surface: "#171a22"
  surface-raised: "#1e222c"
  hairline: "#2a2f3c"
  ink: "#e6e9f0"
  ink-muted: "#98a0b3"
  champagne: "#d2c2a4"
  champagne-deep: "#ada490"
  on-champagne: "#17140c"
  signal-ok: "#6ec48b"
  signal-warn: "#e0a458"
  signal-bad: "#e06a5a"
  well: "#12151c"
  scroll-thumb: "#33394a"
  scroll-thumb-hover: "#414962"
  swatch-hairline: "rgba(255,255,255,.22)"
  signal-ok-bg: "#152119"
  signal-ok-line: "#2f4f3c"
  signal-warn-bg: "#211b12"
  signal-warn-line: "#4f402a"
  signal-bad-bg: "#211413"
  signal-bad-line: "#5a2f2a"
  signal-bad-wash: "#2a1a18"
typography:
  display:
    fontFamily: "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.2rem, 5vw, 3.9rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1.6rem, 3.4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  lede:
    fontFamily: "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "clamp(1rem, 1.8vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  title:
    fontFamily: "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15.5px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.04em"
  body:
    fontFamily: "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.06em"
    fontFeature: "tabular-nums"
rounded:
  hair: "2px"
  xs: "3px"
  chip: "4px"
  sm: "5px"
  tab: "6px"
  md: "8px"
  lg: "14px"
  pill: "99px"
  circle: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "28px"
  gutter: "clamp(20px, 5vw, 64px)"
components:
  button-primary:
    backgroundColor: "{colors.champagne}"
    textColor: "{colors.on-champagne}"
    rounded: "{rounded.sm}"
    padding: "11px 20px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.champagne}"
    textColor: "{colors.on-champagne}"
  button-ghost:
    backgroundColor: "#12151c"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "11px 20px"
  button-ghost-hover:
    backgroundColor: "#12151c"
    textColor: "{colors.ink}"
  control-row:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "8px 10px 10px"
    typography: "{typography.label}"
  step-button:
    backgroundColor: "#12151c"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.xs}"
    size: "18px"
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "4px"
    size: "24px"
  badge-ok:
    backgroundColor: "#152119"
    textColor: "{colors.signal-ok}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  badge-warn:
    backgroundColor: "#211b12"
    textColor: "{colors.signal-warn}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  badge-bad:
    backgroundColor: "#211413"
    textColor: "{colors.signal-bad}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  popover:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    width: "min(340px, calc(100vw - 24px))"
---

# Design System: Mandala Forge

## Overview

**Creative North Star: "A Vitrine Escura"**

Uma caixa de museu, não um painel de software. O fundo é escuro e dessaturado porque
recua para o objeto ler; as ferragens são de metal envelhecido; e a única coisa saturada na
tela é a peça sob a luz. Todo o resto do sistema decorre disso.

Isso resolve a tensão central do projeto: o **conteúdo é uma mandala colorida**, gerada pelo
usuário, e a cor dela muda a cada clique numa paleta. Um cromo com cor própria brigaria com
ela toda vez. Por isso o acento é champanhe de crômática baixa, e por isso os neutros ficam
frios: o que faz a interface parecer cara é a **tensão de temperatura** entre o acento quente
e o quase-preto frio, não a saturação. Tintar os neutros para "combinar" com o acento
desmancharia exatamente o efeito.

A densidade é honesta. O app é um painel de ferramenta com muitos parâmetros e não finge ser
outra coisa: numerais tabulares, controles de passo fino, hex ao lado de cada seletor de cor.
A landing page herda o mesmo mundo sem inventar nada, e ganha escala em vez de ganhar
ornamento. Não há webfont em lugar nenhum: o projeto é zero dependências e sem CDN, então o
peso de display vem de tamanho, peso e tracking.

**Key Characteristics:**
- Fundo quase-preto frio; a cor vem do conteúdo, nunca do cromo
- Um acento só, metálico e de crômática baixa, para ação e seleção
- Três degraus de tipo no app, cinco na landing; uma família só, do sistema
- Contraste AA como piso, medido em pares renderizados
- Superfícies do navegador (seleção, cursor, barra de rolagem, anel de foco) tiradas da paleta

## Colors

Uma escada de neutros frios com um único acento quente, e três sinais semânticos que só
aparecem quando há o que dizer.

### Primary
- **Champanhe** (`{colors.champagne}`): a única cor de ação do sistema. Botão primário,
  segmento ativo, thumb de slider, checkbox, cursor de texto, seleção de texto. Vem do
  assunto: cloisonné é fio de metal represando esmalte, e o metal aqui é gilt envelhecido.
- **Champanhe Fundo** (`{colors.champagne-deep}`): o mesmo tom um degrau abaixo, para anel de
  foco e dica de hover. Não é uma segunda cor de marca, é o mesmo matiz mais quieto.
- **Tinta Sobre Champanhe** (`{colors.on-champagne}`): quase-preto amarronzado, derivado do
  matiz do acento, para texto sobre o botão primário. Nunca use preto puro nem o `ground` ali.

### Neutral
- **Fundo** (`{colors.ground}`): o chão da vitrine. Corpo da página e do app.
- **Superfície** (`{colors.surface}`): painel, barra e rodapé. Um degrau acima do chão.
- **Superfície Elevada** (`{colors.surface-raised}`): fieldset, card de camada, popover, cartão
  da galeria. O degrau em que o conteúdo mora.
- **Fio de Cabelo** (`{colors.hairline}`): toda borda e todo divisor. Um valor só, sem escala.
- **Tinta** (`{colors.ink}`): texto corrente e valores.
- **Tinta Apagada** (`{colors.ink-muted}`): rótulo, legenda, prosa secundária. Mede 6,07:1
  sobre a superfície elevada, então ainda é texto de leitura, não decoração.

### Tertiary
Os três sinais. Cada um tem um fundo próprio e escuro, nunca o acento:
- **Verde OK** (`{colors.signal-ok}`): peça fechada, cabe no AMS, fatiou.
- **Âmbar Aviso** (`{colors.signal-warn}`): passou dos quatro filamentos, parede fina.
- **Coral Erro** (`{colors.signal-bad}`): não cabe na mesa, e o hover da ação destrutiva, que
  ganha o banho `{colors.signal-bad-wash}` por trás.

### Named Rules

**A Regra do Cromo Mudo.** O acento cobre menos de 5% de qualquer tela. Se um elemento não é
ação, seleção ou estado, ele é neutro. A cor da tela é a peça do usuário.

**A Regra da Temperatura.** O acento é quente, os neutros são frios, e **nenhum dos dois se
move em direção ao outro**. Não tinte os neutros para o matiz do acento; a tensão é o efeito.

**A Regra do Âmbar Reservado.** `signal-warn` é âmbar e o acento é champanhe. Nunca escolha um
acento amarelo-alaranjado: ação primária e aviso ficariam da mesma cor. Foi por isso que latão
puro foi descartado.

## Typography

**Display Font:** pilha do sistema (`ui-sans-serif`, `-apple-system`, `Segoe UI`, `Roboto`)
**Body Font:** a mesma
**Label/Mono Font:** a mesma, com `font-variant-numeric: tabular-nums`

**Character:** uma família só, em três a cinco degraus. Não é economia: o projeto proíbe CDN e
webfont, então a voz de display vem de escala, peso e tracking negativo. Numerais tabulares em
tudo que é medida, porque o app inteiro é milímetro.

### Hierarchy
- **Display** (700, `clamp(2.2rem, 5vw, 3.9rem)`, 1.04, `-0.035em`): só o título da landing.
- **Headline** (700, `clamp(1.6rem, 3.4vw, 2.5rem)`, 1.1, `-0.025em`): título de seção.
- **Lede** (400, `clamp(1rem, 1.8vw, 1.25rem)`, 1.6): a linha de apoio sob o título do herói,
  em `ink-muted`. Único degrau entre `body` e `headline`, e só a landing o usa.
- **Title** (600, 15.5px, `0.04em`, caixa alta): o nome do app no painel. É o único uso de
  caixa alta no sistema.
- **Body** (400, 15px na landing / 12.5px no app, 1.6): prosa e todo controle. Medida de
  60–65ch nos parágrafos; a landing nunca passa de 62ch.
- **Label** (400, 11px no app / 12.5px na landing, `0.06em` em legend): rótulo de controle,
  legenda, badge, valor numérico.

### Named Rules

**A Regra dos Três Degraus.** O painel do app usa exatamente três tamanhos (11 / 12,5 / 15,5).
Cinco tamanhos espremidos em 4px foi o estado anterior, e é o mesmo que não ter hierarquia.
Um quarto degrau precisa de justificativa escrita.

**A Regra do Reset de Controle.** `input, button, select, textarea { font-size: inherit }` é
obrigatório. Sem isso os controles caem no 13,333px do agente de usuário e reintroduzem um
degrau que ninguém escolheu.

## Layout

O app é um shell de duas colunas: painel fixo de 352px à esquerda, palco flexível à direita,
com barra de abas em cima e dois rodapés de exportação embaixo. Abaixo de 860px vira coluna
única com o painel ocupando 46vh.

A landing é uma coluna central de 1180px com gutter `{spacing.gutter}`. As seções do processo
alternam duas colunas (arte / texto) e viram coluna única abaixo de 860px, com a arte sempre
subindo para o topo no mobile.

O ritmo é vertical e desigual de propósito: seções de processo respiram
`clamp(52px, 7vw, 88px)` acima e abaixo, e há sempre mais espaço acima de um título do que
abaixo dele. Dentro do painel o passo é apertado: 6px entre controles de uma linha, 12px entre
fieldsets.

**A Regra do `min-width: 0`.** Todo `fieldset` e todo item de flex que contenha um
`input[type=range]` precisa de `min-width: 0`. O agente de usuário dá `min-inline-size:
min-content` ao fieldset, e a largura intrínseca de ~130px do slider estoura o painel.

## Elevation & Depth

Híbrido, com regra clara: **a profundidade em repouso é tonal, a sombra é resposta a estado ou
a flutuação real.** A escada `ground → surface → surface-raised` faz quase todo o trabalho,
com o fio de cabelo separando os planos. Sombra só aparece onde algo está de fato acima do
plano: o popover (top layer), o toast, o cartão de arte da landing, e o botão primário no
hover.

### Shadow Vocabulary
- **Elevação de placa** (`box-shadow: 0 18px 50px rgba(0,0,0,.35)`): cartão de arte da landing,
  em repouso. Deslocamento grande e blur largo, para ler como objeto pousado.
- **Camada flutuante** (`box-shadow: 0 14px 36px rgba(0,0,0,.55)`): popover de ajuda.
- **Toast** (`box-shadow: 0 8px 24px rgba(0,0,0,.5)`): confirmação transitória.
- **Lift de ação** (`box-shadow: 0 6px 18px rgba(0,0,0,.45)` + `translateY(-1px)`): só no hover
  do botão primário.
- **Halo da peça** (`drop-shadow(0 26px 60px rgba(0,0,0,.55))`): a mandala do herói, que é PNG
  transparente e precisa pousar sobre o fundo.

### Named Rules

**A Regra da Sombra com Corpo.** Toda sombra tem deslocamento vertical **e** blur largo. Halo
colorido de deslocamento zero é decoração e não entra.

## Shapes

Cantos suaves e crescentes com o tamanho do container: 2–4px em amostra de cor e alvo de
ícone, 5px em controle e botão, 6px em aba, 8px em fieldset, popover e botão primário da
landing, 14px em cartão de arte e de galeria. Pílula (99px) só onde a forma comunica
"etiqueta": badge de estado e pílula de paleta. Círculo (50%) só no `?` da ajuda.

**A Regra da Escada Fechada.** Nove degraus de raio e nenhum a mais. Um valor fora da escada
é deriva, não decisão: encaixe no degrau vizinho.

Bordas são todas de 1px em `{colors.hairline}`, sem exceção de espessura. Borda lateral
colorida não existe no sistema.

A silhueta recorrente do projeto é o **disco**: a peça é sempre um círculo, e ele aparece de
novo no favicon, no halo do herói e nos avatares de cor (quadradinhos de 9–11px com raio 2–3px,
que são a única forma que *não* é o disco).

## Components

### Buttons
- **Shape:** cantos suaves (5px); o CTA da landing usa 7px por ser maior.
- **Primary:** fundo champanhe, texto `on-champagne`, peso 600, padding 11×20px. Mede
  10,5:1 de contraste interno e 9,93:1 contra o rodapé.
- **Hover / Focus:** `filter: brightness(1.06)`, `translateY(-1px)` e lift de sombra, em 160ms
  com `cubic-bezier(.16,1,.3,1)`. Foco desenha anel de 2px em `champagne-deep` com offset 3px.
- **Ghost:** fundo `#12151c`, borda de fio de cabelo, texto `ink`. No hover só a borda acende
  para `champagne-deep`; sem brilho e sem lift.
- **Step (±):** 18×18px, o menor alvo do sistema, e só porque vem em par colado a um slider.

### Chips
- **Pílula de paleta:** fundo `#12151c`, borda de fio de cabelo, cinco tarjas de 8×12px
  mostrando as cores. Hover acende a borda em `champagne-deep`.
- **Badge de estado:** pílula com fundo escuro próprio por sinal, nunca o acento. Some por
  completo quando não há o que dizer (`:empty { display: none }`), em vez de mostrar vazio.

### Cards / Containers
- **Corner Style:** 8px em fieldset e card de camada, 14px em cartão de galeria, 16px em
  cartão de arte.
- **Background:** `surface-raised` sobre `surface` sobre `ground`.
- **Shadow Strategy:** nenhuma em repouso dentro do painel; ver Elevation.
- **Border:** 1px de fio de cabelo, sempre.
- **Internal Padding:** 8–10px no painel, `clamp(14px, 3vw, 34px)` no cartão de arte.

### Inputs / Fields
- **Style:** fundo `#12151c`, borda de fio de cabelo, raio 5px, altura de 24–28px.
- **Focus:** borda vira champanhe e o anel de `:focus-visible` aparece por fora. O campo hex
  ao lado de cada seletor de cor é parte do controle, não um extra.
- **Sliders:** `accent-color` herdado do `html`, então thumb e trilha saem em champanhe. Todo
  slider vem ladeado por dois botões de passo injetados em JS.

### Navigation
- **Abas** (app): retângulo de 5px, fundo `#12151c`, texto apagado. A ativa ganha fundo
  `surface-raised` e borda champanhe. Sem sublinhado, sem indicador deslizante.
- **Topo fixo** (landing): 58px, fundo `rgba(15,17,22,.86)` com `backdrop-filter: blur(10px)`,
  fio de cabelo embaixo.

### Ajuda em popover
O padrão que substituiu a prosa fixa no painel. Um `?` de 16px circular no `<legend>` de cada
seção abre um `<div popover>` nativo de 340px.

**A Regra do Popover Nativo.** Ajuda nunca usa `position: absolute`: o painel é
`overflow-y: auto` e recortaria. O popover nativo vai para a top layer e traz Esc e clique-fora
de graça. A posição é calculada em JS no `beforetoggle` e corrigida no `toggle`.

### Tira do processo
Assinatura da landing. Cinco quadros de proporção 1:1 em grade, ligados por chevrons de 8px, e
o quadro ativo ganha borda champanhe e fundo `surface-raised`. Acompanha a rolagem por
`IntersectionObserver` com `rootMargin: -45% 0px -45% 0px`.

### Troca de idioma
Duas bandeiras de 26×19px, em **SVG desenhado**. A inativa fica em `opacity: .45`; a ativa vai
a 1 e ganha borda champanhe, mais `aria-pressed`.

**A Regra da Bandeira Desenhada.** Nunca emoji de bandeira. 🇧🇷 e 🇺🇸 não renderizam no Windows,
onde o Chrome cai para as letras "BR" e "US".

## Do's and Don'ts

### Do:
- **Do** deixar a cor da tela vir do conteúdo. O acento cobre menos de 5% de qualquer viewport.
- **Do** medir contraste em pares renderizados, não no CSS. O piso é 4,5:1 para texto e 3:1
  para controle; o par mais baixo do sistema hoje é 5,43:1.
- **Do** tirar as superfícies do navegador da paleta: `accent-color` no `html`, `::selection`,
  `caret-color`, barra de rolagem e `:focus-visible`. É o sinal mais barato de que a página foi
  construída e não montada.
- **Do** usar `font-variant-numeric: tabular-nums` em toda medida, valor e tabela.
- **Do** pôr `min-width: 0` em todo container de flex que abrigue um `input[type=range]`.
- **Do** dar 24px de alvo aos controles de linha de camada, com o destrutivo separado por
  margem do resto.
- **Do** respeitar `prefers-reduced-motion` em toda transição, com alternativa de fade ou nada.

### Don't:
- **Don't** tintar os neutros na direção do acento. A tensão quente/frio é o efeito.
- **Don't** escolher acento amarelo-alaranjado: colidiria com o âmbar do `signal-warn`.
- **Don't** pôr prosa explicativa fixa no painel. Se depende do valor de um campo, é inline; se
  explica o que o campo faz, vai para o `?`.
- **Don't** usar `outline: none` sem pôr um anel de foco no lugar.
- **Don't** acrescentar webfont, CDN ou qualquer dependência externa. O projeto é
  zero dependências, e isso vale para a landing também.
- **Don't** usar emoji como sistema de ícone. Ícone é SVG desenhado, no mesmo peso de traço.
- **Don't** encomendar um quarto tamanho de fonte no painel sem justificativa escrita.
- **Don't** inventar prova: nenhuma foto, depoimento ou número de uso existe neste projeto, e
  toda imagem publicada tem que ser saída real do gerador.
