var g_cylBuffer = null;
var g_cylVertCount = 0;

function initCylinder() {
  var segs = 16;
  var verts = [];

  for (var i = 0; i < segs; i++) {
    var a0 = (i / segs) * 2 * Math.PI;
    var a1 = ((i + 1) / segs) * 2 * Math.PI;
    var x0 = 0.5 + 0.5 * Math.cos(a0), z0 = 0.5 + 0.5 * Math.sin(a0);
    var x1 = 0.5 + 0.5 * Math.cos(a1), z1 = 0.5 + 0.5 * Math.sin(a1);

    // Side quad (2 triangles)
    verts.push(x0,0,z0, x1,0,z1, x1,1,z1);
    verts.push(x0,0,z0, x1,1,z1, x0,1,z0);

    // Bottom cap
    verts.push(0.5,0,0.5, x1,0,z1, x0,0,z0);

    // Top cap
    verts.push(0.5,1,0.5, x0,1,z0, x1,1,z1);
  }

  g_cylVertCount = verts.length / 3;
  g_cylBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function drawCylinder(M, color) {
  gl.uniform4fv(u_FragColor, color);
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylBuffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, g_cylVertCount);
}
