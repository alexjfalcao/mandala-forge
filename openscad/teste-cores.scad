/* Duas cores não podem dividir volume.
   É a invariante que este projeto quebrou uma vez: as nervuras existiam mas
   ficavam enterradas dentro da poça, dois sólidos ocupando o mesmo espaço.
   Some na tela e sai um 3MF com sobreposição.

   Uso: renderizar com um `par` de cada vez e conferir que o volume é ZERO.
     for p in 0 1 2 3 4 5; do openscad -o /dev/null -D par=$p -D desenho=1 \
       openscad/teste-cores.scad; done
   "Current top level object is empty" = passou. Qualquer geometria = falhou. */

par = 0;       // [0:fundo×fio, 1:fundo×poça1, 2:fundo×poça2, 3:fio×poça1, 4:fio×poça2, 5:poça1×poça2]
desenho = 1;   // [1:Lótus, 2:Talavera, 3:Renda, 4:Sol]
diametro = 100;
furo = 1;
cor_fundo = "#b02318"; cor_fio = "#f2c94c";
cor_poca1 = "#e8833a"; cor_poca2 = "#7a1f16";

use <mandala-flat.scad>

intersection() {
  if (par == 0 || par == 1 || par == 2) corpo_fundo();
  else if (par == 3 || par == 4) corpo_fio();
  else corpo_poca(1);

  if (par == 0) corpo_fio();
  else if (par == 1 || par == 3) corpo_poca(1);
  else corpo_poca(2);
}
