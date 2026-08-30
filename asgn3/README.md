Assignment 3 — First-Person World (Bessie the Cow)
====================================================

Serve the repo over HTTP (see the top-level README) and open `asgn4.html`
— the file is named for the assignment it was later extended into
([`asgn4`](../asgn4/README.md) adds Phong lighting on top of this same world).

A textured, collidable first-person block world in the style of Minecraft,
with a wandering NPC cow ("Bessie") and a pet-meter mini-game.

Controls
--------

- **W / A / S / D** — move (with collision against placed blocks and floor
  clamping).
- **Mouse** — look around (pointer-lock camera).
- **F** — pet Bessie when standing near her (`COW_PET_DIST`); boosts the pet
  meter.
- **G** — remove the block in front of the camera.
- Left click (typical for this assignment style) — place a block.

Mechanics
---------

- `g_petMeter` decays over time (`PET_DECAY`) and is boosted by petting
  (`PET_BOOST`); an on-screen bar and story text reflect Bessie's mood.
- World blocks support add/remove with raycasting against the block grid.

Files
-----

- `asgn4.html` / `asgn4.js` — world geometry, camera controls, block
  add/remove, pet-meter game logic.
- `camera.js` — first-person camera (position, look direction, movement).
