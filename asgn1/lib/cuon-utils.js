// cuon-utils.js — helper functions matching the Matsuda/Lea textbook API

/**
 * getWebGLContext(canvas)
 * Get the WebGL rendering context for a canvas element.
 */
function getWebGLContext(canvas, opt_debug) {
  var gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) {
    console.error('Failed to get the rendering context for WebGL');
    return null;
  }
  return gl;
}

/**
 * initShaders(gl, vshader, fshader)
 * Compile and link vertex and fragment shaders into a program.
 */
function initShaders(gl, vshader, fshader) {
  var vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vshader);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error('Vertex shader error: ' + gl.getShaderInfoLog(vs));
    return false;
  }

  var fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fshader);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error('Fragment shader error: ' + gl.getShaderInfoLog(fs));
    return false;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error: ' + gl.getProgramInfoLog(program));
    return false;
  }

  gl.useProgram(program);
  gl.program = program;
  return true;
}
