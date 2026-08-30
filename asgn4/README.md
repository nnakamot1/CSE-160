Assignment 4 — Phong Lighting
==============================

Serve the repo over HTTP (see the top-level README) and open `asgn4.html`.

Built on top of the [`asgn3`](../asgn3/README.md) first-person world
("Bessie the cow"), extended with real-time per-pixel Phong lighting.

Lighting features
------------------

- Per-vertex normals passed to the fragment shader (`a_Normal`,
  `u_NormalMatrix`) for world-space lighting.
- **Point light** — position/color driven ambient + diffuse + specular term.
- **Spot light** — cone-limited light (`u_SpotLightPos`, `u_SpotLightDir`,
  `u_SpotCutoff`) with its own on/off toggle.
- Toggle-able overall lighting (`u_LightOn`) and multiple sampled textures
  (brick, stone, etc.) blended with the lighting result.

Controls
--------

Same movement/interaction controls as [`asgn3`](../asgn3/README.md) (WASD +
mouse-look, pet Bessie, place/remove blocks), plus on-screen controls for
toggling and repositioning the point/spot lights.

Files
-----

- `asgn4.html` / `asgn4.js` — Phong vertex/fragment shaders, light uniforms,
  world/game logic carried over from `asgn3`.
- `camera.js` — first-person camera.
- `Model.js` — loads and renders the custom OBJ model.
- `torus.obj` — custom model used in the scene.
