// Model.js  –  simple OBJ loader for CSE 160 Asgn 4
// Loads vertex positions + normals from an OBJ file.
// Buffer layout per vertex: pos(3) + uv(2, dummy) + normal(3) = 8 floats.
// Relies on the global `gl` set up in asgn4.js.

class Model {
  constructor() {
    this.ready    = false;
    this.buffer   = null;
    this.vertCount = 0;
  }

  // Load from a URL (works when served over HTTP/HTTPS)
  loadFromURL(url) {
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.text(); })
      .then(txt => { this.parseOBJ(txt); this.ready = true; console.log('OBJ loaded:', url, this.vertCount, 'verts'); })
      .catch(err => console.warn('Could not load OBJ "' + url + '":', err.message));
  }

  // Load from a File object (from <input type="file">)
  loadFromFile(file) {
    var self = this;
    var reader = new FileReader();
    reader.onload = function(e) {
      self.parseOBJ(e.target.result);
      self.ready = true;
      console.log('OBJ loaded from file:', file.name, self.vertCount, 'verts');
    };
    reader.readAsText(file);
  }

  // Parse OBJ text → build WebGL buffer
  parseOBJ(text) {
    var rawPos = [];   // flat: x,y,z,...
    var rawNorm = [];  // flat: nx,ny,nz,...
    var verts  = [];   // output: interleaved pos(3)+uv(2)+norm(3)

    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.startsWith('v ')) {
        var tok = line.split(/\s+/);
        rawPos.push(parseFloat(tok[1]), parseFloat(tok[2]), parseFloat(tok[3]));
      } else if (line.startsWith('vn ')) {
        var tok = line.split(/\s+/);
        rawNorm.push(parseFloat(tok[1]), parseFloat(tok[2]), parseFloat(tok[3]));
      } else if (line.startsWith('f ')) {
        var parts = line.split(/\s+/).slice(1);
        // fan triangulation for n-gons
        for (var t = 1; t < parts.length - 1; t++) {
          var tri = [parts[0], parts[t], parts[t + 1]];
          for (var k = 0; k < 3; k++) {
            var segs = tri[k].split('/');
            var vi = parseInt(segs[0]) - 1;
            // normal index: slot [2] (format v//vn or v/vt/vn)
            var ni = (segs.length >= 3 && segs[2] !== '') ? parseInt(segs[2]) - 1 : -1;
            var px = rawPos[vi * 3],     py = rawPos[vi * 3 + 1], pz = rawPos[vi * 3 + 2];
            var nx = ni >= 0 ? rawNorm[ni * 3]     : 0;
            var ny = ni >= 0 ? rawNorm[ni * 3 + 1] : 1;
            var nz = ni >= 0 ? rawNorm[ni * 3 + 2] : 0;
            verts.push(px, py, pz, 0, 0, nx, ny, nz);
          }
        }
      }
    }

    this.vertCount = verts.length / 8;
    if (this.buffer) gl.deleteBuffer(this.buffer);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  }

  // Draw with the given model matrix and solid colour
  draw(M, color) {
    if (!this.ready || this.vertCount === 0) return;
    gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
    setNormalMatrix(M);
    gl.uniform4fv(u_FragColor, color);
    gl.uniform1f(u_texColorWeight, 0.0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    var F = Float32Array.BYTES_PER_ELEMENT;
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 8 * F, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 8 * F, 3 * F);
    gl.enableVertexAttribArray(a_UV);
    gl.vertexAttribPointer(a_Normal,   3, gl.FLOAT, false, 8 * F, 5 * F);
    gl.enableVertexAttribArray(a_Normal);
    gl.drawArrays(gl.TRIANGLES, 0, this.vertCount);
  }
}
