// Circle.js — Renders a filled circle using a TRIANGLE_FAN

class Circle {
  constructor(position, color, size, segments) {
    this.position = position; // [x, y] center in clip space
    this.color = color;       // [r, g, b, a]
    this.size = size;         // radius in pixel units
    this.segments = segments; // number of fan triangles
  }

  render() {
    var xy = this.position;
    var rgba = this.color;
    var r = this.size / 200; // convert to clip-space radius
    var n = this.segments;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
    gl.uniform1f(u_Size, this.size);

    // Build TRIANGLE_FAN: center vertex followed by n+1 perimeter vertices
    var verts = [xy[0], xy[1]]; // center
    for (var i = 0; i <= n; i++) {
      var angle = (i / n) * Math.PI * 2;
      verts.push(xy[0] + r * Math.cos(angle));
      verts.push(xy[1] + r * Math.sin(angle));
    }

    var v = new Float32Array(verts);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, n + 2);
  }
}
