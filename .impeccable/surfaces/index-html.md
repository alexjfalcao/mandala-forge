---
version: 1
slug: "index-html"
primary_target: "index.html"
related_targets: []
---

Escopo: `index.html`, a landing page publicada ao lado do app. Modo: **persuade**.

Público, na ordem em que a página os encontra: quem quer o objeto (chega sem contexto de
impressão 3D) e depois quem imprime (converte por causa do 3MF por extrusor). A ação é uma
só: abrir `mandala-cloisonne.html`, na mesma pasta, com o `?lang=` carregado do index.

Prova disponível: **só saída real do gerador**. Não há foto, depoimento nem número de uso, e a
página não pode inventá-los. As 15 imagens saem de um renderizador em Node que carrega o
mesmo bloco `mandala-core` do app e escreve PNG com o `zlib` (fundo transparente, sem
dependência nova). Os números do quadro 5 vêm do CLI do Bambu Studio fatiando essa mesma peça:
`return_code: 0`, seis filamentos, 52,1 g, 253 min.

Direção travada pelo usuário: **tira do processo**, forma 6 de 7 na lista ordenada, seed
`a02cc703`. A página É o pipeline: cinco quadros em ordem (traço, filete, poças, peças,
fatiado), a tira fica no alto e acompanha a rolagem por IntersectionObserver, e cada quadro
abre em seção própria. Recusa o hero de claim seguido de grade de cards de ícone.

Momento memorável: o quadro 5. Depois de quatro quadros mostrando a peça, o último mostra o
fatiador entendendo o arquivo, com dado medido e não com adjetivo.

Mundo visual: herdado do app, sem invenção. Quase-preto frio, acento champanhe como única cor
de ação, sans do sistema. A cor da página vem das mandalas em PNG transparente. Sem webfont,
porque o projeto é zero dependências e sem CDN — o peso de display vem de escala e tracking.

Em aberto: não há DESIGN.md no projeto. O mundo está no código dos dois arquivos e é coerente,
mas não está documentado.
