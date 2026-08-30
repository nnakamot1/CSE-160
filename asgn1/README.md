Assignment 1 — Shape Drawer
============================

Open `src/asgn1.html` in a browser (no server required).

A WebGL paint tool. Pick a brush (square, triangle, or circle), a color, and
a size, then click on the canvas to stamp shapes. Includes a "Draw Picture"
mode and a "Clear Canvas" button.

Controls
--------

- **Squares / Triangles / Circles** buttons — select the brush shape.
- Color and size controls — set `u_FragColor` / `u_Size` for the next shape.
- **Draw Picture** — renders a pre-built picture out of shapes.
- **Clear Canvas** — resets the WebGL canvas.

Files
-----

- `src/asgn1.html` / `src/asgn1.js` — UI wiring and render loop.
- `src/Point.js`, `src/Triangle.js`, `src/Circle.js` — shape classes.
- `lib/cuon-utils.js` — course-provided WebGL shader helper.
- `src/reference.jpg` / `src/reference.PNG` — reference image for the "Draw Picture" mode.
