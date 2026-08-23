# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS, zero dependências, sem build e sem CDN. Não foi uma escolha nova: é a
convenção que o projeto inteiro já segue (`mandala-cloisonne.html` é um arquivo único de
331 kB que roda sozinho), e a landing page viaja na mesma pasta que ele.

## Users

Duas audiências, nesta ordem de entrada:

1. **Quem quer o objeto.** Chega sem contexto de impressão 3D, atraído pela peça: uma mandala
   de parede em relevo, no estilo cloisonné. Precisa entender em segundos o que é e ver que
   consegue desenhar a sua.
2. **Quem imprime em 3D.** Já tem impressora, provavelmente Bambu com AMS. É quem converte:
   o que o convence é 3MF com uma peça por extrusor, sem diálogo de importação, e sem gastar
   purga à toa.

## Product Purpose

Desenhar uma mandala em relevo no navegador e sair com um arquivo que imprime **colorido**
sem passo manual no fatiador. Sucesso é a pessoa abrir o app, mexer em quatro sliders e
baixar um 3MF que o Bambu Studio abre já com as cores nos extrusores certos.

## Positioning

O mecanismo que um vizinho não copiaria de graça: a peça é gerada por **distância assinada
por região**, não por campo de altura somado, e é exportada por **curvas de nível** em vez de
malha por grade. Disso saem duas coisas que gerador de mandala não costuma ter: borda lisa
(sem escada de célula) e **um sólido fechado por cor**, que é o que permite mapear peça para
extrusor de forma determinística.

## Operating Context

- Roda **online**, no navegador, sem instalar nada e sem baixar arquivo. O index e o app são
  publicados juntos num host estático; o botão da página é um link relativo para o app.
- Saída para **Bambu Studio** (H2C, A1, P1S, X1 Carbon), em 3MF de projeto ou OBJ+MTL.
- Existe uma segunda via de exportação por linha de comando (`exportar.py`), para quem quer
  grade mais fina. É detalhe para usuário avançado, não argumento de página.

## Capabilities and Constraints

- Sete motivos, cinco preenchimentos, camadas empilháveis com ordem de pintura.
- Nove paletas prontas; redução de cores por fusão em Lab, mirando os 4 slots do AMS.
- Base sólida numa cor só: corta o filamento colorido de 31,9 cm³ para 8,9 cm³ no preset
  padrão. É número medido, não estimativa.
- Furo passante para pendurar; cone e furo cego para vareta de incenso.
- Desfazer com ⌘Z. Zoom e panorâmica nas três vistas. Snapshot PNG.
- **Sem `localStorage`** em todo o projeto: preferência de idioma vive na URL (`?lang=`).
- Interface bilíngue pt-BR / inglês.

## Brand Commitments

- Nome: **Mandala Forge**. O arquivo continua `mandala-cloisonne.html`; o nome exibido é o
  outro.
- Acento **champanhe** (`#d2c2a4`) sobre neutro frio quase-preto, escolhido do assunto
  (cloisonné é fio de metal represando esmalte). Não tinte os neutros para "combinar": a
  tensão quente/frio é o efeito.
- Cromática baixa no cromo, porque o conteúdo é a mandala colorida.
- Bandeiras Brasil/EUA como troca de idioma, em SVG desenhado.

## Evidence on Hand

- O gerador funcionando: `mandala-cloisonne.html`, com nove paletas e seis presets.
- **Nenhuma foto, nenhum depoimento, nenhum número de usuário, nenhum caso de uso real.**
  A foto de referência do incensário que originou o projeto foi apagada do repositório.
  Toda imagem da página tem que ser **saída de verdade do próprio gerador**; não fabricar
  fotografia de peça impressa, nem prova social.
- Números que existem e são medidos: 31,9 → 8,9 cm³ de filamento colorido; quatro
  impressoras validadas fatiando com `return_code: 0` no CLI do Bambu.

## Product Principles

1. **A prova é o próprio output.** Sem foto de banco de imagem e sem mockup: o que a página
   mostra é o que o gerador produz.
2. **Não inventar tração.** Sem depoimento, sem contador de usuários, sem logo de cliente.
3. **O objeto primeiro, a técnica depois.** Quem chega sem contexto tem que entender a peça
   antes de encontrar a palavra "extrusor".
4. **Nada para baixar, nada para instalar.** A distância entre a página e a primeira mandala
   é um clique.
5. **Bilíngue de verdade**, pelo mesmo mecanismo do app, com o idioma atravessando o link.

## Accessibility & Inclusion

Contraste AA como piso, foco visível desenhado no teclado, e nada comunicado só por cor.
É o padrão que o app já cumpre e a página não pode rebaixar.
