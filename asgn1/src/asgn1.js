
const POINT    = 0;
const TRIANGLE = 1;
const CIRCLE   = 2;

var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_Size;

var g_shapesList     = [];
var g_selectedType   = POINT;
var g_selectedColor  = [1.0, 1.0, 1.0, 1.0]; // RGBA
var g_selectedSize   = 10.0;
var g_selectedSegments = 10;
var g_pictureDrawn   = false; 

var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position  = a_Position;
    gl_PointSize = u_Size;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  addActionsForHtmlUI();

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  renderAllShapes();
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.error('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.error('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_Size      = gl.getUniformLocation(gl.program, 'u_Size');

  if (a_Position < 0 || !u_FragColor || !u_Size) {
    console.error('Failed to get storage location of GLSL variables.');
  }
}

function addActionsForHtmlUI() {


  document.getElementById('btn-clear').onclick = function() {
    g_shapesList = [];
    g_pictureDrawn = false;
    renderAllShapes();
  };
  document.getElementById('btn-picture').onclick = drawPicture;

  document.getElementById('slider-size').addEventListener('input', function() {
    g_selectedSize = parseFloat(this.value);
    document.getElementById('label-size').textContent = this.value;
  });

  document.getElementById('slider-segments').addEventListener('input', function() {
    g_selectedSegments = parseInt(this.value);
    document.getElementById('label-segments').textContent = this.value;
  });

  document.getElementById('slider-red').addEventListener('input', function() {
    g_selectedColor[0] = parseFloat(this.value) / 255;
    document.getElementById('label-red').textContent = this.value;
  });
  document.getElementById('slider-green').addEventListener('input', function() {
    g_selectedColor[1] = parseFloat(this.value) / 255;
    document.getElementById('label-green').textContent = this.value;
  });
  document.getElementById('slider-blue').addEventListener('input', function() {
    g_selectedColor[2] = parseFloat(this.value) / 255;
    document.getElementById('label-blue').textContent = this.value;
  });

  canvas.onmousedown = function(ev) { click(ev); };
  canvas.onmousemove = function(ev) { if (ev.buttons == 1) click(ev); };
}

function updateColorPreview() {
  var c = g_selectedColor;
  var el = document.getElementById('color-preview');
  el.style.background = 'rgba('
    + Math.round(c[0]*255) + ','
    + Math.round(c[1]*255) + ','
    + Math.round(c[2]*255) + ','
    + c[3] + ')';
}

function click(ev) {
  var xy = convertCoordinatesEventToGL(ev);
  var color = g_selectedColor.slice();

  var shape;
  if (g_selectedType === POINT) {
    shape = new Point(xy, color, g_selectedSize);
  } else if (g_selectedType === TRIANGLE) {
    shape = new Triangle(xy, color, g_selectedSize);
  } else {
    shape = new Circle(xy, color, g_selectedSize, g_selectedSegments);
  }

  g_shapesList.push(shape);
  renderAllShapes();
}

function convertCoordinatesEventToGL(ev) {
  var rect = ev.target.getBoundingClientRect();
  var x = ((ev.clientX - rect.left) / canvas.width)  *  2 - 1;
  var y = ((ev.clientY - rect.top)  / canvas.height) * -2 + 1;
  return [x, y];
}

function renderAllShapes() {
  var start = performance.now();

  gl.clear(gl.COLOR_BUFFER_BIT);

  if (g_pictureDrawn) {
    drawPictureRaw();
  }

  for (var i = 0; i < g_shapesList.length; i++) {
    g_shapesList[i].render();
  }

  var elapsed = performance.now() - start;
  document.getElementById('perf').textContent =
    'Shapes: ' + g_shapesList.length + '  |  Render: ' + elapsed.toFixed(1) + 'ms';
}


function drawPicture() {
  g_pictureDrawn = true;
  renderAllShapes();
}

function drawPictureRaw() {
  function setColor(r, g, b, a) {
    gl.uniform4f(u_FragColor, r, g, b, a === undefined ? 1.0 : a);
  }

  // Hand 

  // Wrist 
  setColor(0.88, 0.66, 0.48);
  drawTriangle([-0.28, -0.55,  0.28, -0.55,  0.22, -0.80]); 
  drawTriangle([-0.28, -0.55, -0.22, -0.80,  0.22, -0.80]); 

  // Palm
  setColor(0.96, 0.78, 0.62);
  drawTriangle([-0.36, -0.55,  0.36, -0.55,  0.36,  0.05]); 
  drawTriangle([-0.36, -0.55, -0.36,  0.05,  0.36,  0.05]); 

  // Index finger
  drawTriangle([-0.34,  0.03, -0.16,  0.03, -0.16,  0.62]); 
  drawTriangle([-0.34,  0.03, -0.34,  0.62, -0.16,  0.62]); 
  drawTriangle([-0.34,  0.62, -0.16,  0.62, -0.25,  0.72]); // rounded tip

  // Middle finger
  drawTriangle([-0.13,  0.03,  0.05,  0.03,  0.05,  0.74]); 
  drawTriangle([-0.13,  0.03, -0.13,  0.74,  0.05,  0.74]); 
  drawTriangle([-0.13,  0.74,  0.05,  0.74, -0.04,  0.85]); //rounded tip

  // Ring finger
  drawTriangle([ 0.07,  0.03,  0.25,  0.03,  0.25,  0.62]);
  drawTriangle([ 0.07,  0.03,  0.07,  0.62,  0.25,  0.62]); 
  drawTriangle([ 0.07,  0.62,  0.25,  0.62,  0.16,  0.72]); // rounded tip

  // Pinky
  drawTriangle([ 0.27,  0.03,  0.40,  0.03,  0.40,  0.46]); 
  drawTriangle([ 0.27,  0.03,  0.27,  0.46,  0.40,  0.46]);
  drawTriangle([ 0.27,  0.46,  0.40,  0.46,  0.335, 0.55]); // rounded tip

  // Thumb
  drawTriangle([-0.36, -0.40, -0.62, -0.12, -0.50,  0.10]); 
  drawTriangle([-0.36, -0.40, -0.50,  0.10, -0.30, -0.15]); 
  drawTriangle([-0.62, -0.12, -0.50,  0.10, -0.64,  0.18]); //thumb tip



  // Fingernails
  setColor(0.95, 0.87, 0.85);
  drawTriangle([-0.32,  0.50, -0.18,  0.50, -0.25,  0.62]); //index
  drawTriangle([-0.11,  0.62,  0.03,  0.62, -0.04,  0.74]); //middle
  drawTriangle([ 0.09,  0.50,  0.23,  0.50,  0.16,  0.62]); //ring
  drawTriangle([ 0.28,  0.36,  0.39,  0.36,  0.335, 0.46]); //pinky
}
