// ── Pet meter ────────────────────────────────────────────────────────────────
var g_petMeter   = 100.0;
var PET_DECAY    = 4.0;   // points lost per second when unattended
var PET_BOOST    = 35.0;  // points gained per F press
var g_lastTickMs = performance.now();

var COW_PET_DIST = 3.0;
var COW_POS      = [15.5, 22.0]; // [x, z]

function nearCow() {
  var dx = camera.eye.elements[0] - COW_POS[0];
  var dz = camera.eye.elements[2] - COW_POS[1];
  return Math.sqrt(dx*dx+dz*dz) < COW_PET_DIST;
}

function updatePetMeter() {
  var now = performance.now();
  var dt  = (now - g_lastTickMs) / 1000;
  g_lastTickMs = now;

  g_petMeter = Math.max(0, Math.min(100, g_petMeter - PET_DECAY * dt));

  var pct = g_petMeter;
  var bar = document.getElementById('pet-bar');
  if (bar) {
    bar.style.width = pct + '%';
    bar.style.background = pct > 60 ? '#44dd44' : pct > 25 ? '#f0a020' : '#e03030';
  }
}

function checkStory() {
  var el = document.getElementById('story');
  if (nearCow()) {
    el.textContent = 'Bessie is right here! Press F to pet her.';
  } else if (g_petMeter <= 0) {
    el.textContent = 'Bessie is lonely and miserable! Run back and pet her!';
  } else if (g_petMeter < 25) {
    el.textContent = 'Bessie is getting sad... hurry back!';
  } else if (g_petMeter < 60) {
    el.textContent = 'Bessie wants some attention.';
  } else {
    el.textContent = 'Bessie is happy! Keep her company.';
  }
}

function handleFKey() {
  if (nearCow()) {
    g_petMeter = Math.min(100, g_petMeter + PET_BOOST);
  } else {
    addBlockInFront();
  }
}

// ── Shaders ────────────────────────────────────────────────────────────────
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec2 v_UV;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec2 v_UV;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTex;
  uniform float u_texColorWeight;
  void main() {
    vec4 texColor;
    if (u_whichTex == 0)      texColor = texture2D(u_Sampler0, v_UV);
    else if (u_whichTex == 1) texColor = texture2D(u_Sampler1, v_UV);
    else                      texColor = texture2D(u_Sampler2, v_UV);
    gl_FragColor = (1.0 - u_texColorWeight) * u_FragColor + u_texColorWeight * texColor;
  }
`;

// ── Globals ─────────────────────────────────────────────────────────────────
var gl, canvas;
var a_Position, a_UV;
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_FragColor, u_whichTex, u_texColorWeight;

var g_cubeBuffer = null;
var g_cylBuffer = null, g_cylVertCount = 0;

var camera;
var g_keys = {};

var g_lastMouseX = 0, g_lastMouseY = 0, g_isDragging = false;

// Collision
var g_lastValidEye = null, g_lastValidAt = null;

var g_animOn = true;
var g_startTime = performance.now(), g_seconds = 0;
var g_fps = 0, g_frameCount = 0, g_lastFPSTime = performance.now();

// ── World Map (32×32) ────────────────────────────────────────────────────────
// 0 = empty, 1-4 = wall height
var g_map = [
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,0,0,0,4],
  [4,0,3,0,3,0,0,2,2,2,2,2,0,0,0,0,0,0,0,2,2,2,2,2,0,3,0,3,0,0,0,4],
  [4,0,3,0,3,0,0,2,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,2,0,3,0,3,0,0,0,4],
  [4,0,3,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,3,0,3,0,0,0,4],
  [4,0,3,3,3,0,0,2,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,2,0,3,3,3,0,0,0,4],
  [4,0,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,2,2,2,2,2,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4],
  [4,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,4],
  [4,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4],
  [4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4],
];

// ── Cow animation state ──────────────────────────────────────────────────────
var g_anim_fl=0, g_anim_fr=0, g_anim_bl=0, g_anim_br=0, g_anim_tail=0;

// ── Geometry: cube with interleaved pos+UV ───────────────────────────────────
// Unit cube [0,1]^3; each face gets UV (0,0)-(1,1)
var CUBE_VERTS = new Float32Array([
  // pos(3) uv(2) — front z=1
  0,0,1, 0,0,  1,0,1, 1,0,  1,1,1, 1,1,
  0,0,1, 0,0,  1,1,1, 1,1,  0,1,1, 0,1,
  // back z=0
  1,0,0, 0,0,  0,0,0, 1,0,  0,1,0, 1,1,
  1,0,0, 0,0,  0,1,0, 1,1,  1,1,0, 0,1,
  // left x=0
  0,0,0, 0,0,  0,0,1, 1,0,  0,1,1, 1,1,
  0,0,0, 0,0,  0,1,1, 1,1,  0,1,0, 0,1,
  // right x=1
  1,0,1, 0,0,  1,0,0, 1,0,  1,1,0, 1,1,
  1,0,1, 0,0,  1,1,0, 1,1,  1,1,1, 0,1,
  // top y=1
  0,1,1, 0,0,  1,1,1, 1,0,  1,1,0, 1,1,
  0,1,1, 0,0,  1,1,0, 1,1,  0,1,0, 0,1,
  // bottom y=0
  0,0,0, 0,0,  1,0,0, 1,0,  1,0,1, 1,1,
  0,0,0, 0,0,  1,0,1, 1,1,  0,0,1, 0,1,
]);

function initCube() {
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.STATIC_DRAW);
}

function bindCube() {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  var FSIZE = CUBE_VERTS.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 5*FSIZE, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 5*FSIZE, 3*FSIZE);
  gl.enableVertexAttribArray(a_UV);
}

// Draw a cube: M = model matrix, color = [r,g,b,a], weight=0 solid color, weight=1 texture
function drawCube(M, color, weight, texId) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_FragColor, color);
  gl.uniform1f(u_texColorWeight, weight);
  if (weight > 0) gl.uniform1i(u_whichTex, texId);
  bindCube();
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// ── Cylinder (for cow tail, reused from asgn2) ───────────────────────────────
function initCylinder() {
  var segs = 12, verts = [];
  for (var i = 0; i < segs; i++) {
    var a0 = (i/segs)*2*Math.PI, a1 = ((i+1)/segs)*2*Math.PI;
    var x0=0.5+0.5*Math.cos(a0), z0=0.5+0.5*Math.sin(a0);
    var x1=0.5+0.5*Math.cos(a1), z1=0.5+0.5*Math.sin(a1);
    verts.push(x0,0,z0, x1,0,z1, x1,1,z1);
    verts.push(x0,0,z0, x1,1,z1, x0,1,z0);
    verts.push(0.5,0,0.5, x1,0,z1, x0,0,z0);
    verts.push(0.5,1,0.5, x0,1,z0, x1,1,z1);
  }
  g_cylVertCount = verts.length / 3;
  g_cylBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function drawCylinder(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4fv(u_FragColor, color);
  gl.uniform1f(u_texColorWeight, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylBuffer);
  // cylinder buffer only has position (3 floats), pad UV to zero
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.disableVertexAttribArray(a_UV);
  gl.vertexAttrib2f(a_UV, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, g_cylVertCount);
}

// ── Procedural textures ──────────────────────────────────────────────────────
// 16×16 Minecraft-style stone brick: offset mortar lines, gray stone fill
function makeBrickTex() {
  var sz = 16, c = document.createElement('canvas');
  c.width = c.height = sz;
  var ctx = c.getContext('2d');
  for (var y = 0; y < sz; y++) {
    for (var x = 0; x < sz; x++) {
      var mortar = (y === 0 || y === 8)
        || (y < 8  && (x === 0 || x === 8))
        || (y >= 8 && (x === 4 || x === 12));
      var n = Math.floor(Math.random() * 20) - 10;
      var v = mortar ? 90 + n : 158 + n;
      ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

// 16×16 Minecraft-style cobblestone: irregular stone blobs with dark mortar
function makeStoneTex() {
  var sz = 16, c = document.createElement('canvas');
  c.width = c.height = sz;
  var ctx = c.getContext('2d');
  // Dark mortar fill
  for (var y = 0; y < sz; y++)
    for (var x = 0; x < sz; x++) { ctx.fillStyle = '#555'; ctx.fillRect(x, y, 1, 1); }
  // Irregular cobble blobs: [x, y, w, h]
  var blobs = [[0,0,5,4],[6,0,4,5],[11,0,5,3],[0,5,3,5],[4,6,5,4],[10,4,6,5],[0,11,6,5],[7,11,4,5],[12,10,4,6]];
  blobs.forEach(function(b) {
    for (var cy = b[1]; cy < b[1]+b[3]; cy++) {
      for (var cx = b[0]; cx < b[0]+b[2]; cx++) {
        if (cx < 0 || cx >= sz || cy < 0 || cy >= sz) continue;
        var n = Math.floor(Math.random() * 24) - 12;
        var v = 118 + n;
        ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
        ctx.fillRect(cx, cy, 1, 1);
      }
    }
  });
  return c;
}

// 16×16 Minecraft-style grass top: green with pixel variation
function makeGrassTex() {
  var sz = 16, c = document.createElement('canvas');
  c.width = c.height = sz;
  var ctx = c.getContext('2d');
  for (var y = 0; y < sz; y++) {
    for (var x = 0; x < sz; x++) {
      var n = Math.floor(Math.random() * 20) - 10;
      ctx.fillStyle = 'rgb(' + (90+n) + ',' + (160+n) + ',' + (50+n) + ')';
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

function loadTexFromCanvas(cvs, unit) {
  var tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cvs);
  return tex;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) { console.error('No WebGL'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  a_Position          = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV                = gl.getAttribLocation(gl.program, 'a_UV');
  u_ModelMatrix       = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix        = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix  = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_FragColor         = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_whichTex          = gl.getUniformLocation(gl.program, 'u_whichTex');
  u_texColorWeight    = gl.getUniformLocation(gl.program, 'u_texColorWeight');

  // Wire samplers to texture units
  gl.uniform1i(gl.getUniformLocation(gl.program, 'u_Sampler0'), 0); // brick
  gl.uniform1i(gl.getUniformLocation(gl.program, 'u_Sampler1'), 1); // stone
  gl.uniform1i(gl.getUniformLocation(gl.program, 'u_Sampler2'), 2); // grass

  initCube();
  initCylinder();

  loadTexFromCanvas(makeBrickTex(), 0);
  loadTexFromCanvas(makeStoneTex(), 1);
  loadTexFromCanvas(makeGrassTex(), 2);

  camera = new Camera();
  g_lastValidEye = new Vector3(camera.eye.elements);
  g_lastValidAt  = new Vector3(camera.at.elements);

  setupInputHandlers();
  requestAnimationFrame(tick);
}

// ── Input ────────────────────────────────────────────────────────────────────
function setupInputHandlers() {
  document.addEventListener('keydown', function(ev) { g_keys[ev.code] = true; });
  document.addEventListener('keyup',   function(ev) { g_keys[ev.code] = false; });

  document.addEventListener('keydown', function(ev) {
    switch(ev.code) {
      case 'KeyF': handleFKey(); break;
      case 'KeyG': removeBlockInFront(); break;
    }
  });

  canvas.addEventListener('mousedown', function(ev) {
    g_isDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  });
  canvas.addEventListener('mousemove', function(ev) {
    if (!g_isDragging) return;
    var dx = ev.clientX - g_lastMouseX;
    var dy = ev.clientY - g_lastMouseY;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    camera.panByDelta(dx, dy);
    renderScene();
  });
  canvas.addEventListener('mouseup',    function() { g_isDragging = false; });
  canvas.addEventListener('mouseleave', function() { g_isDragging = false; });

  // Pointer lock for better mouse control
  canvas.addEventListener('click', function() { canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', function() {
    if (document.pointerLockElement === canvas) {
      document.addEventListener('mousemove', onLockedMouseMove);
    } else {
      document.removeEventListener('mousemove', onLockedMouseMove);
    }
  });
}

function onLockedMouseMove(ev) {
  camera.panByDelta(ev.movementX, ev.movementY);
}

function isBlocked(x, z) {
  var eyeY = camera.eye.elements[1];
  var m = 0.35;
  var pts = [[x-m,z],[x+m,z],[x,z-m],[x,z+m]];
  for (var i = 0; i < 4; i++) {
    var tx = Math.floor(pts[i][0]), tz = Math.floor(pts[i][1]);
    if (tx<0||tx>=32||tz<0||tz>=32) return true; // world border always blocks
    var h = g_map[tz][tx];
    if (h > 0 && eyeY < h + 0.5) return true; // only block if not flying above it
  }
  return false;
}

function fixCollision() {
  var e = camera.eye.elements;
  var lastE = g_lastValidEye.elements;

  if (!isBlocked(e[0], e[2])) {
    g_lastValidEye.set(camera.eye);
    return;
  }

  // Preserve current look direction through any revert
  var fwd = new Vector3(camera.at.elements);
  fwd.sub(camera.eye);

  // Try sliding along Z axis (X blocked)
  if (!isBlocked(e[0], lastE[2])) {
    camera.eye.elements[2] = lastE[2];
    camera.at.set(camera.eye); camera.at.add(fwd);
    g_lastValidEye.set(camera.eye);
    camera.updateMatrices();
    return;
  }

  // Try sliding along X axis (Z blocked)
  if (!isBlocked(lastE[0], e[2])) {
    camera.eye.elements[0] = lastE[0];
    camera.at.set(camera.eye); camera.at.add(fwd);
    g_lastValidEye.set(camera.eye);
    camera.updateMatrices();
    return;
  }

  // Fully blocked — revert position, keep look direction intact
  camera.eye.set(g_lastValidEye);
  camera.at.set(camera.eye); camera.at.add(fwd);
  camera.updateMatrices();
}

function clampFloor() {
  if (camera.eye.elements[1] < 1.5) {
    camera.eye.elements[1] = 1.5;
    camera.updateMatrices();
  }
}

function processKeys() {
  if (g_keys['KeyW']) { camera.moveForward();   fixCollision(); clampFloor(); }
  if (g_keys['KeyS']) { camera.moveBackwards(); fixCollision(); clampFloor(); }
  if (g_keys['KeyA']) { camera.moveLeft();      fixCollision(); clampFloor(); }
  if (g_keys['KeyD']) { camera.moveRight();     fixCollision(); clampFloor(); }
  if (g_keys['KeyQ']) camera.panLeft();
  if (g_keys['KeyE']) camera.panRight();
}

// ── Block add/remove ─────────────────────────────────────────────────────────
function getBlockInFront() {
  let f = new Vector3(camera.at.elements);
  f.sub(camera.eye); f.normalize(); f.mul(1.5);
  let tx = Math.floor(camera.eye.elements[0] + f.elements[0]);
  let tz = Math.floor(camera.eye.elements[2] + f.elements[2]);
  return [tx, tz];
}

function addBlockInFront() {
  let [tx, tz] = getBlockInFront();
  if (tx>=0 && tx<32 && tz>=0 && tz<32 && g_map[tz][tx] < 4)
    g_map[tz][tx]++;
}

function removeBlockInFront() {
  let [tx, tz] = getBlockInFront();
  if (tx>=0 && tx<32 && tz>=0 && tz<32 && g_map[tz][tx] > 0)
    g_map[tz][tx]--;
}

// ── Render loop ──────────────────────────────────────────────────────────────
function tick() {
  g_seconds = (performance.now() - g_startTime) / 1000;
  processKeys();
  updatePetMeter();
  updateCowAnim();
  renderScene();

  g_frameCount++;
  var now = performance.now();
  if (now - g_lastFPSTime >= 1000) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_lastFPSTime = now;
    document.getElementById('fps').textContent = 'FPS: ' + g_fps;
  }

  requestAnimationFrame(tick);
}

function updateCowAnim() {
  // Legs and tail slow down as the meter drops
  var amp  = g_petMeter > 60 ? 25 : g_petMeter > 25 ? 14 : g_petMeter > 0 ? 5 : 0;
  var tail = g_petMeter > 25 ? 20 : 4;
  var s = g_seconds * 2.5;
  g_anim_fl   = amp  * Math.sin(s);
  g_anim_br   = amp  * Math.sin(s);
  g_anim_fr   = amp  * Math.sin(s + Math.PI);
  g_anim_bl   = amp  * Math.sin(s + Math.PI);
  g_anim_tail = tail * Math.sin(g_seconds * 3.5);
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projMatrix.elements);

  drawSky();
  drawGround();
  drawWorld();
  drawCow(15.0, 0.25, 22.0);
  checkStory();
}

// ── Scene elements ────────────────────────────────────────────────────────────
function drawSky() {
  var M = new Matrix4();
  var e = camera.eye.elements;
  M.setTranslate(e[0]-500, e[1]-500, e[2]-500);
  M.scale(1000, 1000, 1000);

  // Speed and vibrancy scale with Bessie's happiness
  var speed = 0.01 + (g_petMeter / 100) * 2.5;
  var vibe  = g_petMeter / 100;
  var t  = g_seconds * speed;
  var r  = 0.05 + 0.18 * vibe * Math.abs(Math.sin(t * 0.7));
  var g2 = 0.06 + 0.30 * vibe * Math.abs(Math.sin(t * 0.5 + 1.4));
  var b  = 0.20 + 0.20 * vibe * Math.abs(Math.sin(t * 0.4 + 2.8));
  drawCube(M, [r, g2, b, 1.0], 0, 0);
}

function drawGround() {
  var M = new Matrix4();
  M.setTranslate(0, -0.05, 0);
  M.scale(32, 0.1, 32);
  drawCube(M, [0.25, 0.70, 0.25, 1.0], 1.0, 2); // grass texture
}

function drawWorld() {
  for (var z = 0; z < 32; z++) {
    for (var x = 0; x < 32; x++) {
      var h = g_map[z][x];
      if (h === 0) continue;

      for (var y = 0; y < h; y++) {
        var M = new Matrix4();
        M.setTranslate(x, y, z);
        var texId = h <= 2 ? 0 : 1; // stone brick for short walls, cobblestone for tall
        drawCube(M, [1.0, 1.0, 1.0, 1.0], 1.0, texId);
      }
    }
  }
}

// ── Cow (adapted from asgn2) ─────────────────────────────────────────────────
var WHITE  = [1.0, 1.0, 1.0, 1.0];
var PINK   = [1.0, 0.7, 0.7, 1.0];
var CREAM  = [1.0, 0.95, 0.7, 1.0];
var LEGCOL = [0.95, 0.95, 0.95, 1.0];
var HOOF   = [0.25, 0.15, 0.1, 1.0];
var GRAY   = [0.6, 0.6, 0.6, 1.0];
var BLACK  = [0.1, 0.1, 0.1, 1.0];

function cowBox(tx,ty,tz,w,h,d,color) {
  var M = new Matrix4();
  M.setTranslate(tx, ty, tz);
  M.scale(w, h, d);
  drawCube(M, color, 0, 0);
}

function cowLimb(M, w, h, d, color) {
  var lM = new Matrix4(M);
  lM.translate(-w*0.5, -h, -d*0.5);
  lM.scale(w, h, d);
  drawCube(lM, color, 0, 0);
}

function cowLegChain(ox, oy, oz, hipX,hipY,hipZ, a1,a2) {
  var UL_W=0.14,UL_H=0.22,UL_D=0.14;
  var LL_W=0.11,LL_H=0.20,LL_D=0.11;
  var HF_W=0.18,HF_H=0.06,HF_D=0.22;
  var M = new Matrix4();
  M.setTranslate(ox+hipX, oy+hipY, oz+hipZ);
  M.rotate(a1, 1,0,0);
  cowLimb(M, UL_W,UL_H,UL_D, LEGCOL);
  M.translate(0,-UL_H,0);
  M.rotate(a2, 1,0,0);
  cowLimb(M, LL_W,LL_H,LL_D, LEGCOL);
  M.translate(0,-LL_H,0);
  var hM = new Matrix4(M);
  hM.translate(-HF_W*0.5,-HF_H,-HF_D*0.25);
  hM.scale(HF_W,HF_H,HF_D);
  drawCube(hM, HOOF, 0, 0);
}

function drawCow(ox, oy, oz) {
  // Body
  cowBox(ox-0.4, oy-0.15+0.44, oz-0.55, 0.8,0.3,1.1, WHITE);
  cowBox(ox+0.40,oy-0.08+0.44, oz-0.05, 0.04,0.20,0.32, BLACK);
  cowBox(ox-0.44,oy-0.05+0.44, oz-0.30, 0.04,0.16,0.22, BLACK);
  cowBox(ox-0.15,oy+0.15+0.44, oz-0.20, 0.30,0.04,0.35, BLACK);
  cowBox(ox-0.2, oy-0.27+0.44, oz-0.3,  0.4,0.12,0.35, PINK);

  // Head
  var headJoint = new Matrix4();
  headJoint.setTranslate(ox, oy+0.05+0.44, oz+0.55);
  var headM = new Matrix4(headJoint);
  headM.translate(-0.22,-0.16,0); headM.scale(0.44,0.36,0.42);
  drawCube(headM, WHITE, 0, 0);

  var lEyeM = new Matrix4(headJoint);
  lEyeM.translate(-0.17,0.06,0.39); lEyeM.scale(0.14,0.14,0.06);
  drawCube(lEyeM, BLACK, 0, 0);
  var rEyeM = new Matrix4(headJoint);
  rEyeM.translate(0.03,0.06,0.39); rEyeM.scale(0.14,0.14,0.06);
  drawCube(rEyeM, BLACK, 0, 0);

  var muzzleM = new Matrix4(headJoint);
  muzzleM.translate(-0.16,-0.13,0.38); muzzleM.scale(0.32,0.24,0.18);
  drawCube(muzzleM, PINK, 0, 0);

  var lEarM = new Matrix4(headJoint);
  lEarM.translate(-0.30,0.18,0.05); lEarM.scale(0.12,0.14,0.08);
  drawCube(lEarM, PINK, 0, 0);
  var rEarM = new Matrix4(headJoint);
  rEarM.translate(0.18,0.18,0.05); rEarM.scale(0.12,0.14,0.08);
  drawCube(rEarM, PINK, 0, 0);

  var lHornM = new Matrix4(headJoint);
  lHornM.translate(-0.26,0.20,0.10); lHornM.rotate(-20,0,0,1); lHornM.scale(0.07,0.18,0.07);
  drawCube(lHornM, CREAM, 0, 0);
  var rHornM = new Matrix4(headJoint);
  rHornM.translate(0.19,0.20,0.10); rHornM.rotate(20,0,0,1); rHornM.scale(0.07,0.18,0.07);
  drawCube(rHornM, CREAM, 0, 0);

  // Tail
  var tailBase = new Matrix4();
  tailBase.setTranslate(ox, oy+0.1+0.44, oz-0.55);
  tailBase.rotate(g_anim_tail, 0,1,0);
  var tailM = new Matrix4(tailBase);
  tailM.translate(-0.04,0,-0.04); tailM.scale(0.08,0.28,0.08);
  drawCylinder(tailM, GRAY);
  tailBase.translate(0,0.28,0);
  var tuftM = new Matrix4(tailBase);
  tuftM.translate(-0.07,0,-0.07); tuftM.scale(0.14,0.14,0.14);
  drawCube(tuftM, BLACK, 0, 0);

  // Legs
  cowLegChain(ox,oy+0.44,oz, -0.28,-0.15, 0.32, g_anim_fl, g_anim_fl*0.5);
  cowLegChain(ox,oy+0.44,oz,  0.28,-0.15, 0.32, g_anim_fr, g_anim_fr*0.5);
  cowLegChain(ox,oy+0.44,oz, -0.28,-0.15,-0.32, g_anim_bl, g_anim_bl*0.5);
  cowLegChain(ox,oy+0.44,oz,  0.28,-0.15,-0.32, g_anim_br, g_anim_br*0.5);
}
