# Mandala Forge

Draw a cloisonné mandala in your browser and download a 3MF that Bambu Studio opens with
**every colour already on the right extruder** — no import dialog, no Color Count guessing,
nothing to fix by hand.

**Live: <https://www.alexfalcao.pro.br/mandala/>**

![A twelve-petal cloisonné mandala in red, green and gold on a dark background](img/og.png)

---

## What it is

One self-contained HTML file. No build step, no bundler, no CDN, no `localStorage`, no
analytics, no network calls of any kind — open it and it runs, online or offline.

Cloisonné is a raised metal wire damming pools of enamel, and that is literally the model:
a **wire** in relief, with width and height in millimetres, enclosing **pools** that sit
recessed below it. You compose the drawing from seven motifs — leaf, teardrop, arc, dot,
wedge, diamond, ring — repeated around the circle by the symmetry you choose, in layers that
paint over each other like stacked tracing paper.

Six presets to start from, a palette picker, undo/redo, and a colour reducer that merges the
closest pairs in Lab until you are down to the number of AMS slots you actually have.

The interface speaks Portuguese and English (`?lang=en`).

## Why the output prints properly

Two decisions do the work, and neither is what a mandala generator usually does:

- **Height comes from signed distance per region, not from a summed height field.** Every
  motif answers "how far inside me is this point", and the last layer that claims a point
  wins. That is what makes a wire a wire instead of a bump.
- **Export goes through contour extraction, not the sampling grid.** Marching squares with
  per-cell clipping traces each colour boundary at sub-pixel precision, so edges come out
  smooth instead of stair-stepped, and each colour leaves as **one closed, watertight solid**.

One closed solid per colour is the whole trick: it is what lets the 3MF map part *i* to
extruder *i+1* deterministically, instead of handing the slicer a soup of coloured faces and
hoping its clustering guesses right.

Slicers ignore `basematerials`, so colour has to arrive as *parts* — and it needs **both**
config files inside the 3MF (`model_settings.config` for the extruder assignment,
`project_settings.config` for what filament each extruder holds). Getting that wrong is the
classic "the colours came out swapped".

Real numbers, from the `lotus` preset sliced in the Bambu Studio CLI on an H2C with a 0.4
nozzle: 6 filaments, 989,888 triangles, 52.1 g, 253 minutes.

The rules for writing that file — both configs, the sizing traps, the metadata the slicer
checks before it will honour any of it — are packaged separately as a Claude Code skill, for
building colour-correct 3MFs from any geometry and not just mandalas:
[bambu-3mf-skill](https://github.com/alexjfalcao/bambu-3mf-skill).

## Running it

```bash
open mandala-cloisonne.html     # that's it — there is no server and nothing to install
```

Browser automation usually blocks `file://`. If you need that, serve the folder instead:

```bash
python3 -m http.server
```

## Command-line export (optional)

The browser export is the default and needs nothing. There is a second path for finer grids,
and it is the only part of this project with dependencies:

```bash
pip install numpy shapely contourpy trimesh
python3 exportar.py preset:incenso piece.3mf
python3 exportar.py mine.json piece.3mf --impressora a1   # h2c (default), a1, p1s, x1c
```

It does **not** reimplement the geometry: `amostrar.js` loads the same `mandala-core` block
out of the HTML and runs it in `vm`, so changing the maths in one place changes both.

Supported printers: **H2C**, **A1**, **P1S**, **X1 Carbon**. Export formats: **3MF** (contour,
the default) and **OBJ + MTL**.

## Tests

```bash
node teste-cloisonne.js      # 8 cases + 40× fuzz + export       (no dependencies)
python3 teste-contorno.py    # 5 presets through the Python path (~12 s)
```

Both exit non-zero on failure. There is no test runner: each case is an entry in the `cases`
array. The acceptance criterion for any geometry change is `MC.audit(mesh).openEdges === 0`
in every configuration.

## Layout

| Path | What it is |
|---|---|
| `mandala-cloisonne.html` | The whole app: four blocks — style, body, `mandala-core`, `mandala-ui` |
| `index.html` | Landing page, published alongside it |
| `MANDALA-CLOISONNE.md` | Reference: the formula behind each motif, the data model, the traps |
| `DESIGN.md` · `PRODUCT.md` | Visual system and product decisions |
| `exportar.py` · `amostrar.js` | Command-line export path |
| `teste-cloisonne.js` · `teste-contorno.py` | The two suites |

Read `MANDALA-CLOISONNE.md` before touching the geometry — the formulas and the traps live
there, not in the code.

## Licence

**GNU AGPL-3.0** — see [LICENSE](LICENSE).

You may use, study, modify and redistribute this program. If you run a modified version and
let other people use it over a network, you have to offer them the source of your version.
Since the app is a single HTML file, handing someone that file is already distribution.

**The mandalas you generate are yours.** The licence covers this program's source, not its
output: models you make with it — and anything you print or sell from them — carry no
obligation from this licence.

Copyright © 2026 Alex Esteves Jaccoud Falcão.

## Support

This generator is free, has no ads and tracks nothing. If it saved you some work:
[Buy Me a Coffee](https://buymeacoffee.com/alexjfalcao) ·
[GitHub Sponsors](https://github.com/sponsors/alexjfalcao)

Or, at no cost at all — download and like the models on
[MakerWorld](https://makerworld.com/pt/@alexjfalcao) and
[Cults3D](https://cults3d.com/pt/usuarios/alexjfalcao).

Built by [Alex Falcão](https://www.alexfalcao.pro.br).
