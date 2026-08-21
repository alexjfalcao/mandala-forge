// Testa o núcleo extraído do HTML: malha estanque, sem NaN, sem degenerados.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'mandala-stl.html'), 'utf8');
const m = html.match(/<script id="mandala-core">([\s\S]*?)<\/script>/);
if (!m) { console.error('núcleo não encontrado'); process.exit(1); }
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(m[1] + '\nthis.MD = MD;', ctx);
const MD = ctx.MD;

function clone(o) { return JSON.parse(JSON.stringify(o)); }

const cases = [];

// 1) padrão, relevo sólido
cases.push(['padrão relevo', MD.defaults()]);

// 2) relevo com furo central
{ const c = MD.defaults(); c.hole = 20; cases.push(['furo central', c]); }

// 3) vazado com aro
{ const c = MD.defaults(); c.mode = 'vazado'; c.thresh = 0.3; c.rim = 3; c.relief = 1.2;
  c.rings.forEach(r => { r.outline = true; r.soft = 0.012; r.h = 1; });
  cases.push(['vazado + aro', c]); }

// 4) vazado sem aro, com furo de pendurar
{ const c = MD.defaults(); c.mode = 'vazado'; c.thresh = 0.4; c.rim = 0; c.hang = true; c.hangD = 4;
  cases.push(['vazado sem aro + pendurar', c]); }

// 5) todos os tipos de anel de uma vez, alguns com altura negativa
{ const c = MD.defaults(); c.sym = 9; c.hole = 8; c.hang = true;
  const types = ['anel', 'petalas', 'estrela', 'dentes', 'poligono', 'raios', 'pontos'];
  c.rings = types.map((t, i) => MD.ring({
    type: t, outline: i % 2 === 0, mult: [0.25, 0.5, 1, 2, 3][i % 5],
    r0: i / types.length, r1: (i + 1) / types.length,
    profile: ['plano', 'domo', 'bisel'][i % 3],
    h: i === 3 ? -0.6 : 0.5 + 0.07 * i, phase: i * 13, soft: 0.02, w: 0.03, size: 0.7
  }));
  cases.push(['todos os tipos', c]); }

// 6) extremos: relevo zero, base fina, simetria alta
{ const c = MD.defaults(); c.relief = 0; c.base = 0.6; c.sym = 48; c.diam = 40;
  cases.push(['relevo zero / sym 48', c]); }

// 7) limiar altíssimo no vazado (quase nada de material)
{ const c = MD.defaults(); c.mode = 'vazado'; c.thresh = 0.88; c.rim = 2;
  cases.push(['vazado limiar alto', c]); }

// 8) preset "vitral" (precisa sair como peça única)
{ const R = MD.ring; const c = MD.defaults();
  c.sym = 12; c.mode = 'vazado'; c.thresh = 0.3; c.rim = 3.5; c.base = 2.4; c.relief = 1.2; c.hang = true;
  c.conn = 12; c.connW = 1.8;
  c.rings = [
    R({ type: 'anel', outline: true, mult: 1, r0: 0.05, r1: 0.14, w: 0.035, soft: 0.01, profile: 'plano', h: 1 }),
    R({ type: 'petalas', outline: true, mult: 1, r0: 0.14, r1: 0.50, amp: 0.9, w: 0.030, soft: 0.01, profile: 'plano', h: 1 }),
    R({ type: 'raios', outline: false, mult: 1, r0: 0.46, r1: 0.72, size: 0.18, soft: 0.01, profile: 'plano', h: 1 }),
    R({ type: 'pontos', outline: true, mult: 2, r0: 0.56, r1: 0.76, size: 0.75, w: 0.026, soft: 0.01, profile: 'plano', h: 1 }),
    R({ type: 'anel', outline: true, mult: 1, r0: 0.76, r1: 0.88, w: 0.030, soft: 0.01, profile: 'plano', h: 1 }),
    R({ type: 'estrela', outline: true, mult: 3, r0: 0.80, r1: 0.96, amp: 0.8, w: 0.024, soft: 0.01, profile: 'plano', h: 1 })
  ];
  cases.push(['preset vitral', c]); }

let fail = 0;
for (const [name, cfg] of cases) {
  const res = MD.resolution(cfg, 'teste');
  const t0 = Date.now();
  const mesh = MD.buildMesh(clone(cfg), res);
  const dt = Date.now() - t0;
  const a = MD.audit(mesh);
  const stl = MD.toSTL(mesh, name);
  const nt = new DataView(stl).getUint32(80, true);

  // limites geométricos
  let maxR = 0, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < mesh.n; i += 3) {
    const r = Math.hypot(mesh.pos[i], mesh.pos[i + 1]);
    if (r > maxR) maxR = r;
    if (mesh.pos[i + 2] < minZ) minZ = mesh.pos[i + 2];
    if (mesh.pos[i + 2] > maxZ) maxZ = mesh.pos[i + 2];
  }

  const ok = a.openEdges === 0 && a.nonFinite === 0 && a.degenerate === 0 &&
    nt === mesh.tris && stl.byteLength === 84 + 50 * mesh.tris &&
    maxR <= cfg.diam / 2 + 1e-3 && minZ >= -1e-6 &&
    Math.abs(maxZ - (cfg.base + cfg.relief * (cfg.relief ? 1 : 0))) < cfg.relief + 0.01 + cfg.base;

  if (!ok) fail++;
  console.log(
    (ok ? 'OK  ' : 'FALHA ') + name.padEnd(26) +
    ' tri=' + String(mesh.tris).padStart(7) +
    ' abertas=' + String(a.openEdges).padStart(5) +
    ' degen=' + String(a.degenerate).padStart(4) +
    ' NaN=' + a.nonFinite +
    ' peças=' + mesh.parts +
    ' Ømax=' + (maxR * 2).toFixed(2) +
    ' z=[' + minZ.toFixed(2) + ',' + maxZ.toFixed(2) + ']' +
    ' stl=' + (stl.byteLength / 1048576).toFixed(2) + 'MB' +
    ' ' + dt + 'ms'
  );
}

// tamanho e tempo na qualidade máxima (o pior caso que o usuário pode pedir)
{
  const cfg = MD.defaults();
  const res = MD.resolution(cfg, 'max');
  const t0 = Date.now();
  const mesh = MD.buildMesh(cfg, res);
  const dt = Date.now() - t0;
  const a = MD.audit(mesh);
  console.log('\nqualidade máxima: grade ' + res.nr + 'x' + res.nt +
    ' → ' + mesh.tris.toLocaleString('pt-BR') + ' tri, ' +
    ((84 + 50 * mesh.tris) / 1048576).toFixed(1) + ' MB, ' + dt + ' ms, abertas=' + a.openEdges);
}

console.log(fail === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + fail + ' CASO(S) COM FALHA');
process.exit(fail ? 1 : 0);