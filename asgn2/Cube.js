var g_cubeBuffer = null;

var g_cubeVerts = new Float32Array([
  // Front face z=1
  0,0,1, 1,0,1, 1,1,1,
  0,0,1, 1,1,1, 0,1,1,
  // Back face z=0
  1,0,0, 0,0,0, 0,1,0,
  1,0,0, 0,1,0, 1,1,0,
  // Left face x=0
  0,0,0, 0,0,1, 0,1,1,
  0,0,0, 0,1,1, 0,1,0,
  // Right face x=1
  1,0,1, 1,0,0, 1,1,0,
  1,0,1, 1,1,0, 1,1,1,
  // Top face y=1
  0,1,1, 1,1,1, 1,1,0,
  0,1,1, 1,1,0, 0,1,0,
  // Bottom face y=0
  0,0,0, 1,0,0, 1,0,1,
  0,0,0, 1,0,1, 0,0,1,
]);

function initCube() {
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, g_cubeVerts, gl.STATIC_DRAW);
}

function drawCube(M, color) {
  gl.uniform4fv(u_FragColor, color);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}
