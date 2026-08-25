/* =========================================================================
   MANDALA CHAPADA — versão OpenSCAD do Mandala Forge, para o Parametric
   Model Maker da MakerWorld.

   Quatro desenhos fixos, sem relevo: as cores são regiões coplanares que se
   encaixam num topo liso. A pessoa escolhe tamanho, furo e as quatro cores na
   própria tela de customização.

   NÃO é um porte do gerador. O original decide a forma por distância assinada
   e exporta por curvas de nível; aqui tudo é CSG. As formas são as mesmas
   sete, reescritas como polígono/círculo exatos — o campo de distância nunca
   foi necessário para as REGIÕES, só para o filete (que aqui é `offset()`).

   O que ficou de fora, e por quê:
     · relevo do filete  — é o pedido: chapado
     · cone central      — é relevo
     · preenchimento "contornos" — offsets aninhados, candidato a estourar o
       timeout do backend
     · modo vazado do `renda` — v1 sai com fundo; ver README

   Estrutura: um `color()` no topo por cor, com o `for` DENTRO. Sai um sólido
   por cor. Ver openscad/README.md para a medição que justifica isso.
   ========================================================================= */

/* [Desenho] */
// Qual mandala
desenho = 1;      // [1:Lótus, 2:Talavera, 3:Renda, 4:Sol]
// Diâmetro da peça, em mm
diametro = 100;   // [40:150]
// Borda lisa em volta, em mm — aumente se o furo estiver tocando o desenho
borda = 2;        // [0:10]
// Espessura da peça, em mm
espessura = 3;    // [2:0.5:6]
// Mais ou menos repetições em volta, a partir da simetria do desenho
repeticoes = 0;   // [-4:4]

/* [Furo] */
// Onde
furo = 1;         // [0:Sem furo, 1:No topo (chaveiro), 2:No centro]
// Diâmetro do furo, em mm
furo_d = 3.5;     // [2.5:0.5:6]

/* [Cores] */
cor_fundo = "#b02318";   // color
cor_fio   = "#f2c94c";   // color
cor_poca1 = "#e8833a";   // color
cor_poca2 = "#7a1f16";   // color

/* [Hidden] */
H   = espessura;
R   = diametro / 2;              // raio da PEÇA
// Raio do DESENHO. A borda não recorta os motivos: ela encolhe o desenho, para
// cada mandala manter as próprias proporções dentro da moldura. Recortar
// cortaria a ponta das pétalas na moldura, o que muda o desenho.
Rd  = max(R * 0.35, R - borda);
FIO = max(0.8, Rd * 0.018);      // largura do filete, acompanha o desenho
NP  = 44;                        // pontos por lado nos motivos de perfil
EPS = 0.01;

// ---------------------------------------------------------------- dados
// camada = [motivo, mult, r0, r1, larg, base, ponta, nervuras, fase°, cor, incl]
//          cor: 1 = poça 1, 2 = poça 2
//          incl: cisalhamento das nervuras em galão (0 = traços retos)
// As receitas vêm dos presets do gerador (mandala-cloisonne.html:1926-2043),
// menos as camadas de fundo (o `anel` r0=0), que aqui são a própria placa.

LOTUS = [ 8, [
  ["folha", 1, 0.20, 0.94, 1.05, 0.70, 1.30, 0, 22.5, 1, 0.0],
  ["folha", 1, 0.14, 0.70, 1.05, 0.70, 1.20, 4,  0.0, 2, 0.9],
  ["gota",  1, 0.08, 0.34, 0.90, 0.45, 1.20, 0, 22.5, 1, 0.0],
  ["ponto", 1, 0.00, 0.13, 2.00, 0.00, 0.00, 0,  0.0, 2, 0.0],
]];

TALAVERA = [ 12, [
  ["cunha",   1, 0.60, 0.95, 0.90, 1.20, 0.00, 3,  0.0, 1, 0.0],
  ["arco",    1, 0.62, 0.72, 1.00, 0.00, 0.00, 0, 15.0, 2, 0.0],
  ["losango", 1, 0.30, 0.62, 0.95, 0.00, 0.00, 0, 15.0, 1, 0.0],
  ["ponto",   1, 0.34, 0.46, 0.30, 0.00, 0.00, 0,  0.0, 2, 0.0],
  ["folha",   1, 0.10, 0.34, 1.00, 0.60, 1.10, 0,  0.0, 1, 0.0],
  ["ponto",   1, 0.00, 0.11, 2.00, 0.00, 0.00, 0,  0.0, 2, 0.0],
]];

RENDA = [ 16, [
  ["arco",  1, 0.74, 0.90, 1.00, 0.00, 0.00, 0,  0.00, 1, 0.0],
  ["folha", 1, 0.40, 0.86, 0.95, 0.70, 1.20, 3, 11.25, 2, 0.8],
  ["arco",  1, 0.44, 0.56, 1.00, 0.00, 0.00, 0,  0.00, 1, 0.0],
  ["gota",  1, 0.14, 0.44, 0.90, 0.45, 1.20, 0, 11.25, 2, 0.0],
  ["ponto", 1, 0.00, 0.16, 2.00, 0.00, 0.00, 0,  0.00, 1, 0.0],
]];

// O `sol` do gerador tem um cone de 20 mm no miolo. Cone é relevo e saiu —
// mas deixar o centro vazio abria um disco liso de 17% do raio. Entra um ponto
// central, que é como os outros três presets já fecham o desenho.
SOL = [ 18, [
  ["cunha", 1, 0.46, 0.94, 0.85, 1.40, 0.00, 5,  0.0, 1, 0.3],
  ["gota",  1, 0.34, 0.66, 0.80, 0.45, 1.30, 0, 10.0, 2, 0.0],
  ["arco",  1, 0.26, 0.34, 1.00, 0.00, 0.00, 0,  0.0, 1, 0.0],
  ["gota",  1, 0.17, 0.26, 0.90, 0.45, 1.10, 0,  0.0, 2, 0.0],
  ["ponto", 1, 0.00, 0.14, 2.00, 0.00, 0.00, 0,  0.0, 1, 0.0],
]];

DES  = desenho == 1 ? LOTUS : desenho == 2 ? TALAVERA : desenho == 3 ? RENDA : SOL;
// Repetições relativas, não absolutas: a largura de cada motivo é calculada a
// partir de `n`, e os presets estão afinados para a simetria deles. Solto, o
// lótus em 24 vira teia e a renda em 6 vira quatro riscos perdidos.
SYM  = max(4, DES[0] + repeticoes);
CAMS = DES[1];

// ---------------------------------------------------------------- perfis
// w(t) da folha/gota: t^base * (1-t)^ponta, normalizado para valer 1 na
// barriga. É a `perfil()` do original (mandala-cloisonne.html:545-561).
function w_folha(t, b, p) =
  let (tm = b / (b + p), wm = pow(tm, b) * pow(1 - tm, p))
  wm <= 0 ? 0 : pow(t, b) * pow(1 - t, p) / wm;

// cunha: sobe reto de 0.45 até o ombro, cai reto até a ponta
function w_cunha(t, b) =
  let (tm = max(0.05, min(0.9, 1 - b / 2)))
  t < tm ? 0.45 + 0.55 * t / tm : (1 - t) / (1 - tm);

// losango: dois lados retos
function w_losango(t) = 1 - abs(2 * t - 1);

function w_de(mot, t, b, p) =
  mot == "cunha"   ? w_cunha(t, b) :
  mot == "losango" ? w_losango(t) :
                     w_folha(t, b, p);

// ---------------------------------------------------------------- motivos
// Todos em mm, centrados na origem, com o eixo em x+. A repetição radial e a
// fase ficam por conta de quem chama.

// contorno paramétrico: |lat| < hw*w(t), com lat medido como arco
module m_perfil(mot, n, r0, r1, larg, base, ponta) {
  mid = (r0 + r1) / 2;
  hw  = max(0.004 * Rd, larg * PI * mid / n);
  pts = concat(
    [ for (k = [0 : NP])
        let (t = k / NP, r = r0 + t * (r1 - r0), w = w_de(mot, t, base, ponta),
             a = r > 0.001 ? hw * w / r : 0)
        [r * cos(a * 180 / PI), r * sin(a * 180 / PI)] ],
    [ for (k = [NP - 1 : -1 : 1])
        let (t = k / NP, r = r0 + t * (r1 - r0), w = w_de(mot, t, base, ponta),
             a = r > 0.001 ? hw * w / r : 0)
        [r * cos(-a * 180 / PI), r * sin(-a * 180 / PI)] ]
  );
  polygon(pts);
}

// Cápsula curvada, como UM polígono fechado: arco externo, calota, arco
// interno, calota.
//
// A primeira versão unia 29 círculos ao longo do arco. Desenhava certo, mas
// criava dezenas de arestas coincidentes, e a união saía com ruído numérico
// diferente conforme o contexto booleano — o `teste-cores.scad` pegou isso como
// sobreposição entre fundo e filete em todos os desenhos que usam `arco`.
// `hull` também não serve: cortaria a borda interna em corda reta.
module m_arco(n, r0, r1, larg) {
  mid = (r0 + r1) / 2;
  half = (r1 - r0) / 2;
  spanA = max(0, larg * PI / n - half / mid);
  if (spanA <= 0 || mid - half <= 0.001) translate([mid, 0]) circle(r = half, $fn = 48);
  else {
    A = spanA * 180 / PI;                 // meia-abertura, em graus
    M = 30;                               // passos em cada arco
    C = 14;                               // passos em cada calota
    re = mid + half;
    ri = mid - half;
    cx1 = mid * cos(A);  cy1 = mid * sin(A);
    cx2 = mid * cos(-A); cy2 = mid * sin(-A);
    polygon(concat(
      [ for (k = [0 : M]) let (a = -A + 2 * A * k / M) [re * cos(a), re * sin(a)] ],
      [ for (k = [1 : C - 1]) let (b = A + 180 * k / C) [cx1 + half * cos(b), cy1 + half * sin(b)] ],
      [ for (k = [0 : M]) let (a = A - 2 * A * k / M) [ri * cos(a), ri * sin(a)] ],
      [ for (k = [1 : C - 1]) let (b = -A + 180 + 180 * k / C) [cx2 + half * cos(b), cy2 + half * sin(b)] ]
    ));
  }
}

module m_ponto(n, r0, r1, larg) {
  mid = (r0 + r1) / 2;
  half = (r1 - r0) / 2;
  hw = larg * PI * mid / n;
  translate([mid, 0]) circle(r = max(0.2, min(half, hw)), $fn = 40);
}

// meia-espessura do motivo: o menor entre metade da faixa radial e a
// meia-largura lateral. É o que limita o quanto de filete cabe.
function meia_de(c) =
  let (r0 = c[2] * Rd, r1 = c[3] * Rd, n = max(1, round(SYM * c[1])),
       mid = (r0 + r1) / 2,
       hw = max(0.004 * Rd, c[4] * PI * mid / n))
  min((r1 - r0) / 2, hw);

// Filete por camada, não global. Com FIO fixo, `offset(-FIO)` engolia o miolo
// dos motivos pequenos e eles viravam só contorno — fiel ao original, mas numa
// peça chapada de 40 mm isso fecha o desenho inteiro. Aqui o filete nunca passa
// de 40% da meia-espessura do motivo, com piso na menor linha que o bico de
// 0,4 imprime.
function fio_de(c) = max(0.45, min(FIO, 0.40 * meia_de(c)));

// a região 2D de UMA repetição da camada, já no eixo x+
module regiao_1(c) {
  mot = c[0]; r0 = c[2] * Rd; r1 = c[3] * Rd; larg = c[4];
  n = max(1, round(SYM * c[1]));
  if      (mot == "arco")  m_arco(n, r0, r1, larg);
  else if (mot == "ponto") m_ponto(n, r0, r1, larg);
  else                     m_perfil(mot, n, r0, r1, larg, c[5], c[6]);
}

// a camada inteira, repetida em volta
module regiao(c) {
  n = max(1, round(SYM * c[1]));
  for (i = [0 : n - 1]) rotate(i * 360 / n + c[8]) regiao_1(c);
}

// Nervuras: `linhas` traços atravessando o motivo. Duas correções sobre a
// primeira versão, que saía com traços retos e da largura do filete:
//   · largura própria, com piso de 0,8 mm — duas paredes de um bico 0,4. Com a
//     largura do filete elas imprimiam como fiapo e sumiam na peça;
//   · cisalhamento em galão (`incl`), como no original: o traço não é um arco
//     de raio constante, é um V, porque `t` desloca com |lat|.
// A banda é construída larga de propósito e recortada pela região depois.
NERV_W = max(0.8, FIO);

module nervura_1(c, k, L) {
  r0 = c[2] * Rd; r1 = c[3] * Rd; len = r1 - r0;
  n = max(1, round(SYM * c[1]));
  mid = (r0 + r1) / 2;
  hw = max(0.004 * Rd, c[4] * PI * mid / n);
  incl = c[10];
  t0 = k / (L + 1);
  M = 22;
  // linha de centro do traço, em (t, lat) mapeado para polar
  fora = [ for (j = [0 : M])
    let (u = -1 + 2 * j / M, lat = u * hw * 1.25,
         t = t0 + incl * abs(lat) / len,
         r = r0 + t * len + NERV_W / 2,
         a = r > 0.001 ? lat / r : 0)
    [r * cos(a * 180 / PI), r * sin(a * 180 / PI)] ];
  dentro = [ for (j = [M : -1 : 0])
    let (u = -1 + 2 * j / M, lat = u * hw * 1.25,
         t = t0 + incl * abs(lat) / len,
         r = r0 + t * len - NERV_W / 2,
         a = r > 0.001 ? lat / r : 0)
    [r * cos(a * 180 / PI), r * sin(a * 180 / PI)] ];
  polygon(concat(fora, dentro));
}

module nervuras(c) {
  L = c[7];
  if (L > 0) {
    n = max(1, round(SYM * c[1]));
    intersection() {
      regiao(c);
      union() for (i = [0 : n - 1]) rotate(i * 360 / n + c[8])
        for (k = [1 : L]) nervura_1(c, k, L);
    }
  }
}

// ---------------------------------------------------- pintura por camadas
// A ordem das camadas é ordem de pintura: a de cima cobre a de baixo. Em CSG
// isso vira "subtraia tudo que vem depois".
module acima(i) {
  if (i + 1 <= len(CAMS) - 1)
    for (j = [i + 1 : len(CAMS) - 1]) regiao(CAMS[j]);
}

// A poça precisa perder as nervuras da PRÓPRIA camada, não só as camadas de
// cima. Sem isso as nervuras existem mas ficam enterradas dentro da poça: dois
// sólidos de cores diferentes dividindo o mesmo volume — some na tela e sai um
// 3MF com sobreposição.
module poca_visivel(i) {
  difference() {
    offset(r = -fio_de(CAMS[i])) regiao(CAMS[i]);
    nervuras(CAMS[i]);
    acima(i);
  }
}

module fio_visivel(i) {
  f = fio_de(CAMS[i]);
  difference() {
    union() {
      difference() { regiao(CAMS[i]); offset(r = -f) regiao(CAMS[i]); }
      nervuras(CAMS[i]);
    }
    acima(i);
  }
}

module tudo() { for (i = [0 : len(CAMS) - 1]) regiao(CAMS[i]); }

// ---------------------------------------------------------------- furos
// O furo de pendurar mora no MEIO da borda. Na primeira versão ele ficava em
// 0.90 R com diâmetro fixo, o que caía sempre em cima do desenho: os motivos vão
// a 0.90–0.95 do raio nos quatro presets.
// ⚠️ Com `borda` pequena demais para o `furo_d` escolhido, ele volta a morder o
// desenho — a borda precisa de uns 3 mm a mais que o furo para ficar limpa.
module furos() {
  if (furo == 2)
    translate([0, 0, -EPS]) cylinder(h = H + 2 * EPS, d = furo_d, $fn = 48);
  if (furo == 1)
    translate([0, R - max(borda / 2, furo_d / 2 + 1.2), -EPS])
      cylinder(h = H + 2 * EPS, d = furo_d, $fn = 40);
}

// ---------------------------------------------------------------- peça
// Um corpo por cor, como módulo, para o teste poder intersectá-los dois a dois
// sem redesenhar a peça. `use <mandala-flat.scad>` importa os módulos sem
// executar a geometria de topo.

module corpo_fundo() {
  difference() {
    linear_extrude(height = H)
      difference() { circle(r = R, $fn = 220); tudo(); }
    furos();
  }
}

module corpo_fio() {
  difference() {
    linear_extrude(height = H)
      for (i = [0 : len(CAMS) - 1]) fio_visivel(i);
    furos();
  }
}

module corpo_poca(qual) {
  difference() {
    linear_extrude(height = H)
      for (i = [0 : len(CAMS) - 1]) if (CAMS[i][9] == qual) poca_visivel(i);
    furos();
  }
}

// Um color() no topo por cor, com o for dentro. Sai um sólido fechado por cor.
color(cor_fundo) corpo_fundo();
color(cor_fio)   corpo_fio();
color(cor_poca1) corpo_poca(1);
color(cor_poca2) corpo_poca(2);
