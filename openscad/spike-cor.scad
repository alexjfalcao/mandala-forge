/* =========================================================================
   SPIKE — não é o modelo, é o teste que decide se o modelo é possível.

   A dúvida: o OpenSCAD faz union implícito dentro de `for`, e há relato de
   que isso funde tudo num objeto só no 3MF — as cores aparecem no prato mas
   todas as partes caem no filamento 1, sem reatribuição possível. A flag
   `--enable=lazy-union`, que resolveria, não existe no Parametric Model Maker.
   Uma mandala é `for` radial por definição, então isso nos acerta em cheio.

   A hipótese a testar: agrupar por COR no topo (`color(c) for(...)`) em vez
   de trocar de cor dentro do laço produz um sólido fechado por cor — a mesma
   invariante que o gerador principal já persegue.

   Como usar: subir no PMM, gerar o 3MF, abrir no Bambu Studio e conferir
     1. aparecem TRÊS filamentos em Project Filaments?
     2. dá para reatribuir o filamento de cada anel independentemente?
     3. quanto tempo o backend levou?

   De quebra testa se a anotação `// color` vira mesmo seletor na tela.
   ========================================================================= */

/* [Cores] */
cor_fundo = "#b02318";   // color
cor_petala = "#f2c94c";  // color
cor_ponto = "#e8833a";   // color

/* [Peça] */
diametro = 60;           // [40:150]
repeticoes = 12;         // [6:24]

/* [Hidden] */
H = 3;                   // espessura, fixa
R = diametro / 2;

r_ponto  = R * 0.72;
rad_ponto = R * 0.10;
r_petala = R * 0.40;

module ponto2d()
  translate([r_ponto, 0]) circle(r = rad_ponto, $fn = 48);

module petala2d()
  translate([r_petala, 0]) scale([1, 0.42]) circle(r = R * 0.26, $fn = 64);

// os dois anéis, cada um como um módulo próprio: é o mesmo `for` que o
// modelo real vai usar, e é justamente ele que está sob suspeita
module anel_pontos()
  for (i = [0 : repeticoes - 1]) rotate(i * 360 / repeticoes) ponto2d();

module anel_petalas()
  for (i = [0 : repeticoes - 1]) rotate(i * 360 / repeticoes + 180 / repeticoes) petala2d();

// ---- um `color()` no topo por cor, e o `for` DENTRO dele ----------------

// fundo: a placa com as regiões dos outros dois vazadas, para os três
// sólidos se encaixarem sem se sobrepor e o topo ficar plano
color(cor_fundo)
  linear_extrude(height = H)
    difference() {
      circle(r = R, $fn = 180);
      anel_petalas();
      anel_pontos();
    }

color(cor_petala) linear_extrude(height = H) anel_petalas();
color(cor_ponto)  linear_extrude(height = H) anel_pontos();
