---
target: mandala-cloisonne.html (Mandala Forge)
total_score: 22
p0_count: 0
p1_count: 2
timestamp: 2026-08-23T19-36-57Z
slug: mandala-cloisonne-html
---
⚠️ DEGRADED: single-context (as instruções desta sessão proíbem abrir sub-agentes sem pedido explícito do usuário; A e B rodaram em contexto único)

## Design Health Score

| # | Heurística | Nota | Problema principal |
|---|-----------|-------|--------------|
| 1 | Visibilidade do estado | 3 | Preview ao vivo, HUD, badges e "gerando…" cobrem quase tudo |
| 2 | Sistema × mundo real | 3 | Vocabulário do ofício está certo (filete, poça, esmalte); "Nível", "Degrau", "Mult" exigem o doc |
| 3 | Controle e liberdade | 1 | **Não existe desfazer em lugar nenhum.** Apagar camada e reduzir cores são destrutivos e irreversíveis |
| 4 | Consistência | 3 | Cinco formatos de botão (.tab, .preset, .pal, .seg, .act) para quatro funções |
| 5 | Prevenção de erro | 2 | Ótima na geometria (parede fina, sem aro, não cabe na mesa); zero nas ações destrutivas |
| 6 | Reconhecer em vez de lembrar | 2 | Lista mostra "Losango / Losango / Cunha / Cunha" — indistinguíveis sem expandir |
| 7 | Flexibilidade e eficiência | 2 | Nenhum atalho de teclado. Reordenar camada é um clique por posição |
| 8 | Estética e minimalismo | 1 | **36% do painel é prosa explicativa.** O fieldset Cores é 61% texto |
| 9 | Recuperação de erro | 2 | Exportação trata falha; o resto não tem volta |
| 10 | Ajuda e documentação | 3 | Abundante e contextual — o problema é ser permanente, não ausente |
| **Total** | | **22/40** | **Aceitável — precisa de melhorias antes de o usuário ficar satisfeito** |

## Veredito de anti-padrões

**Avaliação visual**: o desenho **passa** em todas as proibições absolutas. Sem texto em gradiente, sem glassmorfismo, sem grade de cards idênticos, sem eyebrow em caixa alta acima de cada seção, sem borda lateral colorida, sem métrica-herói. Paleta contida: um acento (#c07ad8) usado só para ação primária e estado ativo. Contraste medido em 17 pares: **todos passam em AA**, o mais baixo em 5,43:1. Numerais tabulares nos valores. Isso é trabalho de quem sabe o que está fazendo — o visual não denuncia IA.

**O que denuncia é o texto.** 518 palavras de prosa explicativa permanente, distribuídas em 17 parágrafos que nunca somem. Sete travessões, todos na mesma construção "oração — elaboração". Vinte e dois negritos dentro dos hints, quatro deles no padrão «**Termo** verbo definição» aberto exatamente igual. Nenhuma ferramenta real escreve assim no painel: isso vai para um `?`, um popover, ou a documentação.

**Varredura determinística**: 2 achados, ambos confirmados.
- `em-dash-overuse` — 8 travessões em texto corrido. **Verdadeiro**, e é o tell mais direto.
- `flat-type-hierarchy` — 10, 11, 11.5, 12 e 14px. Cinco tamanhos espremidos em 4px de amplitude. **Verdadeiro**: o nome do produto (14px) é o segundo menor texto da tela.

**Overlays visuais**: não injetados — a avaliação B rodou em contexto único, sem live-server.

## Impressão geral

O motor é excelente e a interface não faz jus a ele. O painel funciona, respira e tem contraste de verdade, mas está soterrado em explicação: 2,8 telas de rolagem, das quais mais de um terço é texto que o usuário lê uma vez e nunca mais. E a coisa mais cara está ausente — **não há desfazer**, num app onde apagar uma camada é um alvo de 11 pixels colado no de duplicar.

Maior oportunidade: tirar a prosa do fluxo e colocar undo. As duas coisas são o mesmo movimento — confiar no usuário.

## O que está funcionando

- **Contraste e legibilidade.** 17 pares medidos, nenhum abaixo de 4,5:1. O erro mais comum de UI gerada (cinza claro "por elegância") não está aqui.
- **Os avisos de geometria.** "Parede de 0.4 mm entre o furo e a borda — abaixo de 0,8 mm a peça rasga ao pendurar" diz o problema, o número e a consequência física. É prevenção de erro de nível alto, e é conhecimento de domínio que nenhum gerador inventa.
- **Densidade honesta.** É um painel de ferramenta com muitos parâmetros e não finge ser outra coisa. Sliders com ±, hex ao lado de cada cor, numerais tabulares.

## Problemas prioritários

### [P1] 36% do painel é prosa permanente
17 parágrafos, 518 palavras, sempre visíveis. O fieldset **Cores** sozinho tem 833px de altura, dos quais 510px (61%) são oito hints empilhados — é mais alto que a seção **Camadas** inteira (287px), que é onde o trabalho acontece.
**Por que importa**: empurra os controles para fora da tela, e é o que faz a interface parecer escrita por uma IA. Depois da primeira leitura vira ruído puro.
**Correção**: um `?` por fieldset abrindo popover, ou `<details>` fechado. Manter inline **só** os avisos condicionais (parede fina, não cabe na mesa) — esses são estado, não documentação.
**Comando**: `/impeccable distill`

### [P1] Não existe desfazer, e apagar camada é um alvo de 11px
Os controles da linha de camada medem 16×12, 16×12, 14×12, 11×12 e 13×13 px, encostados uns nos outros. O `×` (apagar) fica colado no `⧉` (duplicar), não pede confirmação e não tem volta. "Reduzir cores" idem — o hint chega a admitir "não tem desfazer: salve o .json antes".
**Por que importa**: perda de trabalho por um clique de 11 pixels. Documentar a ausência de undo não substitui o undo.
**Correção**: pilha de undo (Ctrl+Z) sobre snapshots do `cfg`; enquanto isso não existe, alvos de 24px mínimo e o `×` separado do resto.
**Comando**: `/impeccable harden`

### [P2] Cadência de texto denuncia a autoria
Sete travessões em "oração — elaboração", quatro hints abrindo em «**Termo** verbo definição», 22 negritos em 17 parágrafos.
**Por que importa**: é o tell. O visual não entrega, o texto entrega.
**Correção**: cortar travessão para ponto ou dois-pontos; variar a abertura das frases; negrito só onde nomeia um controle da tela.
**Comando**: `/impeccable clarify`

### [P2] A lista de camadas não distingue as camadas
"Anel, Losango, Cunha, Losango, Cunha" — dois pares idênticos. O `meta` mostra só `10x`/`20x`. O que separa uma da outra é a faixa radial, que só aparece expandindo.
**Por que importa**: reordenar e editar exige abrir e fechar até achar. É recall onde deveria ser reconhecimento.
**Correção**: pôr a faixa radial no cabeçalho (`Losango 20× · 0.24–0.40`), e um traço mostrando a posição no raio.
**Comando**: `/impeccable layout`

### [P3] Hierarquia tipográfica achatada
10 / 11 / 11.5 / 12 / 14px. O nome do produto é o segundo menor texto da interface, em caixa alta a 14px.
**Por que importa**: nada guia o olho; tudo tem o mesmo peso.
**Correção**: cortar para três degraus (11 / 13 / 17) e deixar o h1 respirar.
**Comando**: `/impeccable typeset`

## Bandeiras vermelhas por persona

**Alex (usuário avançado)**: nenhum atalho de teclado — nem Ctrl+Z, nem alternar aba, nem exportar. Reordenar uma camada da posição 5 para a 1 são quatro cliques num alvo de 16×12px. Vai querer editar o `.json` na mão em vez de usar o painel.

**Sam (dependente de acessibilidade)**: o cabeçalho de camada é uma `<div>` sem `role` nem `tabindex` — **expandir e recolher camada não é alcançável por teclado**. `.hexin:focus{outline:none}` remove o anel de foco do campo hex sem pôr nada no lugar. Os botões ▲▼⧉× têm só `title`, sem `aria-label`. O anel de foco no resto é o azul padrão do Chrome, nunca desenhado.

**Riley (testador metódico)**: reduzir cores num desenho já reduzido diz "nada a fundir" — bom. Mas apagar a última camada é bloqueado silenciosamente (`cfg.camadas.length > 1`) sem dizer por quê. Reordenar a pilha depois de reduzir cores pode ressuscitar uma cor escondida, e o hint avisa em vez de o app tratar.

## Observações menores

- Cinco vocabulários de botão para quatro funções: `.tab` e `.seg` (raio 5), `.preset` e `.pal` (raio 99), `.act` (raio 5). Dois bastam.
- Três sliders seguidos marcando "sem" (Cone, Furo, Pendurar) — o painel parece morto ali, e nada sugere o que fariam.
- Sete controles na barra inferior, com o primário ("Baixar modelo") em quarto lugar, do mesmo tamanho que três botões fantasma.
- Uma única `transition` no arquivo inteiro (a seta da camada) e **nenhum** `prefers-reduced-motion`. Não é falta grave num app de ferramenta, mas o zoom e a troca de aba mudam o enquadramento sem nenhuma continuidade visual.
- `.hint.warn:empty{display:none}` é um bom detalhe — o aviso some sozinho quando não há o que dizer.

## Perguntas que valem a pena

- O que aconteceria se o painel abrisse **sem nenhum hint** e a ajuda ficasse num `?` por seção? Quantas telas de rolagem sobrariam?
- Undo seria caro aqui? O `cfg` inteiro é serializável e cabe em memória — uma pilha de 30 estados custa quase nada.
- A lista de camadas é uma lista, ou é um diagrama radial? O desenho é radial; a pilha é o único lugar do app que não é.
