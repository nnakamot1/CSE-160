CSE 160 — Introduction to Computer Graphics
============================================

Coursework for CSE 160, built with raw WebGL (`asgn0`–`asgn4`) and Three.js
(`asgn5`). Each assignment lives in its own folder with its own HTML/JS/README.

Live index: [`index.html`](index.html) links to the current featured project.

Assignments
-----------

| Folder | Title | Summary |
| --- | --- | --- |
| [`asgn0`](asgn0/README.md) | Vector Operations | 2D canvas warmup drawing and combining vectors with a small `Vector3` matrix library. |
| [`asgn1`](asgn1/README.md) | Shape Drawer | WebGL paint tool — draws squares, triangles, and circles in chosen color/size, plus a "draw picture" mode. |
| [`asgn2`](asgn2/README.md) | Blocky Cow | Hierarchical 3D model (cubes + cylinders) with slider-driven joints, drag-to-rotate camera, and a walk animation. |
| [`asgn3`](asgn3/README.md) | First-Person World (Bessie the Cow) | Textured, collidable block world with WASD + mouse-look movement, block placement/removal, and a pet-meter mini-game. |
| [`asgn4`](asgn4/README.md) | Phong Lighting | Same first-person world as `asgn3`, extended with per-pixel Phong shading (ambient/point/spot lights, normal mapping of geometry). |
| [`asgn5`](asgn5/README.md) | Three.js Exploration World | Three.js scene with 20+ primitives, textures, animation, a custom OBJ/MTL model, multiple light types, a textured skybox, and OrbitControls. |

Tech stack
----------

- `asgn0`–`asgn4`: vanilla WebGL, hand-written GLSL shaders, `cuon-utils.js` / `cuon-matrix-cse160.js` helper libraries (from the course).
- `asgn5`: [Three.js](https://threejs.org/) (`OrbitControls`, `MTLLoader`, `OBJLoader`).

Running locally
----------------

WebGL texture/model loading is blocked by the browser's CORS policy when
opened directly as a `file://` URL, so serve the repo over HTTP:

```bash
python3 -m http.server 8000
```

Then open, e.g., `http://localhost:8000/asgn4/asgn4.html`.

Assignments with no external texture/model files (`asgn0`, `asgn1`, `asgn2`)
can also be opened directly as `file://` HTML pages.
