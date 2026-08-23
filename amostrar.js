// Amostra o desenho numa grade cartesiana e grava um mapa de REGIÕES.
//
// Serve de ponte para exportar.py: o núcleo em JS continua sendo a única fonte
// da matemática do desenho — aqui só avaliamos e despejamos o resultado. Nada
// de fórmula reimplementada em Python, que sairia de sincronia na primeira
// mudança.
//
//   node amostrar.js config.json saida.bin [--grade 2400] [--sub 3]
//
// Uma "região" é uma cor entre duas cotas (z0 até altura). O contorno de cada região é o que o
// Python transforma em sólido extrudado.
//
// Formato do .bin:
//   uint32  magic 'MCR3'
//   uint32  N            lado da grade (N x N)
//   float32 quadro       mm — meia-largura do quadro amostrado
//   float32 raio         mm — raio real da peça (o disco é recortado nele)
//   uint32  nRegioes
//   por região: float32 altura, uint8 r, g, b, uint8 pad, float32 z0
//               (z0 é a cota do FUNDO: 0 no normal, topo da base com baseSolida)
//   uint16  N*N*nRegioes ... NÃO: cobertura por região é grande demais.
//   Em vez disso: uint8 N*N*nRegioes com a cobertura 0..255 de cada região.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

function lerHTML() {
  return fs.readFileSync(path.join(__dirname, 'mandala-cloisonne.html'), 'utf8');
}

function carregarNucleo(html) {
  const core = html.match(/<script id="mandala-core">([\s\S]*?)<\/script>/);
  if (!core) throw new Error('núcleo não encontrado no HTML');
  const ctx = { console, TextEncoder, TextDecoder, Blob, Response, CompressionStream };
  vm.createContext(ctx);
  vm.runInContext(core[1] + '\nthis.MC = MC;', ctx);
  return ctx.MC;
}

// Os presets moram no bloco de UI, que depende de DOM. Em vez de duplicá-los,
// recorta só o literal `var PRESETS = {...};` e avalia com MC e C à mão.
function carregarPreset(html, MC, nome) {
  const bloco = html.match(/var PRESETS = \{[\s\S]*?\n  \};/);
  if (!bloco) throw new Error('bloco PRESETS não encontrado');
  const ctx = { MC, C: MC.camada, PALETAS: [], Math, JSON, console };
  vm.createContext(ctx);
  vm.runInContext(bloco[0] + '\nthis.PRESETS = PRESETS;', ctx);
  const p = ctx.PRESETS[nome];
  if (!p) throw new Error('preset desconhecido: ' + nome + ' (há: ' + Object.keys(ctx.PRESETS).join(', ') + ')');
  return Object.assign(MC.defaults(), p());
}

function argumento(nome, padrao) {
  const i = process.argv.indexOf('--' + nome);
  return i >= 0 ? Number(process.argv[i + 1]) : padrao;
}

function main() {
  const html = lerHTML();
  const MC = carregarNucleo(html);
  const entrada = process.argv[2], saida = process.argv[3] || 'grade.bin';
  const N = argumento('grade', 2400);
  const SUB = argumento('sub', 3);                                   // sub-amostras por eixo

  let cfg;
  if (entrada && entrada.startsWith('preset:')) {
    cfg = carregarPreset(html, MC, entrada.slice(7));
  } else {
    cfg = MC.defaults();
    if (entrada && entrada !== '-') Object.assign(cfg, JSON.parse(fs.readFileSync(entrada, 'utf8')));
  }
  if (cfg.camadas) cfg.camadas = cfg.camadas.map(c => MC.camada(c));

  const R = cfg.diam / 2;
  const P = MC.prepare(cfg);                                         // sem `res`: transição fina
  const quadro = R * 1.001;
  const passo = (2 * quadro) / N;
  const o = {};

  // ---- descobre as regiões (cor, altura) presentes ----
  const chave = new Map(), regioes = [];
  function idRegiao(cor, z, z0) {
    if (z <= z0 + 1e-6) return -1;                                   // espessura nula
    const k = cor + '@' + z.toFixed(4) + '@' + z0.toFixed(4);
    let id = chave.get(k);
    if (id === undefined) { id = regioes.length; regioes.push({ cor, z, z0 }); chave.set(k, id); }
    return id;
  }
  function corDe(s) {
    if (s.id < 0) return cfg.corBase;
    if (s.fio >= 0.5) return cfg.corFio;
    if (s.banda % 2 === 1 && s.cor2) return s.cor2;
    return s.cor;
  }

  // A altura é contínua por causa da borda macia do filete; para virar região
  // ela precisa voltar a ser discreta — cada região vira um sólido extrudado de
  // altura única. Volta aos dois níveis reais: poça e poça + filete.
  // Placa e aro (id < 0) já são planos, então valem pelo valor real.
  function alturaDiscreta(s, zReal) {
    if (s.id < 0) return zReal;
    return base + s.nivel * cfg.degrau + (s.fio >= 0.5 ? cfg.fioH : 0);
  }
  // Com `baseSolida` a base sai numa cor só, de 0 até `base`, e o desenho é
  // extrudado do topo dela para cima — o mesmo que `cobertura()` faz no HTML.
  const base = cfg.base, solida = !!cfg.baseSolida;

  const total = N * N;
  const acumulado = [];                                              // por região: Uint16Array
  const t0 = Date.now();
  const passoSub = passo / SUB;

  for (let iy = 0; iy < N; iy++) {
    const y0 = -quadro + iy * passo;
    for (let ix = 0; ix < N; ix++) {
      const x0 = -quadro + ix * passo;
      for (let sy = 0; sy < SUB; sy++) {
        const y = y0 + (sy + 0.5) * passoSub;
        for (let sx = 0; sx < SUB; sx++) {
          const x = x0 + (sx + 0.5) * passoSub;
          const rr = Math.sqrt(x * x + y * y);
          if (rr > R) continue;
          const th = Math.atan2(y, x);
          if (!MC.solid(cfg, P, rr, th, o)) continue;
          // o cone é curvo: não vira região extrudada, sai à parte
          if (cfg.cone > 0 && rr < cfg.cone / 2) continue;
          const zReal = MC.altura(cfg, P, rr, th, o);
          const z = alturaDiscreta(o, zReal), cor = corDe(o);
          const cel = iy * N + ix;
          const ids = solida ? [idRegiao(cfg.corBase, base, 0), idRegiao(cor, z, base)]
                             : [idRegiao(cor, z, 0)];
          for (const id of ids) {
            if (id < 0) continue;
            while (acumulado.length <= id) acumulado.push(new Uint16Array(total));
            acumulado[id][cel]++;
          }
        }
      }
    }
    if (iy % 200 === 0) process.stderr.write('  linha ' + iy + '/' + N + '\r');
  }

  // ---- grava ----
  const nR = regioes.length;
  const cab = Buffer.alloc(20 + nR * 12);
  cab.write('MCR3', 0, 'ascii');
  cab.writeUInt32LE(N, 4);
  cab.writeFloatLE(quadro, 8);
  cab.writeFloatLE(R, 12);
  cab.writeUInt32LE(nR, 16);
  regioes.forEach((r, i) => {
    const off = 20 + i * 12;
    cab.writeFloatLE(r.z, off);
    cab.writeFloatLE(r.z0 || 0, off + 8);
    const h = r.cor.replace('#', '');
    cab.writeUInt8(parseInt(h.substr(0, 2), 16), off + 4);
    cab.writeUInt8(parseInt(h.substr(2, 2), 16), off + 5);
    cab.writeUInt8(parseInt(h.substr(4, 2), 16), off + 6);
    cab.writeUInt8(0, off + 7);
  });

  const cobertura = Buffer.alloc(total * nR);
  const maxSub = SUB * SUB;
  for (let k = 0; k < nR; k++)
    for (let p = 0; p < total; p++)
      cobertura[k * total + p] = Math.round(255 * acumulado[k][p] / maxSub);

  fs.writeFileSync(saida, Buffer.concat([cab, cobertura]));
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.error('');
  console.log(JSON.stringify({
    grade: N, sub: SUB, regioes: nR, segundos: +dt,
    arquivo: saida, bytes: 20 + nR * 12 + total * nR,
    // devolve o que o Python precisa para montar o cone — assim a config é
    // resolvida num lugar só, seja ela um .json ou um preset do HTML
    cfg: {
      diam: cfg.diam, base: cfg.base, corBase: cfg.corBase,
      cone: cfg.cone, coneH: cfg.coneH, coneC: cfg.coneC,
      furo: cfg.furo, furoP: cfg.furoP
    },
    detalhe: regioes.map(r => ({ cor: r.cor, z: +r.z.toFixed(2), z0: +(r.z0 || 0).toFixed(2) }))
  }, null, 1));
}

main();
