Assignment 5 - Three.js Exploration World
=========================================

Open `asgn5.html` through a local web server or GitHub Pages. The page uses
Three.js with OrbitControls, MTLLoader, and OBJLoader.

Requirements covered:

- 20+ primary shapes: boxes, cylinders, spheres, cones, and a torus.
- At least one textured primary shape: the circuit cube and stone pillars.
- At least one animated shape: crystals, ring, model, and textured cube animate.
- Custom textured model: `models/beacon.obj` loads with `models/beacon.mtl`.
- Three or more light types: ambient, directional, hemisphere, point, and spot.
- Textured skybox: a generated cubemap background is applied as the scene sky.
- Perspective camera with mouse controls: `PerspectiveCamera` + `OrbitControls`.

Wow feature:

Clicking the custom beacon model triggers an interactive raycast event with
animated particles and a pulsing point light. A camera-facing in-world status
panel explains the interaction while staying visible as the camera moves.
