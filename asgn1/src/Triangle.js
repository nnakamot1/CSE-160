
function drawTriangle(vertices) {
  var v = new Float32Array(vertices);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

class Triangle {
  constructor(position, color, size) {
    this.position = position; // [x, y] center in clip space
    this.color = color;       // [r, g, b, a]
    this.size = size;         // half-width of the equilateral triangle
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var d = this.size / 200; // convert pixel size to clip-space units (canvas is 400px)

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, this.size);

    // Equilateral triangle centered at (xy[0], xy[1])
    var x = xy[0], y = xy[1];
    drawTriangle([
      x,       y + d,       // top
      x - d,   y - d * 0.577, // bottom-left  (tan(30°) ≈ 0.577)
      x + d,   y - d * 0.577  // bottom-right
    ]);
  }
}
