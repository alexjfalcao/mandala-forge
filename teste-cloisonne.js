// Testa o núcleo cloisonné extraído do HTML: malha estanque, sem NaN, sem degenerados.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const zlib = require('zlib');

// abre o .3mf sem dependência: o zip é escrito à mão pelo núcleo, então aqui
// se lê o diretório central e se infla cada entrada com o zlib do próprio Node
function lerZip(buf) {
  const b = Buffer.from(buf);
  let eocd = -1;
  for (let i = b.length - 22; i >= 0; i--) if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('sem diretório central');
  const n = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const saida = {};
  for (let k = 0; k < n; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('entrada ' + k + ' corrompida');
    const metodo = b.readUInt16LE(p + 10), crc = b.readUInt32LE(p + 16);
    const comp = b.readUInt32LE(p + 20), bruto = b.readUInt32LE(p + 24);
    const lnome = b.readUInt16LE(p + 28), lext = b.readUInt16LE(p + 30), lcom = b.readUInt16LE(p + 32);
    const off = b.readUInt32LE(p + 42);
    const nome = b.slice(p + 46, p + 46 + lnome).toString();
    const ln = b.readUInt16LE(off + 26), le = b.readUInt16LE(off + 28);
    const dados = b.slice(off + 30 + ln + le, off + 30 + ln + le + comp);
    const claro = metodo === 8 ? zlib.inflateRawSync(dados) : dados;
    if (claro.length !== bruto) throw new Error(nome + ': tamanho não bate');
    if (zlib.crc32 ? zlib.crc32(claro) !== crc : false) throw new Error(nome + ': CRC não bate');
    saida[nome] = claro;
    p += 46 + lnome + lext + lcom;
  }
  return saida;
}

const html = fs.readFileSync(path.join(__dirname, 'mandala-cloisonne.html'), 'utf8');
const m = html.match(/<script id="mandala-core">([\s\S]*?)<\/script>/);
if (!m) { console.error('núcleo não encontrado'); process.exit(1); }
const ctx = { console, TextEncoder, TextDecoder, Blob, Response, CompressionStream };
vm.createContext(ctx);
vm.runInContext(m[1] + '\nthis.MC = MC;', ctx);
const MC = ctx.MC;
const C = MC.camada;

function clone(o) { return JSON.parse(JSON.stringify(o)); }

const cases = [];

// 1) padrão
cases.push(['padrão', MC.defaults()]);

// 2) incensário: cone + furo cego + muitas camadas sobrepostas
{ const c = Object.assign(MC.defaults(), {
    sym: 10, aro: 3.5, aroH: 1, fio: 0.8, fioH: 0.9, degrau: 0.5,
    cone: 14, coneH: 5, coneC: 0.7, furo: 3, furoP: 8,
    camadas: [
      C({ motivo: 'anel', mult: 1, r0: 0.11, r1: 0.90, nivel: 0, borda: false }),
      C({ motivo: 'cunha', mult: 1, r0: 0.68, r1: 1.00, larg: 0.8, nivel: 1, preench: 'nervuras', linhas: 4, incl: 0.45 }),
      C({ motivo: 'folha', mult: 1, fase: 18, r0: 0.40, r1: 0.92, larg: 1.05, nivel: 1, preench: 'nervuras', linhas: 5, incl: 0.8 }),
      C({ motivo: 'arco', mult: 1, fase: 18, r0: 0.52, r1: 0.575, larg: 1, nivel: 2 }),
      C({ motivo: 'arco', mult: 1, r0: 0.36, r1: 0.435, larg: 1, nivel: 2, preench: 'contornos', passo: 1.6 }),
      C({ motivo: 'gota', mult: 2, r0: 0.12, r1: 0.232, larg: 0.92, base: 0.45, ponta: 1.15, nivel: 3 })
    ] });
  cases.push(['incensário', c]); }

// 3) vazado com conectores (fundo desaparece, só o desenho fica)
{ const c = MC.defaults();
  c.modo = 'vazado'; c.conn = 12; c.connW = 1.8; c.aro = 4; c.cone = 0; c.furo = 0;
  c.camadas = c.camadas.filter(x => x.motivo !== 'anel');
  cases.push(['vazado + conectores', c]); }

// 4) vazado sem aro nem conectores (deve avisar peças soltas, mas continuar estanque)
{ const c = MC.defaults();
  c.modo = 'vazado'; c.conn = 0; c.aro = 0; c.cone = 0; c.furo = 0;
  c.camadas = c.camadas.filter(x => x.motivo !== 'anel');
  cases.push(['vazado solto', c]); }

// 5) todos os motivos de uma vez, em níveis diferentes
{ const c = MC.defaults(); c.sym = 9; c.cone = 10; c.furo = 2;
  const mot = ['folha', 'gota', 'arco', 'ponto', 'cunha', 'losango', 'anel'];
  c.camadas = mot.map((mo, i) => C({
    motivo: mo, mult: [0.5, 1, 2][i % 3], fase: i * 7,
    r0: 0.10 + 0.115 * i, r1: 0.10 + 0.115 * (i + 1),
    larg: 0.6 + 0.12 * (i % 4), base: 0.4 + 0.2 * (i % 3), ponta: 0.8 + 0.3 * (i % 3),
    nivel: i % 5, borda: i % 2 === 0
  }));
  cases.push(['todos os motivos', c]); }

// 6) todos os preenchimentos
{ const c = MC.defaults(); c.sym = 12; c.cone = 0; c.furo = 0;
  const pre = ['nenhum', 'contornos', 'nervuras', 'gotaint', 'pontoint'];
  c.camadas = pre.map((p, i) => C({
    motivo: i % 2 ? 'arco' : 'folha', mult: 1, fase: i * 6,
    r0: 0.08 + 0.17 * i, r1: 0.08 + 0.17 * (i + 1),
    preench: p, passo: 1.4 + 0.3 * i, linhas: 2 + i, incl: 0.3 * i, nivel: 1 + (i % 3)
  }));
  cases.push(['todos os preenchimentos', c]); }

// 7) extremos: filete grosso, degrau zero, furo mais fundo que a peça
{ const c = MC.defaults();
  c.diam = 60; c.base = 1.2; c.fio = 2.5; c.fioH = 3; c.degrau = 0;
  c.cone = 20; c.coneH = 12; c.furo = 6; c.furoP = 40; c.aro = 0;
  cases.push(['extremos', c]); }

// 8) sem cone, sem furo, sem aro, camada única cobrindo tudo
{ const c = MC.defaults();
  c.cone = 0; c.furo = 0; c.aro = 0; c.sym = 36;
  c.camadas = [C({ motivo: 'anel', mult: 1, r0: 0, r1: 1, nivel: 2, preench: 'contornos', passo: 1.2 })];
  cases.push(['anel único / sym 36', c]); }

let fail = 0;
for (const [name, cfg] of cases) {
  const res = MC.resolution(cfg, 'teste');
  const t0 = Date.now();
  const mesh = MC.buildMesh(clone(cfg), res);
  const dt = Date.now() - t0;
  const a = MC.audit(mesh);

  let maxR = 0, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < mesh.n; i += 3) {
    const r = Math.hypot(mesh.pos[i], mesh.pos[i + 1]);
    if (r > maxR) maxR = r;
    if (mesh.pos[i + 2] < minZ) minZ = mesh.pos[i + 2];
    if (mesh.pos[i + 2] > maxZ) maxZ = mesh.pos[i + 2];
  }

  const ok = a.openEdges === 0 && a.nonFinite === 0 && a.degenerate === 0 &&
    maxR <= cfg.diam / 2 + 1e-3 && minZ >= -1e-6 &&
    maxZ <= MC.alturaMax(cfg) + 1e-3;

  if (!ok) fail++;
  console.log(
    (ok ? 'OK  ' : 'FALHA ') + name.padEnd(24) +
    ' tri=' + String(mesh.tris).padStart(7) +
    ' abertas=' + String(a.openEdges).padStart(5) +
    ' degen=' + String(a.degenerate).padStart(4) +
    ' NaN=' + a.nonFinite +
    ' peças=' + String(mesh.parts).padStart(3) +
    ' Ømax=' + (maxR * 2).toFixed(2) +
    ' z=[' + minZ.toFixed(2) + ',' + maxZ.toFixed(2) + ']' +
    ' teto=' + MC.alturaMax(cfg).toFixed(2) +
    ' ' + dt + 'ms'
  );
}

// geometria indexada da grade polar: índices no intervalo, cor em todo
// triângulo e os mesmos triângulos da sopa auditada.
function checaIndexada() {
  let falhas = 0;
  console.log('\ngeometria indexada (grade polar):');
  for (const [name, cfg] of cases) {
    const res = MC.resolution(cfg, 'teste');
    const g = MC.buildIndexed(clone(cfg), res, true);
    const sopa = MC.buildMesh(clone(cfg), res);

    let ok = g.tris === sopa.tris && g.paleta.length > 0;
    // todo índice dentro do intervalo
    let usados = new Uint8Array(g.nv);
    for (let i = 0; i < g.tris * 3; i++) {
      const v = g.idx[i];
      if (v >= g.nv) { ok = false; break; }
      usados[v] = 1;
    }
    // toda cor dentro da paleta — negado assim de propósito: `undefined >= n`
    // é false e deixaria passar um material que nunca foi escrito no buffer
    for (let i = 0; i < g.tris; i++) if (!(g.mat[i] < g.paleta.length)) { ok = false; break; }
    // os vértices indexados reproduzem a sopa exatamente
    for (let i = 0; i < Math.min(g.tris, 5000); i++) {
      for (let k = 0; k < 3; k++) {
        const v = g.idx[i * 3 + k] * 3, o = i * 9 + k * 3;
        if (g.vx[v] !== sopa.pos[o] || g.vx[v + 1] !== sopa.pos[o + 1] || g.vx[v + 2] !== sopa.pos[o + 2]) { ok = false; }
      }
    }

    if (!ok) falhas++;

    let nUsados = 0;
    for (let i = 0; i < g.nv; i++) if (usados[i]) nUsados++;
    console.log(
      (ok ? 'OK  ' : 'FALHA ') + name.padEnd(24) +
      ' vért=' + String(nUsados).padStart(7) + '/' + String(g.nv).padStart(7) +
      ' tri=' + String(g.tris).padStart(7) +
      ' cores=' + String(g.paleta.length).padStart(2)
    );
  }
  return falhas;
}

/* -------------------------------------------------------------------------
   Confere o pacote 3MF inteiro: estrutura, geometria e o de-para

     cor da mandala → peça → filamento do projeto → extrusor

   O Bambu só adota as cores se o arquivo se declarar projeto dele
   (Application "BambuStudio-<versão>") E levar o project_settings.config
   completo; e ele ignora `basematerials`. Por isso o que se confere aqui é o
   par model_settings.config (peça i → extrusor i+1) + project_settings.config
   (filamento i+1 → cor da peça i), sem nenhuma tolerância de cor.
   ------------------------------------------------------------------------- */
function confere3MF(buf, g) {
  const erros = [];
  let z;
  try { z = lerZip(buf); } catch (e) { return ['zip inválido: ' + e.message]; }

  for (const n of ['[Content_Types].xml', '_rels/.rels', '3D/3dmodel.model',
                   'Metadata/model_settings.config', 'Metadata/project_settings.config'])
    if (!z[n]) erros.push('falta a entrada ' + n);
  if (erros.length) return erros;

  const modelo = z['3D/3dmodel.model'].toString();
  const cfgM = z['Metadata/model_settings.config'].toString();
  let projeto;
  try { projeto = JSON.parse(z['Metadata/project_settings.config'].toString()); }
  catch (e) { return ['project_settings.config não é JSON: ' + e.message]; }

  // 1. o arquivo se declara projeto do Bambu (sem isso a cor é descartada)
  if (!/<metadata name="Application">BambuStudio-\d+\.\d+\.\d+\.\d+<\/metadata>/.test(modelo))
    erros.push('Application não é "BambuStudio-<versão>" — o fatiador vai ignorar as cores');

  // 2. um <object> de malha por cor, com geometria de verdade, e o objeto raiz
  const objs = modelo.split('<object ').slice(1);
  const malhas = objs.filter(o => o.indexOf('<mesh>') >= 0);
  if (malhas.length !== g.pecas.length)
    erros.push('objetos de malha: ' + malhas.length + ' ≠ ' + g.pecas.length + ' peças');
  if (objs.length !== g.pecas.length + 1) erros.push('falta o objeto raiz de componentes');

  // 3. a geometria NÃO pode ter mudado: mesma contagem de triângulos por peça
  //    (e de vértices, já compactados pelos índices realmente usados)
  malhas.forEach((o, i) => {
    const nv = (o.match(/<vertex /g) || []).length;
    const nt = (o.match(/<triangle /g) || []).length;
    if (!nv || !nt) erros.push('peça ' + (i + 1) + ' sem geometria');
    if (nt !== g.pecas[i].tris)
      erros.push('peça ' + (i + 1) + ': ' + nt + ' triângulos no arquivo ≠ ' + g.pecas[i].tris + ' na malha');
    const usados = new Set();
    for (let k = 0; k < g.pecas[i].tris * 3; k++) usados.add(g.pecas[i].idx[k]);
    if (nv !== usados.size)
      erros.push('peça ' + (i + 1) + ': ' + nv + ' vértices no arquivo ≠ ' + usados.size + ' usados');
  });

  // 4. cada peça com extrusor explícito, na ordem da paleta
  const partes = cfgM.split('<part ').slice(1);
  if (partes.length !== g.pecas.length)
    erros.push('model_settings.config: ' + partes.length + ' partes ≠ ' + g.pecas.length + ' peças');
  partes.forEach((p, i) => {
    const e = p.match(/key="extruder" value="(\d+)"/);
    if (!e) erros.push('peça ' + (i + 1) + ' sem extrusor declarado');
    else if (+e[1] !== i + 1) erros.push('peça ' + (i + 1) + ' foi para o extrusor ' + e[1]);
    if (p.indexOf(g.pecas[i].cor) < 0) erros.push('peça ' + (i + 1) + ' não nomeia a cor ' + g.pecas[i].cor);
  });

  // 4b. o <item> tem que trazer a peça para o centro da mesa: como projeto, o
  //     Bambu respeita a coordenada, e a mandala é modelada em torno de (0,0)
  const item = modelo.match(/<item [^>]*>/);
  const tr = item && item[0].match(/transform="([^"]+)"/);
  if (!tr) erros.push('<item> sem transform — a peça abriria no canto da mesa');
  else {
    const n = tr[1].trim().split(/\s+/).map(Number);
    const area = (projeto.printable_area || []).map(p => String(p).split('x').map(Number));
    const xs = area.map(p => p[0]), ys = area.map(p => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    if (n.length !== 12) erros.push('transform do <item> não tem 12 números');
    else if (Math.abs(n[9] - cx) > 0.01 || Math.abs(n[10] - cy) > 0.01)
      erros.push('peça posta em ' + n[9] + ',' + n[10] + ' e não no centro da mesa (' + cx + ',' + cy + ')');
  }

  // 5. o projeto declara um filamento por cor, na MESMA ordem — comparação
  //    exata do hex, que é o que torna a associação determinística
  const esperado = g.pecas.map(p => '#' + p.cor.replace('#', '').toUpperCase().slice(0, 6));
  const cores = projeto.filament_colour || [];
  if (cores.length !== esperado.length)
    erros.push('filament_colour tem ' + cores.length + ' cores para ' + esperado.length + ' peças');
  else esperado.forEach((c, i) => {
    if (cores[i] !== c) erros.push('filamento ' + (i + 1) + ' é ' + cores[i] + ', deveria ser ' + c);
  });
  for (const k of ['filament_type', 'filament_settings_id', 'filament_ids'])
    if (!Array.isArray(projeto[k]) || projeto[k].length !== esperado.length)
      erros.push(k + ' não tem uma entrada por cor');

  // 6. as tabelas que dependem de N. Errá-las não dá erro de leitura: o Bambu
  //    aceita o projeto e falha no fatiamento ("could not found extruder_type",
  //    "No valid nozzle found", "Flush volumes matrix do not match to the
  //    correct size", "Wipe tower generation failed").
  const N = esperado.length;
  const V = (projeto.filament_extruder_variant || []).length / N;
  if (!Number.isInteger(V) || V < 1)
    erros.push('filament_extruder_variant não é múltiplo de ' + N);
  else {
    const si = projeto.filament_self_index || [];
    if (si.length !== N * V) erros.push('filament_self_index tem ' + si.length + ', esperado ' + (N * V));
    else for (let i = 0; i < si.length; i++)
      if (si[i] !== String(Math.floor(i / V) + 1)) {
        erros.push('filament_self_index[' + i + '] é ' + si[i] + ', deveria ser ' + (Math.floor(i / V) + 1));
        break;
      }
  }
  // um bloco N×N por bico, empilhados — medido em projetos escritos pelo Bambu
  const B = (projeto.nozzle_diameter || ['0.4']).length || 1;
  const tab = { flush_volumes_matrix: B * N * N, flush_volumes_vector: 2 * N,
                flush_multiplier: B, flush_multiplier_fast: B };
  for (const k in tab)
    if ((projeto[k] || []).length !== tab[k])
      erros.push(k + ' tem ' + (projeto[k] || []).length + ', esperado ' + tab[k]);
  for (const k of ['inherits_group', 'different_settings_to_system'])
    if ((projeto[k] || []).length !== N + 2)
      erros.push(k + ' tem ' + (projeto[k] || []).length + ', esperado ' + (N + 2));
  if ((projeto.extruder_nozzle_stats || []).length !== (projeto.nozzle_volume_type || []).length)
    erros.push('extruder_nozzle_stats não tem uma entrada por extrusor');

  // 7. a torre de purga dentro da área que TODOS os extrusores alcançam —
  //    fora dela o fatiador aborta com "G-code in unprintable area"
  {
    const areas = projeto.extruder_printable_area || [];
    let lo = [-1e9, -1e9], hi = [1e9, 1e9];
    for (const a of areas) {
      const px = [], py = [];
      for (const canto of String(a).split(',')) {
        const q = canto.split('x');
        if (q.length === 2) { px.push(parseFloat(q[0])); py.push(parseFloat(q[1])); }
      }
      if (!px.length) continue;
      lo = [Math.max(lo[0], Math.min(...px)), Math.max(lo[1], Math.min(...py))];
      hi = [Math.min(hi[0], Math.max(...px)), Math.min(hi[1], Math.max(...py))];
    }
    const w = parseFloat(projeto.prime_tower_width) || 60;
    const tx = parseFloat((projeto.wipe_tower_x || [])[0]), ty = parseFloat((projeto.wipe_tower_y || [])[0]);
    if (areas.length && (!(tx >= lo[0] && tx + w <= hi[0]) || !(ty >= lo[1] && ty + w <= hi[1])))
      erros.push('torre de purga em ' + tx + ',' + ty + ' cai fora da área comum aos extrusores');
  }
  return erros;
}

// Via por CONTORNO: cada peça de cor tem que ser um sólido fechado por si só.
// Grade pequena de propósito — o que se testa aqui é a topologia, não o
// acabamento. É onde moram as armadilhas do marching squares: cruzamento em
// cima do nó, sela desconectada e T-junction contra retângulo fundido.
async function checaContorno(solida) {
  console.log(solida ? '\nvia por contorno, base sólida:'
                     : '\nvia por contorno + 3MF + OBJ:');
  let ruins = 0;
  for (const [name, cfg0] of cases) {
    const cfg = clone(cfg0);
    if (solida) cfg.baseSolida = true;
    const g = MC.buildContorno(clone(cfg), 120, 3);
    let tot = 0, abertas = 0, degen = 0;
    for (const p of g.pecas) {
      const pos = new Float32Array(p.tris * 9);
      for (let i = 0; i < p.tris; i++) for (let k = 0; k < 3; k++) {
        const v = p.idx[i * 3 + k] * 3, o = i * 9 + k * 3;
        pos[o] = p.vx[v]; pos[o + 1] = p.vx[v + 1]; pos[o + 2] = p.vx[v + 2];
      }
      const a = MC.audit({ pos, tris: p.tris });
      tot += p.tris; abertas += a.openEdges; degen += a.degenerate;
    }
    // toda peça dentro do disco e acima do plano
    let maxR = 0, minZ = Infinity;
    for (const p of g.pecas)
      for (let i = 0; i < p.nv; i++) {
        const r = Math.hypot(p.vx[i * 3], p.vx[i * 3 + 1]);
        if (r > maxR) maxR = r;
        if (p.vx[i * 3 + 2] < minZ) minZ = p.vx[i * 3 + 2];
      }
    // Limite SUPERIOR, não igualdade: no vazado sem aro o desenho não chega à
    // borda de propósito. A folga acompanha a célula, porque a borda do disco
    // cai numa curva de nível entre centros de célula.
    const celula = cfg.diam / 120;
    let ok = abertas === 0 && degen === 0 && g.pecas.length > 0 &&
      maxR * 2 <= cfg.diam + celula && minZ >= -1e-6;

    // Com a base sólida, nenhuma peça COLORIDA pode encostar no plano: a cor
    // tem que começar no topo da base. É o que corta a purga do AMS — se uma
    // poça ainda for extrudada desde o zero, o ganho evaporou.
    if (solida) {
      const base = cfg.base;
      for (const p of g.pecas) {
        if (p.cor === cfg.corBase) continue;
        let z = Infinity;
        for (let i = 0; i < p.nv; i++) if (p.vx[i * 3 + 2] < z) z = p.vx[i * 3 + 2];
        if (z < base - 1e-6) {
          console.log('    ✗ peça ' + p.cor + ' desce até z=' + z.toFixed(3) +
                      ', deveria parar em ' + base.toFixed(3));
          ok = false;
        }
      }
    }

    // 3MF: pacote válido e, principalmente, a associação cor → peça → filamento
    // escrita de forma explícita (nada de basematerials nem de cor aproximada)
    const buf = await MC.to3MF(g, name);
    const b = new Uint8Array(buf);
    const zipOk = b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
    const falhas3mf = confere3MF(buf, g);
    if (!zipOk || falhas3mf.length) { ok = false; for (const f of falhas3mf) console.log('    ✗ ' + f); }

    // OBJ + MTL da MESMA geometria: toda face tem que levar usemtl (o Bambu
    // recusa "some_face_no_color"), todo índice tem que estar no intervalo e o
    // .mtl tem que declarar todo material usado
    const obj = MC.toOBJ(g, name);
    let nv = 0, nf = 0, matAtual = -1, ruimObj = 0;
    const matsUsados = new Set();
    for (const L of obj.obj.split('\n')) {
      if (L.startsWith('v ')) nv++;
      else if (L.startsWith('usemtl ')) { matAtual = L.slice(7); matsUsados.add(matAtual); }
      else if (L.startsWith('f ')) {
        nf++;
        if (matAtual === -1) ruimObj++;
        const vs = L.slice(2).split(' ').map(Number);
        if (vs.length !== 3 || vs.some(v => !(v >= 1 && v <= nv))) ruimObj++;
      }
    }
    const matsDeclarados = new Set((obj.mtl.match(/newmtl (\S+)/g) || []).map(x => x.slice(7)));
    for (const mm of matsUsados) if (!matsDeclarados.has(mm)) ruimObj++;
    if (nf !== tot || ruimObj || matsUsados.size !== g.pecas.length ||
      obj.obj.indexOf('mtllib ./' + obj.nome + '.mtl') < 0) ok = false;

    if (!ok) ruins++;
    console.log((ok ? 'OK  ' : 'FALHA ') + name.padEnd(24) +
      ' regiões=' + String(g.regioes).padStart(2) +
      ' peças=' + String(g.pecas.length).padStart(2) +
      ' tri=' + String(tot).padStart(7) +
      ' abertas=' + String(abertas).padStart(5) +
      ' degen=' + String(degen).padStart(4) +
      ' Ømax=' + (maxR * 2).toFixed(2) +
      ' 3mf=' + (buf.byteLength / 1048576).toFixed(2) + 'MB' +
      ' filam=' + g.pecas.length +
      ' obj=' + (obj.obj.length / 1048576).toFixed(2) + 'MB' +
      ' ' + matsUsados.size + 'mat');
  }
  return ruins;
}

// A contagem de cores do rodapé tem que bater com a paleta que a exportação
// emite. É o que dá sentido ao botão "reduzir para N": o usuário pede 4, o
// badge mostra 4, e o 3MF sai com 4 peças e 4 filamentos. Se a varredura do
// rodapé (grade polar 120 × ~720) perdesse uma cor que o contorno encontra, ele
// pediria um filamento a mais do que o AMS tem slot.
{
  let ruins = 0;
  console.log('\ncores visíveis × paleta exportada:');
  const varreCores = (cfg) => {
    const P = MC.prepare(cfg), Rm = cfg.diam / 2;
    const m = 4 * Math.max(1, Math.round(cfg.sym));
    const NR = 120, NT = Math.max(m, Math.round(720 / m) * m);
    const v = {}, o = {};
    for (let i = 0; i < NR; i++) {
      const rr = Rm * (i + 0.5) / NR;
      for (let j = 0; j < NT; j++) {
        const tt = Math.PI * 2 * (j + 0.5) / NT;
        if (!MC.solid(cfg, P, rr, tt, o)) continue;
        MC.altura(cfg, P, rr, tt, o);
        const c = o.id < 0 ? cfg.corBase
                : (o.fio >= 0.5 ? cfg.corFio
                : ((o.banda % 2 === 1 && o.cor2) ? o.cor2 : o.cor));
        v[c.toLowerCase()] = 1;
      }
    }
    return Object.keys(v).sort();
  };
  for (const [name, cfg] of cases) {
    const badge = varreCores(clone(cfg));
    const exp = MC.buildContorno(clone(cfg), 240, 3).paleta.map(c => c.toLowerCase()).sort();
    const soExp = exp.filter(c => badge.indexOf(c) < 0);
    const soBadge = badge.filter(c => exp.indexOf(c) < 0);
    const ok = !soExp.length && !soBadge.length;
    if (!ok) ruins++;
    console.log('  ' + (ok ? 'ok  ' : 'FALHA ') + name.padEnd(24) +
      ' rodapé=' + badge.length + ' exportação=' + exp.length +
      (soExp.length ? '  só na exportação: ' + soExp.join(',') : '') +
      (soBadge.length ? '  só no rodapé: ' + soBadge.join(',') : ''));
  }
  fail += ruins;
}

// fase em PASSOS da simetria: meio passo tem que continuar meio passo quando a
// simetria muda. É o que faz trocar 10 por 12 não desalinhar as camadas entre si.
{
  let ruins = 0;
  const ang = (sym, mult, fasePasso) => {
    const c = MC.defaults();
    c.sym = sym; c.rot = 0;
    c.camadas = [C({ motivo: 'gota', mult, fasePasso, r0: 0.3, r1: 0.6 })];
    return MC.prepare(c).cam[0].ph * 180 / Math.PI;      // deslocamento angular, em graus
  };
  for (const [sym, mult] of [[10, 1], [12, 1], [12, 2], [9, 0.5]]) {
    const n = Math.max(1, Math.round(sym * mult)), meio = 180 / n;
    const got = ang(sym, mult, 0.5);
    const ok = Math.abs(got - meio) < 1e-9;
    if (!ok) ruins++;
    console.log('  ' + (ok ? 'ok  ' : 'FALHA ') + 'sym ' + sym + ' × mult ' + mult +
      ' → n=' + n + ', meio passo = ' + meio.toFixed(2) + '°, fase deu ' + got.toFixed(2) + '°');
  }
  // config antiga, sem fasePasso: continua valendo `fase` em graus
  {
    const c = MC.defaults();
    c.sym = 12; c.rot = 0;
    c.camadas = [C({ motivo: 'gota', mult: 1, fase: 18 })];
    delete c.camadas[0].fasePasso;
    const got = MC.prepare(c).cam[0].ph * 180 / Math.PI;
    const ok = Math.abs(got - 18) < 1e-9;
    if (!ok) ruins++;
    console.log('  ' + (ok ? 'ok  ' : 'FALHA ') + 'sem fasePasso: fase 18° → ' + got.toFixed(2) + '° (compatibilidade)');
  }
  console.log('fase em passos: ' + (ruins ? ruins + ' CASO(S) COM FALHA' : 'ok'));
  fail += ruins;
}

// a qualidade "fino" troca resolução radial por angular: precisa continuar
// estanque, é ela que salva o filete do serrilhado
{
  const cfg = MC.defaults();
  const res = MC.resolution(cfg, 'fino');
  const mesh = MC.buildMesh(cfg, res);
  const a = MC.audit(mesh);
  const cel = Math.PI * cfg.diam / res.nt;
  const ok = a.openEdges === 0 && a.degenerate === 0 && a.nonFinite === 0;
  if (!ok) fail++;
  console.log('\n' + (ok ? 'OK  ' : 'FALHA ') + 'qualidade fino: grade ' + res.nr + 'x' + res.nt +
    ', célula no aro ' + cel.toFixed(3) + ' mm, ' + (cfg.fio / cel).toFixed(1) + ' células por filete, ' +
    mesh.tris.toLocaleString('pt-BR') + ' tri, abertas=' + a.openEdges);
}

// fuzz: configurações aleatórias, inclusive inválidas de propósito
{
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  let bad = 0;
  for (let k = 0; k < 40; k++) {
    const c = MC.defaults();
    c.diam = rnd(40, 240); c.base = rnd(0.8, 8); c.sym = 3 + ((Math.random() * 30) | 0);
    c.fio = rnd(0.3, 3); c.fioH = rnd(0, 4); c.degrau = rnd(0, 2.5);
    c.aro = rnd(0, 12); c.aroH = rnd(0, 5);
    c.cone = Math.random() < 0.5 ? rnd(0, c.diam * 0.6) : 0;
    c.coneH = rnd(0, 15); c.coneC = rnd(0.3, 3);
    c.furo = Math.random() < 0.5 ? rnd(0, Math.max(1, c.cone)) : 0;
    c.furoP = rnd(1, 30);
    c.modo = Math.random() < 0.3 ? 'vazado' : 'placa';
    c.conn = (Math.random() * 20) | 0; c.connW = rnd(0.6, 5);
    const n = 1 + ((Math.random() * 6) | 0);
    c.camadas = [];
    for (let i = 0; i < n; i++) {
      const a = Math.random(), b = Math.random();
      c.camadas.push(C({
        motivo: pick(['folha', 'gota', 'arco', 'ponto', 'cunha', 'losango', 'anel']),
        mult: pick([0.25, 0.5, 1, 2, 3]), fase: rnd(0, 360),
        r0: a, r1: b,                                   // de propósito fora de ordem às vezes
        larg: rnd(0.05, 2.2), base: rnd(0.2, 3), ponta: rnd(0.2, 3),
        nivel: (Math.random() * 6) | 0, borda: Math.random() < 0.8,
        preench: pick(['nenhum', 'contornos', 'nervuras', 'gotaint', 'pontoint']),
        passo: rnd(0.3, 8), linhas: 1 + ((Math.random() * 14) | 0), incl: rnd(0, 1.6),
        espinha: Math.random() < 0.5
      }));
    }
    const mesh = MC.buildMesh(c, MC.resolution(c, 'teste'));
    const au = MC.audit(mesh);
    if (au.openEdges || au.nonFinite || au.degenerate) {
      bad++;
      console.log('  fuzz #' + k + ' falhou:', JSON.stringify(au));
    }
  }
  console.log('\nfuzz: ' + (40 - bad) + '/40 sem arestas abertas');
  if (bad) fail += bad;
}

// precisão da exportação: perto do centro os nós da grade ficam a menos de
// 0,0005 mm um do outro na qualidade máxima. Se o formatador arredondar
// demais, eles colidem e viram triângulo degenerado no arquivo. As 5 casas
// decimais valem para os dois formatos — é o mesmo num() do núcleo.
{
  const cfg = MC.defaults();
  const num = v => String(Math.round(v * 1e5) / 1e5);
  let ruins = 0;
  for (const q of ['teste', 'bom', 'alta', 'max', 'fino']) {
    const g = MC.buildIndexed(cfg, MC.resolution(cfg, q), false);
    const exatos = new Set(), escritos = new Set();
    for (let i = 0; i < g.nv; i++) {
      const x = g.vx[i * 3], y = g.vx[i * 3 + 1], z = g.vx[i * 3 + 2];
      exatos.add(x + ',' + y + ',' + z);
      escritos.add(num(x) + ' ' + num(y) + ' ' + num(z));
    }
    if (escritos.size !== exatos.size) { ruins++; console.log('  ' + q + ': ' + (exatos.size - escritos.size) + ' vértices COLIDEM ao arredondar'); }
    else console.log('  ' + q.padEnd(6) + ' ' + String(exatos.size).padStart(7) + ' vértices, todos distintos');
  }
  console.log('precisão da exportação: ' + (ruins ? ruins + ' QUALIDADE(S) COM COLISÃO' : 'ok nas 5 qualidades'));
  fail += ruins;
}

// custo na qualidade máxima
{
  const cfg = MC.defaults();
  const res = MC.resolution(cfg, 'max');
  const t0 = Date.now();
  const mesh = MC.buildMesh(cfg, res);
  const dt = Date.now() - t0;
  const a = MC.audit(mesh);
  console.log('qualidade máxima: grade ' + res.nr + 'x' + res.nt +
    ' → ' + mesh.tris.toLocaleString('pt-BR') + ' tri, ' + dt + ' ms, abertas=' + a.openEdges);
}

(async () => {
  fail += checaIndexada();
  fail += await checaContorno(false);
  fail += await checaContorno(true);
  console.log(fail === 0 ? '\nTODOS OS TESTES PASSARAM' : '\n' + fail + ' CASO(S) COM FALHA');
  process.exit(fail ? 1 : 0);
})();
