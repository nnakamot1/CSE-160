Assignment 2 — Blocky Cow
==========================

Open `asgn2.html` in a browser (no server required).

A hierarchical 3D model of a cow built entirely from cubes and cylinders
(`Cube.js`, `Cylinder.js`), rendered with a single model/global-rotation
matrix pair (no lighting/textures — flat-shaded per-part color).

Controls
--------

- Drag the canvas with the mouse to rotate the camera around the model.
- **Global rotation Y / X** sliders — spin the whole model.
- **Joint 1 / 2 / 3** sliders — pose individual body joints (e.g. head, leg).
- Animation toggle — plays a procedural walk cycle driving legs, tail, and
  head via `g_anim_fl/fr/bl/br`, `g_anim_tail`, `g_anim_head`.

Files
-----

- `asgn2.html` / `asgn2.js` — scene graph, shaders, render loop, UI wiring.
- `Cube.js`, `Cylinder.js` — reusable primitive shape classes.
