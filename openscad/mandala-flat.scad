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
// Furo
furo = 1;         // [0:Sem furo, 1:No topo (chaveiro), 2:No centro]

/* [Cores] */
cor_fundo = "#b02318";   // color
cor_fio   = "#f2c94c";   // color
cor_poca1 = "#e8833a";   // color
cor_poca2 = "#7a1f16";   // color

/* [Hidden] */
H   = 3.0;                       // espessura, fixa: peça chapada
R   = diametro / 2;
FIO = max(0.8, R * 0.018);       // largura do filete, acompanha o tamanho
NP  = 44;                        // pontos por lado nos motivos de perfil
EPS = 0.01;

// ---------------------------------------------------------------- dados
// camada = [motivo, mult, r0, r1, larg, base, ponta, nervuras, fase°, cor]
//          cor: 1 = poça 1, 2 = poça 2
// As receitas vêm dos presets do gerador (mandala-cloisonne.html:1926-2043),
// menos as camadas de fundo (o `anel` r0=0), que aqui são a própria placa.

LOTUS = [ 8, [
  ["folha", 1, 0.20, 0.94, 1.05, 0.70, 1.30, 0, 22.5, 1],
  ["folha", 1, 0.14, 0.70, 1.05, 0.70, 1.20, 4,  0.0, 2],
  ["gota",  1, 0.08, 0.34, 0.90, 0.45, 1.20, 0, 22.5, 1],
  ["ponto", 1, 0.00, 0.13, 2.00, 0.00, 0.00, 0,  0.0, 2],
]];

TALAVERA = [ 12, [
  ["cunha",   1, 0.60, 0.95, 0.90, 1.20, 0.00, 3,  0.0, 1],
  ["arco",    1, 0.62, 0.72, 1.00, 0.00, 0.00, 0, 15.0, 2],
  ["losango", 1, 0.30, 0.62, 0.95, 0.00, 0.00, 0, 15.0, 1],
  ["ponto",   1, 0.34, 0.46, 0.30, 0.00, 0.00, 0,  0.0, 2],
  ["folha",   1, 0.10, 0.34, 1.00, 0.60, 1.10, 0,  0.0, 1],
  ["ponto",   1, 0.00, 0.11, 2.00, 0.00, 0.00, 0,  0.0, 2],
]];

RENDA = [ 16, [
  ["arco",  1, 0.74, 0.90, 1.00, 0.00, 0.00, 0,  0.00, 1],
  ["folha", 1, 0.40, 0.86, 0.95, 0.70, 1.20, 3, 11.25, 2],
  ["arco",  1, 0.44, 0.56, 1.00, 0.00, 0.00, 0,  0.00, 1],
  ["gota",  1, 0.14, 0.44, 0.90, 0.45, 1.20, 0, 11.25, 2],
  ["ponto", 1, 0.00, 0.16, 2.00, 0.00, 0.00, 0,  0.00, 1],
]];

SOL = [ 18, [
  ["cunha", 1, 0.46, 0.94, 0.85, 1.40, 0.00, 5,  0.0, 1],
  ["gota",  1, 0.34, 0.66, 0.80, 0.45, 1.30, 0, 10.0, 2],
  ["arco",  1, 0.26, 0.34, 1.00, 0.00, 0.00, 0,  0.0, 1],
  ["gota",  1, 0.17, 0.26, 0.90, 0.45, 1.10, 0,  0.0, 2],
]];

DES  = desenho == 1 ? LOTUS : desenho == 2 ? TALAVERA : desenho == 3 ? RENDA : SOL;
SYM  = DES[0];
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
  hw  = max(0.004 * R, larg * PI * mid / n);
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

// cápsula curvada: união de círculos ao longo do arco (não `hull`, que
// cortaria a borda interna em corda reta)
module m_arco(n, r0, r1, larg) {
  mid = (r0 + r1) / 2;
  half = (r1 - r0) / 2;
  spanA = max(0, larg * PI / n - half / mid);
  if (spanA <= 0) translate([mid, 0]) circle(r = half, $fn = 36);
  else for (k = [0 : 28])
    rotate((-spanA + 2 * spanA * k / 28) * 180 / PI)
      translate([mid, 0]) circle(r = half, $fn = 24);
}

module m_ponto(n, r0, r1, larg) {
  mid = (r0 + r1) / 2;
  half = (r1 - r0) / 2;
  hw = larg * PI * mid / n;
  translate([mid, 0]) circle(r = max(0.2, min(half, hw)), $fn = 40);
}

// a região 2D de UMA repetição da camada, já no eixo x+
module regiao_1(c) {
  mot = c[0]; r0 = c[2] * R; r1 = c[3] * R; larg = c[4];
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

// nervuras: `linhas` traços transversais dentro do motivo. O original os
// cisalha em galão quando `incl > 0`; aqui saem retos — simplificação
// registrada no README.
module nervuras(c) {
  L = c[7];
  if (L > 0) {
    r0 = c[2] * R; r1 = c[3] * R;
    intersection() {
      regiao(c);
      union() for (k = [1 : L]) {
        rr = r0 + (r1 - r0) * k / (L + 1);
        difference() {
          circle(r = rr + FIO / 2, $fn = 160);
          circle(r = rr - FIO / 2, $fn = 160);
        }
      }
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

module poca_visivel(i) {
  difference() {
    offset(r = -FIO) regiao(CAMS[i]);
    acima(i);
  }
}

module fio_visivel(i) {
  difference() {
    union() {
      difference() { regiao(CAMS[i]); offset(r = -FIO) regiao(CAMS[i]); }
      nervuras(CAMS[i]);
    }
    acima(i);
  }
}

module tudo() { for (i = [0 : len(CAMS) - 1]) regiao(CAMS[i]); }

// ---------------------------------------------------------------- furos
module furos() {
  if (furo == 2) translate([0, 0, -EPS]) cylinder(h = H + 2 * EPS, d = max(3, R * 0.10), $fn = 48);
  if (furo == 1) translate([0, R * 0.90, -EPS]) cylinder(h = H + 2 * EPS, d = max(3, R * 0.07), $fn = 40);
}

// ---------------------------------------------------------------- peça
// Um color() por cor, o for dentro. Sai um sólido fechado por cor.

color(cor_fundo)
  difference() {
    linear_extrude(height = H)
      difference() { circle(r = R, $fn = 220); tudo(); }
    furos();
  }

color(cor_fio)
  difference() {
    linear_extrude(height = H)
      for (i = [0 : len(CAMS) - 1]) fio_visivel(i);
    furos();
  }

color(cor_poca1)
  difference() {
    linear_extrude(height = H)
      for (i = [0 : len(CAMS) - 1]) if (CAMS[i][9] == 1) poca_visivel(i);
    furos();
  }

color(cor_poca2)
  difference() {
    linear_extrude(height = H)
      for (i = [0 : len(CAMS) - 1]) if (CAMS[i][9] == 2) poca_visivel(i);
    furos();
  }
