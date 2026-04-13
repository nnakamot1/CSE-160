// Point.js — Renders a single colored square point using gl.POINTS

class Point {
  constructor(position, color, size) {
    this.position = position; // [x, y] in clip space
    this.color = color;       // [r, g, b, a]
    this.size = size;         // float (pixels)
  }

  render() {
    var xy = this.position;
    var rgba = this.color;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, this.size);

    // Load position into buffer and draw
    var vertices = new Float32Array([xy[0], xy[1]]);
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
