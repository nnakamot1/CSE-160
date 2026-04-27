var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

var gl, canvas;
var a_Position, u_FragColor, u_ModelMatrix, u_GlobalRotation;

var g_globalAngleY = 30, g_globalAngleX = -20;
var g_joint1 = 0, g_joint2 = 0, g_joint3 = 0;

var g_animOn = false;
var g_startTime = 0, g_seconds = 0;

var g_anim_fl = 0, g_anim_fr = 0, g_anim_bl = 0, g_anim_br = 0;
var g_anim_tail = 0, g_anim_head = 0;

var g_isDragging = false, g_lastMouseX = 0, g_lastMouseY = 0;
var g_pokeActive = false, g_pokeStart = 0;

var g_frameCount = 0, g_lastFPSTime = 0, g_fps = 0;

// Colors
var WHITE  = [1.0, 1.0, 1.0, 1.0];
var PINK   = [1.0, 0.7, 0.7, 1.0];
var CREAM  = [1.0, 0.95, 0.7, 1.0];
var LEGCOL = [0.95, 0.95, 0.95, 1.0];
var HOOF   = [0.25, 0.15, 0.1, 1.0];
var GRAY   = [0.6, 0.6, 0.6, 1.0];
var BLACK  = [0.1, 0.1, 0.1, 1.0];

function main() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) { console.error('No WebGL'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.15, 0.15, 0.2, 1.0);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Shader init failed');
    return;
  }

  a_Position      = gl.getAttribLocation(gl.program,  'a_Position');
  u_FragColor     = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_ModelMatrix   = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');

  initCube();
  initCylinder();
  addActionsForHtmlUI();
  renderScene();
}

function addActionsForHtmlUI() {
  function sliderBind(id, labelId, varSetter) {
    var el = document.getElementById(id);
    el.addEventListener('input', function() {
      varSetter(parseFloat(this.value));
      document.getElementById(labelId).textContent = this.value;
      renderScene();
    });
  }

  sliderBind('slider-angle-y', 'label-angle-y', function(v){ g_globalAngleY = v; });
  sliderBind('slider-angle-x', 'label-angle-x', function(v){ g_globalAngleX = v; });
  sliderBind('slider-joint1',  'label-joint1',  function(v){ g_joint1 = v; });
  sliderBind('slider-joint2',  'label-joint2',  function(v){ g_joint2 = v; });
  sliderBind('slider-joint3',  'label-joint3',  function(v){ g_joint3 = v; });

  document.getElementById('btn-anim-on').onclick = function() {
    if (!g_animOn) {
      g_animOn = true;
      g_startTime = performance.now() - g_seconds * 1000;
      g_lastFPSTime = performance.now();
      g_frameCount = 0;
      requestAnimationFrame(tick);
    }
  };
  document.getElementById('btn-anim-off').onclick = function() {
    g_animOn = false;
    g_pokeActive = false;
  };

  canvas.onmousedown = function(ev) {
    if (ev.shiftKey) { triggerPoke(); return; }
    g_isDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
  };
  canvas.onmousemove = function(ev) {
    if (!g_isDragging) return;
    g_globalAngleY += (ev.clientX - g_lastMouseX) * 0.5;
    g_globalAngleX += (ev.clientY - g_lastMouseY) * 0.5;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    renderScene();
  };
  canvas.onmouseup = function() { g_isDragging = false; };
  canvas.onmouseleave = function() { g_isDragging = false; };
}

function triggerPoke() {
  g_pokeActive = true;
  g_pokeStart = g_seconds;
  if (!g_animOn) {
    g_animOn = true;
    g_startTime = performance.now() - g_seconds * 1000;
    g_lastFPSTime = performance.now();
    g_frameCount = 0;
    requestAnimationFrame(tick);
  }
}

function tick() {
  g_seconds = (performance.now() - g_startTime) / 1000;
  updateAnimationAngles();
  renderScene();

  g_frameCount++;
  var now = performance.now();
  if (now - g_lastFPSTime >= 1000) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_lastFPSTime = now;
  }

  if (g_animOn) requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_pokeActive) {
    var t = g_seconds - g_pokeStart;
    g_anim_head = (t < 1.5) ? 60 * Math.sin(t * Math.PI / 1.5) : 0;
    if (t >= 1.5) {
      g_pokeActive = false;
      if (!g_animOn) return;
    }
    return;
  }

  var s = g_seconds * 3;
  g_anim_fl = 30 * Math.sin(s);
  g_anim_br = 30 * Math.sin(s);
  g_anim_fr = 30 * Math.sin(s + Math.PI);
  g_anim_bl = 30 * Math.sin(s + Math.PI);
  g_anim_tail = 25 * Math.sin(g_seconds * 4);
  g_anim_head = 5 * Math.sin(g_seconds * 2);
}

// Build a matrix starting from scratch, translate to (tx,ty,tz)
function makeM(tx, ty, tz) {
  var M = new Matrix4();
  M.setTranslate(tx, ty, tz);
  return M;
}

// Draw a limb segment: M is the joint matrix, w/h/d are dimensions,
// the cube hangs downward (center aligned, top at joint y, bottom at joint y - h)
function drawLimb(M, w, h, d, color) {
  var lM = new Matrix4(M);
  lM.translate(-w * 0.5, -h, -d * 0.5);
  lM.scale(w, h, d);
  drawCube(lM, color);
}

// Draw a box oriented normally (from corner)
function drawBox(tx, ty, tz, w, h, d, color) {
  var M = new Matrix4();
  M.setTranslate(tx, ty, tz);
  M.scale(w, h, d);
  drawCube(M, color);
}

function renderScene() {
  var renderStart = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var gr = new Matrix4();
  gr.setRotate(g_globalAngleY, 0, 1, 0);
  gr.rotate(g_globalAngleX, 1, 0, 0);
  gr.scale(0.55, 0.55, 0.55);  // fit cow in clip space
  gl.uniformMatrix4fv(u_GlobalRotation, false, gr.elements);

  drawCow();

  var elapsed = performance.now() - renderStart;
  document.getElementById('perf').textContent =
    'FPS: ' + g_fps + ' | Render: ' + elapsed.toFixed(1) + 'ms';
}

function drawCow() {
  // ---- Body ----
  // Centered at origin: x: -0.4..0.4, y: -0.15..0.15, z: -0.55..0.55
  drawBox(-0.4, -0.15, -0.55,  0.8, 0.3, 1.1,  WHITE);

  // Spots — protrude from body surfaces to avoid z-fighting
  drawBox( 0.40, -0.08, -0.05,  0.04, 0.20, 0.32, BLACK); // right flank
  drawBox(-0.44, -0.05, -0.30,  0.04, 0.16, 0.22, BLACK); // left flank
  drawBox(-0.15,  0.15, -0.20,  0.30, 0.04, 0.35, BLACK); // top

  // ---- Udder ----
  drawBox(-0.2, -0.27, -0.3,  0.4, 0.12, 0.35,  PINK);

  // ---- Head ----
  // Head joint: front of body, slightly above center
  var headJoint = new Matrix4();
  headJoint.setTranslate(0, 0.05, 0.55);
  headJoint.rotate(g_anim_head, 1, 0, 0);

  var headM = new Matrix4(headJoint);
  headM.translate(-0.22, -0.16, 0.0);
  headM.scale(0.44, 0.36, 0.42);
  drawCube(headM, WHITE);

  // Eyes — upper half of face, protrude past front face (z=0.42)
  var lEyeM = new Matrix4(headJoint);
  lEyeM.translate(-0.17, 0.06, 0.39);
  lEyeM.scale(0.14, 0.14, 0.06);
  drawCube(lEyeM, BLACK);

  var rEyeM = new Matrix4(headJoint);
  rEyeM.translate(0.03, 0.06, 0.39);
  rEyeM.scale(0.14, 0.14, 0.06);
  drawCube(rEyeM, BLACK);

  // ---- Muzzle (3rd level: body->head->muzzle) ----
  var muzzleM = new Matrix4(headJoint);
  muzzleM.translate(-0.16, -0.13, 0.38);
  muzzleM.scale(0.32, 0.24, 0.18);
  drawCube(muzzleM, PINK);

  // ---- Left Ear ----
  var lEarM = new Matrix4(headJoint);
  lEarM.translate(-0.30, 0.18, 0.05);
  lEarM.scale(0.12, 0.14, 0.08);
  drawCube(lEarM, PINK);

  // ---- Right Ear ----
  var rEarM = new Matrix4(headJoint);
  rEarM.translate(0.18, 0.18, 0.05);
  rEarM.scale(0.12, 0.14, 0.08);
  drawCube(rEarM, PINK);

  // ---- Left Horn ----
  var lHornM = new Matrix4(headJoint);
  lHornM.translate(-0.26, 0.20, 0.10);
  lHornM.rotate(-20, 0, 0, 1);
  lHornM.scale(0.07, 0.18, 0.07);
  drawCube(lHornM, CREAM);

  // ---- Right Horn ----
  var rHornM = new Matrix4(headJoint);
  rHornM.translate(0.19, 0.20, 0.10);
  rHornM.rotate(20, 0, 0, 1);
  rHornM.scale(0.07, 0.18, 0.07);
  drawCube(rHornM, CREAM);

  // ---- Tail (cylinder non-cube primitive) ----
  // Upright tail sticking up from back of body, wagging side-to-side
  var tailBase = new Matrix4();
  tailBase.setTranslate(0, 0.1, -0.55);
  tailBase.rotate(g_anim_tail, 0, 1, 0);

  var tailM = new Matrix4(tailBase);
  tailM.translate(-0.04, 0, -0.04);
  tailM.scale(0.08, 0.28, 0.08);
  drawCylinder(tailM, GRAY);

  // Tail tuft at top of cylinder
  tailBase.translate(0, 0.28, 0);
  var tuftM = new Matrix4(tailBase);
  tuftM.translate(-0.07, 0, -0.07);
  tuftM.scale(0.14, 0.14, 0.14);
  drawCube(tuftM, BLACK);

  // ---- Legs ----
  drawLegChain(-0.28, -0.15,  0.32, g_animOn ? g_anim_fl : g_joint1, g_animOn ? g_anim_fl * 0.5 : g_joint2, g_animOn ? 0 : g_joint3); // FL
  drawLegChain( 0.28, -0.15,  0.32, g_animOn ? g_anim_fr : 0,        g_animOn ? g_anim_fr * 0.5 : 0,        0);                       // FR
  drawLegChain(-0.28, -0.15, -0.32, g_animOn ? g_anim_bl : 0,        g_animOn ? g_anim_bl * 0.5 : 0,        0);                       // BL
  drawLegChain( 0.28, -0.15, -0.32, g_animOn ? g_anim_br : 0,        g_animOn ? g_anim_br * 0.5 : 0,        0);                       // BR
}

function drawLegChain(hipX, hipY, hipZ, angle1, angle2, angle3) {
  var UL_W = 0.14, UL_H = 0.22, UL_D = 0.14;
  var LL_W = 0.11, LL_H = 0.20, LL_D = 0.11;
  var HF_W = 0.18, HF_H = 0.06, HF_D = 0.22;

  // Hip joint
  var M = new Matrix4();
  M.setTranslate(hipX, hipY, hipZ);
  M.rotate(angle1, 1, 0, 0);

  // Upper leg
  drawLimb(M, UL_W, UL_H, UL_D, LEGCOL);

  // Descend to knee
  M.translate(0, -UL_H, 0);
  M.rotate(angle2, 1, 0, 0);

  // Lower leg
  drawLimb(M, LL_W, LL_H, LL_D, LEGCOL);

  // Descend to ankle
  M.translate(0, -LL_H, 0);
  M.rotate(angle3, 1, 0, 0);

  // Hoof
  var hM = new Matrix4(M);
  hM.translate(-HF_W * 0.5, -HF_H, -HF_D * 0.25);
  hM.scale(HF_W, HF_H, HF_D);
  drawCube(hM, HOOF);
}
