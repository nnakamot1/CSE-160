CSE 160 — Introduction to Computer Graphics
============================================

Coursework for CSE 160, built with raw WebGL (`asgn0`–`asgn4`) and Three.js
(`asgn5`). Each assignment lives in its own folder with its own HTML/JS/README.

**Live site: https://nnakamot1.github.io/CSE-160/** — this is the way to
view all of the projects; every assignment (including the ones that load
textures/models) works correctly from there since it's served over real
HTTP.

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

Viewing the work
----------------

Use the live site above: https://nnakamot1.github.io/CSE-160/

It links out to every assignment (`asgn0`–`asgn5`) from one page, and since
it's real HTTP, texture/model loading works everywhere — no local setup or
server needed.
