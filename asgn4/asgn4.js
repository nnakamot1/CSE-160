// ─────────────────────────────────────────────────────────────────────────────
//  CSE 160  –  Assignment 4 : Phong Lighting
//  Built on top of the Asgn3 first-person world (Bessie the cow).
// ─────────────────────────────────────────────────────────────────────────────

// ── Shaders ───────────────────────────────────────────────────────────────────
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  uniform mat4 u_NormalMatrix;    // inverse-transpose of model matrix

  varying vec2 v_UV;
  varying vec3 v_Normal;          // world-space normal
  varying vec3 v_VertPos;         // world-space position

  void main() {
    vec4 worldPos    = u_ModelMatrix * a_Position;
    gl_Position      = u_ProjectionMatrix * u_ViewMatrix * worldPos;
    v_VertPos        = worldPos.xyz;
    v_UV             = a_UV;
    v_Normal         = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;

  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_VertPos;

  // Textures & base colour
  uniform vec4      u_FragColor;
  uniform sampler2D u_Sampler0;      // brick
  uniform sampler2D u_Sampler1;      // stone
  uniform sampler2D u_Sampler2;      // grass
  uniform int       u_whichTex;
  uniform float     u_texColorWeight;

  // Lighting switches
  uniform int  u_LightOn;
  uniform int  u_ShowNormals;

  // Point light
  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;
  uniform vec3 u_CameraPos;

  // Spot light
  uniform int   u_SpotLightOn;
  uniform vec3  u_SpotLightPos;
  uniform vec3  u_SpotLightDir;   // normalised direction the cone points
  uniform float u_SpotCutoff;     // cos(half-angle)

  // ── helpers ─────────────────────────────────────────────────────────────────
  vec4 baseColor() {
    vec4 tex;
    if      (u_whichTex == 0) tex = texture2D(u_Sampler0, v_UV);
    else if (u_whichTex == 1) tex = texture2D(u_Sampler1, v_UV);
    else if (u_whichTex == 2) tex = texture2D(u_Sampler2, v_UV);
    else                      tex = u_FragColor;
    return (1.0 - u_texColorWeight) * u_FragColor + u_texColorWeight * tex;
  }

  // Phong contribution for one light: returns RGB radiance at this fragment.
  vec3 phong(vec3 N, vec3 V, vec3 L, vec3 lightCol) {
    float diff = max(dot(N, L), 0.0);
    vec3  R    = reflect(-L, N);
    float spec = pow(max(dot(R, V), 0.0), 32.0);
    return lightCol * (diff + spec * 0.5);
  }

  void main() {
    // ── Normal visualisation mode ─────────────────────────────────────────────
    if (u_ShowNormals == 1) {
      gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);
      return;
    }

    vec4 base = baseColor();

    // ── No lighting ────────────────────────────────────────────────────────────
    if (u_LightOn == 0) {
      gl_FragColor = base;
      return;
    }

    // ── Phong shading ──────────────────────────────────────────────────────────
    vec3 N = normalize(v_Normal);
    vec3 V = normalize(u_CameraPos - v_VertPos);

    // Ambient
    float Ka = 0.20;
    vec3 ambient = Ka * u_LightColor * base.rgb;

    // Point light diffuse + specular
    vec3 L1 = normalize(u_LightPos - v_VertPos);
    vec3 ptContrib = phong(N, V, L1, u_LightColor);

    // Spot light diffuse + specular
    vec3 spotContrib = vec3(0.0);
    if (u_SpotLightOn == 1) {
      vec3 L2        = normalize(u_SpotLightPos - v_VertPos);
      float cosAngle = dot(-L2, normalize(u_SpotLightDir));
      if (cosAngle > u_SpotCutoff) {
        float intensity = (cosAngle - u_SpotCutoff) / (1.0 - u_SpotCutoff);
        spotContrib = phong(N, V, L2, vec3(1.0, 0.95, 0.7)) * intensity;
      }
    }

    vec3 colour = ambient + base.rgb * (ptContrib + spotContrib);
    gl_FragColor = vec4(colour, base.a);
  }
`;

// ── Globals ───────────────────────────────────────────────────────────────────
var gl, canvas;

// Attribute / uniform locations
var a_Position, a_UV, a_Normal;
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix, u_NormalMatrix;
var u_FragColor, u_whichTex, u_texColorWeight;
var u_LightOn, u_ShowNormals;
var u_LightPos, u_LightColor, u_CameraPos;
var u_SpotLightOn, u_SpotLightPos, u_SpotLightDir, u_SpotCutoff;

// Geometry buffers
var g_cubeBuffer   = null;
var g_cylBuffer    = null, g_cylVertCount  = 0;
var g_sphereBuffer = null, g_sphereVertCount = 0;

// Camera / input
var camera;
var g_keys      = {};
var g_isDragging = false, g_lastMouseX = 0, g_lastMouseY = 0;
var g_lastValidEye = null, g_lastValidAt = null;

// Animation timing
var g_startTime  = performance.now();
var g_prevTime   = performance.now();
var g_seconds    = 0;
var g_fps = 0, g_frameCount = 0, g_lastFPSTime = performance.now();

// ── Lighting state ────────────────────────────────────────────────────────────
var g_lightOn      = true;
var g_showNormals  = false;
var g_spotLightOn  = true;

// Point light orbits the centre of the map
var g_lightAngle  = 0;        // degrees; driven by animation + slider
var g_lightRadius = 8.0;
var g_lightHeight = 5.0;
var g_lightCX     = 16.0;     // orbit centre
var g_lightCZ     = 16.0;
var g_lightPos    = [24.0, 5.0, 16.0];
var g_lightColor  = [1.0, 1.0, 1.0];

// Spotlight: fixed position, pointing straight down
var g_spotPos     = [20.0, 10.0, 8.0];
var g_spotDir     = [0.0, -1.0, 0.0];
var g_spotCutoff  = Math.cos(Math.PI / 8);   // ~22.5° half-angle

// OBJ model
var g_model = null;

// ── Pet meter ─────────────────────────────────────────────────────────────────
var g_petMeter   = 100.0;
var PET_DECAY    = 4.0;
var PET_BOOST    = 35.0;
var COW_POS      = [15.5, 22.0];
var COW_PET_DIST = 3.0;
var g_anim_fl=0, g_anim_fr=0, g_anim_bl=0, g_anim_br=0, g_anim_tail=0;

// ── World map (32×32) ─────────────────────────────────────────────────────────
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

// ── Cube geometry (pos3 + uv2 + normal3 = 8 floats/vertex) ───────────────────
// Unit cube [0,1]³  –  face normals baked in per vertex
var CUBE_VERTS = new Float32Array([
  // front  z=1   normal  0, 0, 1
  0,0,1, 0,0,  0,0,1,   1,0,1, 1,0,  0,0,1,   1,1,1, 1,1,  0,0,1,
  0,0,1, 0,0,  0,0,1,   1,1,1, 1,1,  0,0,1,   0,1,1, 0,1,  0,0,1,
  // back   z=0   normal  0, 0,-1
  1,0,0, 0,0,  0,0,-1,  0,0,0, 1,0,  0,0,-1,  0,1,0, 1,1,  0,0,-1,
  1,0,0, 0,0,  0,0,-1,  0,1,0, 1,1,  0,0,-1,  1,1,0, 0,1,  0,0,-1,
  // left   x=0   normal -1, 0, 0
  0,0,0, 0,0, -1,0,0,   0,0,1, 1,0, -1,0,0,   0,1,1, 1,1, -1,0,0,
  0,0,0, 0,0, -1,0,0,   0,1,1, 1,1, -1,0,0,   0,1,0, 0,1, -1,0,0,
  // right  x=1   normal  1, 0, 0
  1,0,1, 0,0,  1,0,0,   1,0,0, 1,0,  1,0,0,   1,1,0, 1,1,  1,0,0,
  1,0,1, 0,0,  1,0,0,   1,1,0, 1,1,  1,0,0,   1,1,1, 0,1,  1,0,0,
  // top    y=1   normal  0, 1, 0
  0,1,1, 0,0,  0,1,0,   1,1,1, 1,0,  0,1,0,   1,1,0, 1,1,  0,1,0,
  0,1,1, 0,0,  0,1,0,   1,1,0, 1,1,  0,1,0,   0,1,0, 0,1,  0,1,0,
  // bottom y=0   normal  0,-1, 0
  0,0,0, 0,0,  0,-1,0,  1,0,0, 1,0,  0,-1,0,  1,0,1, 1,1,  0,-1,0,
  0,0,0, 0,0,  0,-1,0,  1,0,1, 1,1,  0,-1,0,  0,0,1, 0,1,  0,-1,0,
]);

function initCube() {
  g_cubeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.STATIC_DRAW);
}

function bindCube() {
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cubeBuffer);
  var F = CUBE_VERTS.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 8*F, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 8*F, 3*F);
  gl.enableVertexAttribArray(a_UV);
  gl.vertexAttribPointer(a_Normal,   3, gl.FLOAT, false, 8*F, 5*F);
  gl.enableVertexAttribArray(a_Normal);
}

function drawCube(M, color, weight, texId) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  setNormalMatrix(M);
  gl.uniform4fv(u_FragColor, color);
  gl.uniform1f(u_texColorWeight, weight);
  if (weight > 0) gl.uniform1i(u_whichTex, texId);
  bindCube();
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// ── Cylinder (cow tail/neck etc.)  pos3+uv2+norm3 ────────────────────────────
// Axis from y=0 to y=1, centred at x=0.5, z=0.5, radius=0.5
function initCylinder() {
  var segs = 12, verts = [];
  for (var i = 0; i < segs; i++) {
    var a0 = (i / segs) * 2 * Math.PI;
    var a1 = ((i + 1) / segs) * 2 * Math.PI;
    var x0 = 0.5 + 0.5*Math.cos(a0), z0 = 0.5 + 0.5*Math.sin(a0);
    var x1 = 0.5 + 0.5*Math.cos(a1), z1 = 0.5 + 0.5*Math.sin(a1);
    var nx0 = Math.cos(a0), nz0 = Math.sin(a0);
    var nx1 = Math.cos(a1), nz1 = Math.sin(a1);

    // Side quad
    verts.push(x0,0,z0, 0,0, nx0,0,nz0);
    verts.push(x1,0,z1, 0,0, nx1,0,nz1);
    verts.push(x1,1,z1, 0,0, nx1,0,nz1);
    verts.push(x0,0,z0, 0,0, nx0,0,nz0);
    verts.push(x1,1,z1, 0,0, nx1,0,nz1);
    verts.push(x0,1,z0, 0,0, nx0,0,nz0);

    // Bottom cap (normal 0,-1,0)
    verts.push(0.5,0,0.5, 0,0, 0,-1,0);
    verts.push(x1,  0,z1, 0,0, 0,-1,0);
    verts.push(x0,  0,z0, 0,0, 0,-1,0);

    // Top cap (normal 0,1,0)
    verts.push(0.5,1,0.5, 0,0, 0,1,0);
    verts.push(x0,  1,z0, 0,0, 0,1,0);
    verts.push(x1,  1,z1, 0,0, 0,1,0);
  }
  g_cylVertCount = verts.length / 8;
  g_cylBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
}

function drawCylinder(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  setNormalMatrix(M);
  gl.uniform4fv(u_FragColor, color);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_cylBuffer);
  var F = Float32Array.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 8*F, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 8*F, 3*F);
  gl.enableVertexAttribArray(a_UV);
  gl.vertexAttribPointer(a_Normal,   3, gl.FLOAT, false, 8*F, 5*F);
  gl.enableVertexAttribArray(a_Normal);
  gl.drawArrays(gl.TRIANGLES, 0, g_cylVertCount);
}

// ── Sphere (UV sphere, pos3+uv2+norm3) ───────────────────────────────────────
function buildSphereVerts(radius, latBands, lonBands) {
  var verts = [];
  for (var lat = 0; lat < latBands; lat++) {
    for (var lon = 0; lon < lonBands; lon++) {
      var theta0 = (lat / latBands) * Math.PI;
      var theta1 = ((lat + 1) / latBands) * Math.PI;
      var phi0   = (lon / lonBands) * 2 * Math.PI;
      var phi1   = ((lon + 1) / lonBands) * 2 * Math.PI;

      // Four corners of the quad (unit sphere)
      var p = [
        [Math.sin(theta0)*Math.cos(phi0), Math.cos(theta0), Math.sin(theta0)*Math.sin(phi0)],
        [Math.sin(theta1)*Math.cos(phi0), Math.cos(theta1), Math.sin(theta1)*Math.sin(phi0)],
        [Math.sin(theta1)*Math.cos(phi1), Math.cos(theta1), Math.sin(theta1)*Math.sin(phi1)],
        [Math.sin(theta0)*Math.cos(phi1), Math.cos(theta0), Math.sin(theta0)*Math.sin(phi1)],
      ];

      var tris = [[0,1,2],[0,2,3]];
      for (var t = 0; t < 2; t++) {
        for (var k = 0; k < 3; k++) {
          var c = p[tris[t][k]];
          // For a unit sphere: normal == position
          verts.push(c[0]*radius, c[1]*radius, c[2]*radius,  // pos
                     0, 0,                                    // uv (unused)
                     c[0], c[1], c[2]);                       // normal
        }
      }
    }
  }
  return new Float32Array(verts);
}

function initSphere() {
  var data = buildSphereVerts(0.5, 24, 24);
  g_sphereVertCount = data.length / 8;
  g_sphereBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

function drawSphere(M, color) {
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  setNormalMatrix(M);
  gl.uniform4fv(u_FragColor, color);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.bindBuffer(gl.ARRAY_BUFFER, g_sphereBuffer);
  var F = Float32Array.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 8*F, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_UV,       2, gl.FLOAT, false, 8*F, 3*F);
  gl.enableVertexAttribArray(a_UV);
  gl.vertexAttribPointer(a_Normal,   3, gl.FLOAT, false, 8*F, 5*F);
  gl.enableVertexAttribArray(a_Normal);
  gl.drawArrays(gl.TRIANGLES, 0, g_sphereVertCount);
}

// ── Normal-matrix helper ─────────────────────────────────────────────────────
function setNormalMatrix(M) {
  var nm = new Matrix4();
  nm.setInverseOf(M);
  nm.transpose();
  gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);
}

// ── Procedural textures ───────────────────────────────────────────────────────
function makeBrickTex() {
  var sz = 16, c = document.createElement('canvas');
  c.width = c.height = sz;
  var ctx = c.getContext('2d');
  for (var y = 0; y < sz; y++) for (var x = 0; x < sz; x++) {
    var mortar = (y===0||y===8)||((y<8)&&(x===0||x===8))||((y>=8)&&(x===4||x===12));
    var n = Math.floor(Math.random()*20)-10;
    var v = mortar ? 90+n : 158+n;
    ctx.fillStyle='rgb('+v+','+v+','+v+')'; ctx.fillRect(x,y,1,1);
  }
  return c;
}
function makeStoneTex() {
  var sz=16, c=document.createElement('canvas');
  c.width=c.height=sz; var ctx=c.getContext('2d');
  for(var y=0;y<sz;y++) for(var x=0;x<sz;x++){ctx.fillStyle='#555';ctx.fillRect(x,y,1,1);}
  [[0,0,5,4],[6,0,4,5],[11,0,5,3],[0,5,3,5],[4,6,5,4],[10,4,6,5],[0,11,6,5],[7,11,4,5],[12,10,4,6]].forEach(function(b){
    for(var cy=b[1];cy<b[1]+b[3];cy++) for(var cx=b[0];cx<b[0]+b[2];cx++){
      if(cx<0||cx>=sz||cy<0||cy>=sz) continue;
      var n=Math.floor(Math.random()*24)-12, v=118+n;
      ctx.fillStyle='rgb('+v+','+v+','+v+')'; ctx.fillRect(cx,cy,1,1);
    }
  });
  return c;
}
function makeGrassTex() {
  var sz=16, c=document.createElement('canvas');
  c.width=c.height=sz; var ctx=c.getContext('2d');
  for(var y=0;y<sz;y++) for(var x=0;x<sz;x++){
    var n=Math.floor(Math.random()*20)-10;
    ctx.fillStyle='rgb('+(90+n)+','+(160+n)+','+(50+n)+')'; ctx.fillRect(x,y,1,1);
  }
  return c;
}
function loadTexFromCanvas(cvs, unit) {
  var tex=gl.createTexture(); gl.activeTexture(gl.TEXTURE0+unit);
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cvs);
  return tex;
}

// ── main() ────────────────────────────────────────────────────────────────────
function main() {
  canvas = document.getElementById('webgl');
  gl     = getWebGLContext(canvas);
  if (!gl) { console.error('No WebGL'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;

  // Attribute locations
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_UV       = gl.getAttribLocation(gl.program, 'a_UV');
  a_Normal   = gl.getAttribLocation(gl.program, 'a_Normal');

  // Matrix uniforms
  u_ModelMatrix      = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix       = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_NormalMatrix     = gl.getUniformLocation(gl.program, 'u_NormalMatrix');

  // Material uniforms
  u_FragColor      = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_whichTex       = gl.getUniformLocation(gl.program, 'u_whichTex');
  u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');

  // Lighting uniforms
  u_LightOn     = gl.getUniformLocation(gl.program, 'u_LightOn');
  u_ShowNormals = gl.getUniformLocation(gl.program, 'u_ShowNormals');
  u_LightPos    = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor  = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_CameraPos   = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_SpotLightOn  = gl.getUniformLocation(gl.program, 'u_SpotLightOn');
  u_SpotLightPos = gl.getUniformLocation(gl.program, 'u_SpotLightPos');
  u_SpotLightDir = gl.getUniformLocation(gl.program, 'u_SpotLightDir');
  u_SpotCutoff   = gl.getUniformLocation(gl.program, 'u_SpotCutoff');

  // Bind texture samplers to texture units 0/1/2
  gl.uniform1i(gl.getUniformLocation(gl.program,'u_Sampler0'), 0);
  gl.uniform1i(gl.getUniformLocation(gl.program,'u_Sampler1'), 1);
  gl.uniform1i(gl.getUniformLocation(gl.program,'u_Sampler2'), 2);

  // Build geometry
  initCube();
  initCylinder();
  initSphere();

  // Load procedural textures
  loadTexFromCanvas(makeBrickTex(), 0);
  loadTexFromCanvas(makeStoneTex(), 1);
  loadTexFromCanvas(makeGrassTex(), 2);

  // Camera
  camera = new Camera();
  g_lastValidEye = new Vector3(camera.eye.elements);
  g_lastValidAt  = new Vector3(camera.at.elements);

  // Try to auto-load the bundled torus OBJ
  g_model = new Model();
  g_model.loadFromURL('torus.obj');

  setupInputHandlers();
  updateButtonStyles();
  requestAnimationFrame(tick);
}

// ── UI callbacks ──────────────────────────────────────────────────────────────
function toggleLight()   { g_lightOn     = !g_lightOn;     updateButtonStyles(); }
function toggleNormals() { g_showNormals = !g_showNormals; updateButtonStyles(); }
function toggleSpot()    { g_spotLightOn = !g_spotLightOn; updateButtonStyles(); }

function updateButtonStyles() {
  setBtnState('btn-light',   g_lightOn,     'Lighting');
  setBtnState('btn-normals', g_showNormals, 'Normals');
  setBtnState('btn-spot',    g_spotLightOn, 'Spot Light');
}
function setBtnState(id, state, label) {
  var b = document.getElementById(id);
  if (!b) return;
  b.textContent = label + ': ' + (state ? 'ON' : 'OFF');
  b.className   = state ? 'on' : 'off';
}

function onAngleSlider(val) {
  g_lightAngle = parseFloat(val);
  document.getElementById('lbl-angle').textContent = Math.round(g_lightAngle) + '°';
  updateLightPosFromAngle();
}

function updateLightColor() {
  var r = parseInt(document.getElementById('sl-lr').value) / 255;
  var g2 = parseInt(document.getElementById('sl-lg').value) / 255;
  var b = parseInt(document.getElementById('sl-lb').value) / 255;
  g_lightColor = [r, g2, b];
}

function updateLightPosFromAngle() {
  var rad = g_lightAngle * Math.PI / 180;
  g_lightPos[0] = g_lightCX + g_lightRadius * Math.cos(rad);
  g_lightPos[1] = g_lightHeight;
  g_lightPos[2] = g_lightCZ + g_lightRadius * Math.sin(rad);
}

function loadOBJFromFile(input) {
  var file = input.files[0];
  if (!file) return;
  g_model = new Model();
  g_model.loadFromFile(file);
}

// ── Input ─────────────────────────────────────────────────────────────────────
function setupInputHandlers() {
  document.addEventListener('keydown', function(ev) {
    g_keys[ev.code] = true;
    if (ev.code === 'KeyF') handleFKey();
    if (ev.code === 'KeyG') removeBlockInFront();
  });
  document.addEventListener('keyup', function(ev) { g_keys[ev.code] = false; });

  canvas.addEventListener('mousedown', function(ev) {
    g_isDragging = true; g_lastMouseX = ev.clientX; g_lastMouseY = ev.clientY;
  });
  canvas.addEventListener('mousemove', function(ev) {
    if (!g_isDragging) return;
    camera.panByDelta(ev.clientX - g_lastMouseX, ev.clientY - g_lastMouseY);
    g_lastMouseX = ev.clientX; g_lastMouseY = ev.clientY;
  });
  canvas.addEventListener('mouseup',    function() { g_isDragging = false; });
  canvas.addEventListener('mouseleave', function() { g_isDragging = false; });

  canvas.addEventListener('click', function() { canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', function() {
    if (document.pointerLockElement === canvas)
      document.addEventListener('mousemove', onLockedMouseMove);
    else
      document.removeEventListener('mousemove', onLockedMouseMove);
  });
}
function onLockedMouseMove(ev) { camera.panByDelta(ev.movementX, ev.movementY); }

// ── Pet meter helpers ─────────────────────────────────────────────────────────
var g_lastPetTick = performance.now();
function nearCow() {
  var dx = camera.eye.elements[0]-COW_POS[0], dz = camera.eye.elements[2]-COW_POS[1];
  return Math.sqrt(dx*dx+dz*dz) < COW_PET_DIST;
}
function updatePetMeter() {
  var now = performance.now(), dt = (now-g_lastPetTick)/1000; g_lastPetTick = now;
  g_petMeter = Math.max(0, Math.min(100, g_petMeter - PET_DECAY*dt));
  var bar = document.getElementById('pet-bar');
  if (bar) { bar.style.width=g_petMeter+'%'; bar.style.background=g_petMeter>60?'#44dd44':g_petMeter>25?'#f0a020':'#e03030'; }
}
function checkStory() {
  var el = document.getElementById('story');
  if (!el) return;
  if (nearCow())            el.textContent='Bessie is right here! Press F to pet her.';
  else if (g_petMeter<=0)   el.textContent='Bessie is lonely! Run back!';
  else if (g_petMeter<25)   el.textContent='Bessie is getting sad...';
  else if (g_petMeter<60)   el.textContent='Bessie wants some attention.';
  else                      el.textContent='Bessie is happy!';
}
function handleFKey() {
  if (nearCow()) g_petMeter = Math.min(100, g_petMeter + PET_BOOST);
  else            addBlockInFront();
}

// ── Collision ─────────────────────────────────────────────────────────────────
function isBlocked(x, z) {
  var eyeY = camera.eye.elements[1], m = 0.35;
  var pts = [[x-m,z],[x+m,z],[x,z-m],[x,z+m]];
  for (var i=0;i<4;i++) {
    var tx=Math.floor(pts[i][0]), tz=Math.floor(pts[i][1]);
    if (tx<0||tx>=32||tz<0||tz>=32) return true;
    var h=g_map[tz][tx];
    if (h>0&&eyeY<h+0.5) return true;
  }
  return false;
}
function fixCollision() {
  var e=camera.eye.elements, le=g_lastValidEye.elements;
  if (!isBlocked(e[0],e[2])) { g_lastValidEye.set(camera.eye); return; }
  var fwd=new Vector3(camera.at.elements); fwd.sub(camera.eye);
  if (!isBlocked(e[0],le[2])) { camera.eye.elements[2]=le[2]; camera.at.set(camera.eye); camera.at.add(fwd); g_lastValidEye.set(camera.eye); camera.updateMatrices(); return; }
  if (!isBlocked(le[0],e[2])) { camera.eye.elements[0]=le[0]; camera.at.set(camera.eye); camera.at.add(fwd); g_lastValidEye.set(camera.eye); camera.updateMatrices(); return; }
  camera.eye.set(g_lastValidEye); camera.at.set(camera.eye); camera.at.add(fwd); camera.updateMatrices();
}
function clampFloor() { if (camera.eye.elements[1]<1.5){camera.eye.elements[1]=1.5;camera.updateMatrices();} }
function processKeys() {
  if (g_keys['KeyW']) { camera.moveForward();   fixCollision(); clampFloor(); }
  if (g_keys['KeyS']) { camera.moveBackwards(); fixCollision(); clampFloor(); }
  if (g_keys['KeyA']) { camera.moveLeft();      fixCollision(); clampFloor(); }
  if (g_keys['KeyD']) { camera.moveRight();     fixCollision(); clampFloor(); }
  if (g_keys['KeyQ']) camera.panLeft();
  if (g_keys['KeyE']) camera.panRight();
}

// ── Block add/remove ──────────────────────────────────────────────────────────
function getBlockInFront() {
  var f=new Vector3(camera.at.elements); f.sub(camera.eye); f.normalize(); f.mul(1.5);
  return [Math.floor(camera.eye.elements[0]+f.elements[0]), Math.floor(camera.eye.elements[2]+f.elements[2])];
}
function addBlockInFront()    { var [tx,tz]=getBlockInFront(); if(tx>=0&&tx<32&&tz>=0&&tz<32&&g_map[tz][tx]<4) g_map[tz][tx]++; }
function removeBlockInFront() { var [tx,tz]=getBlockInFront(); if(tx>=0&&tx<32&&tz>=0&&tz<32&&g_map[tz][tx]>0) g_map[tz][tx]--; }

// ── Render loop ───────────────────────────────────────────────────────────────
function tick() {
  var now = performance.now();
  var dt  = Math.min((now - g_prevTime) / 1000, 0.05); // cap dt at 50ms
  g_prevTime = now;
  g_seconds  = (now - g_startTime) / 1000;

  // Animate point light: 30°/s orbit
  g_lightAngle = (g_lightAngle + 30 * dt) % 360;
  updateLightPosFromAngle();
  // Sync slider
  var sl = document.getElementById('sl-angle');
  if (sl) { sl.value = g_lightAngle; document.getElementById('lbl-angle').textContent = Math.round(g_lightAngle) + '°'; }

  processKeys();
  updatePetMeter();
  updateCowAnim();
  renderScene();

  g_frameCount++;
  if (now - g_lastFPSTime >= 1000) {
    g_fps = g_frameCount; g_frameCount = 0; g_lastFPSTime = now;
    document.getElementById('fps').textContent = 'FPS: ' + g_fps;
  }
  requestAnimationFrame(tick);
}

function updateCowAnim() {
  var amp  = g_petMeter>60?25:g_petMeter>25?14:g_petMeter>0?5:0;
  var tail = g_petMeter>25?20:4, s=g_seconds*2.5;
  g_anim_fl=amp*Math.sin(s); g_anim_br=amp*Math.sin(s);
  g_anim_fr=amp*Math.sin(s+Math.PI); g_anim_bl=amp*Math.sin(s+Math.PI);
  g_anim_tail=tail*Math.sin(g_seconds*3.5);
}

// ── renderScene ───────────────────────────────────────────────────────────────
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix,       false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projMatrix.elements);

  // Pass all lighting uniforms
  gl.uniform3fv(u_CameraPos,    camera.eye.elements);
  gl.uniform3fv(u_LightPos,     new Float32Array(g_lightPos));
  gl.uniform3fv(u_LightColor,   new Float32Array(g_lightColor));
  gl.uniform1i (u_SpotLightOn,  g_spotLightOn ? 1 : 0);
  gl.uniform3fv(u_SpotLightPos, new Float32Array(g_spotPos));
  gl.uniform3fv(u_SpotLightDir, new Float32Array(g_spotDir));
  gl.uniform1f (u_SpotCutoff,   g_spotCutoff);

  // ── Sky: always unlit, no normal viz
  gl.uniform1i(u_LightOn,     0);
  gl.uniform1i(u_ShowNormals, 0);
  drawSky();

  // ── Everything else uses current lighting settings
  gl.uniform1i(u_LightOn,     g_lightOn     ? 1 : 0);
  gl.uniform1i(u_ShowNormals, g_showNormals ? 1 : 0);

  drawGround();
  drawWorld();
  drawCow(15.0, 0.25, 22.0);

  // Spheres
  var s1 = new Matrix4(); s1.setTranslate(10, 1, 10); s1.scale(2,2,2);
  drawSphere(s1, [0.85, 0.25, 0.25, 1.0]);

  var s2 = new Matrix4(); s2.setTranslate(22, 1, 10); s2.scale(2,2,2);
  drawSphere(s2, [0.25, 0.35, 0.90, 1.0]);

  var s3 = new Matrix4(); s3.setTranslate(16, 2, 7); s3.scale(1.5,1.5,1.5);
  drawSphere(s3, [0.25, 0.85, 0.35, 1.0]);

  // OBJ model (torus), placed near centre of map
  if (g_model && g_model.ready) {
    var mM = new Matrix4();
    mM.setTranslate(16, 2, 16);
    mM.scale(1.5, 1.5, 1.5);
    mM.rotate(g_seconds * 40, 0, 1, 0);
    g_model.draw(mM, [0.75, 0.60, 0.90, 1.0]);
  }

  // ── Light marker cube: always unlit & no normal viz
  gl.uniform1i(u_LightOn,     0);
  gl.uniform1i(u_ShowNormals, 0);
  var lM = new Matrix4();
  lM.setTranslate(g_lightPos[0]-0.15, g_lightPos[1]-0.15, g_lightPos[2]-0.15);
  lM.scale(0.3, 0.3, 0.3);
  drawCube(lM, [1.0, 1.0, 0.0, 1.0], 0, 0);   // bright yellow marker

  // Spotlight marker
  var spM = new Matrix4();
  spM.setTranslate(g_spotPos[0]-0.15, g_spotPos[1]-0.15, g_spotPos[2]-0.15);
  spM.scale(0.3, 0.3, 0.3);
  drawCube(spM, [1.0, 0.65, 0.0, 1.0], 0, 0);  // orange marker

  // Restore lighting state for next frame (just in case)
  gl.uniform1i(u_LightOn,     g_lightOn     ? 1 : 0);
  gl.uniform1i(u_ShowNormals, g_showNormals ? 1 : 0);

  checkStory();
}

// ── Scene elements ────────────────────────────────────────────────────────────
function drawSky() {
  var M = new Matrix4(), e = camera.eye.elements;
  M.setTranslate(e[0]-500, e[1]-500, e[2]-500);
  M.scale(1000, 1000, 1000);
  var speed = 0.01+(g_petMeter/100)*2.5, vibe=g_petMeter/100, t=g_seconds*speed;
  var r=0.05+0.18*vibe*Math.abs(Math.sin(t*0.7));
  var g2=0.06+0.30*vibe*Math.abs(Math.sin(t*0.5+1.4));
  var b=0.20+0.20*vibe*Math.abs(Math.sin(t*0.4+2.8));
  drawCube(M, [r,g2,b,1.0], 0, 0);
}

function drawGround() {
  var M = new Matrix4();
  M.setTranslate(0, -0.05, 0); M.scale(32, 0.1, 32);
  drawCube(M, [0.25, 0.70, 0.25, 1.0], 1.0, 2);
}

function drawWorld() {
  for (var z=0;z<32;z++) for (var x=0;x<32;x++) {
    var h = g_map[z][x]; if (h===0) continue;
    for (var y=0;y<h;y++) {
      var M = new Matrix4(); M.setTranslate(x,y,z);
      drawCube(M, [1,1,1,1], 1.0, h<=2?0:1);
    }
  }
}

// ── Cow (from asgn2/asgn3) ────────────────────────────────────────────────────
var WHITE=[1,1,1,1], PINK=[1,.7,.7,1], CREAM=[1,.95,.7,1];
var LEGCOL=[.95,.95,.95,1], HOOF=[.25,.15,.1,1], GRAY=[.6,.6,.6,1], BLACK=[.1,.1,.1,1];

function cowBox(tx,ty,tz,w,h,d,color){ var M=new Matrix4(); M.setTranslate(tx,ty,tz); M.scale(w,h,d); drawCube(M,color,0,0); }
function cowLimb(M,w,h,d,color){ var lM=new Matrix4(M); lM.translate(-w*.5,-h,-d*.5); lM.scale(w,h,d); drawCube(lM,color,0,0); }
function cowLegChain(ox,oy,oz,hipX,hipY,hipZ,a1,a2){
  var UL_W=.14,UL_H=.22,UL_D=.14,LL_W=.11,LL_H=.20,LL_D=.11,HF_W=.18,HF_H=.06,HF_D=.22;
  var M=new Matrix4(); M.setTranslate(ox+hipX,oy+hipY,oz+hipZ); M.rotate(a1,1,0,0);
  cowLimb(M,UL_W,UL_H,UL_D,LEGCOL);
  M.translate(0,-UL_H,0); M.rotate(a2,1,0,0); cowLimb(M,LL_W,LL_H,LL_D,LEGCOL);
  M.translate(0,-LL_H,0); var hM=new Matrix4(M); hM.translate(-HF_W*.5,-HF_H,-HF_D*.25); hM.scale(HF_W,HF_H,HF_D);
  drawCube(hM,HOOF,0,0);
}
function drawCow(ox,oy,oz) {
  cowBox(ox-.4,oy-.15+.44,oz-.55,.8,.3,1.1,WHITE);
  cowBox(ox+.40,oy-.08+.44,oz-.05,.04,.20,.32,BLACK);
  cowBox(ox-.44,oy-.05+.44,oz-.30,.04,.16,.22,BLACK);
  cowBox(ox-.15,oy+.15+.44,oz-.20,.30,.04,.35,BLACK);
  cowBox(ox-.2,oy-.27+.44,oz-.3,.4,.12,.35,PINK);
  var hj=new Matrix4(); hj.setTranslate(ox,oy+.05+.44,oz+.55);
  var hM=new Matrix4(hj); hM.translate(-.22,-.16,0); hM.scale(.44,.36,.42); drawCube(hM,WHITE,0,0);
  var lE=new Matrix4(hj); lE.translate(-.17,.06,.39); lE.scale(.14,.14,.06); drawCube(lE,BLACK,0,0);
  var rE=new Matrix4(hj); rE.translate(.03,.06,.39);  rE.scale(.14,.14,.06); drawCube(rE,BLACK,0,0);
  var mz=new Matrix4(hj); mz.translate(-.16,-.13,.38); mz.scale(.32,.24,.18); drawCube(mz,PINK,0,0);
  var lEar=new Matrix4(hj); lEar.translate(-.30,.18,.05); lEar.scale(.12,.14,.08); drawCube(lEar,PINK,0,0);
  var rEar=new Matrix4(hj); rEar.translate(.18,.18,.05);  rEar.scale(.12,.14,.08); drawCube(rEar,PINK,0,0);
  var lH=new Matrix4(hj); lH.translate(-.26,.20,.10); lH.rotate(-20,0,0,1); lH.scale(.07,.18,.07); drawCube(lH,CREAM,0,0);
  var rH=new Matrix4(hj); rH.translate(.19,.20,.10);  rH.rotate(20,0,0,1);  rH.scale(.07,.18,.07); drawCube(rH,CREAM,0,0);
  var tb=new Matrix4(); tb.setTranslate(ox,oy+.1+.44,oz-.55); tb.rotate(g_anim_tail,0,1,0);
  var tM=new Matrix4(tb); tM.translate(-.04,0,-.04); tM.scale(.08,.28,.08); drawCylinder(tM,GRAY);
  tb.translate(0,.28,0); var tfM=new Matrix4(tb); tfM.translate(-.07,0,-.07); tfM.scale(.14,.14,.14); drawCube(tfM,BLACK,0,0);
  cowLegChain(ox,oy+.44,oz,-.28,-.15, .32,g_anim_fl,g_anim_fl*.5);
  cowLegChain(ox,oy+.44,oz, .28,-.15, .32,g_anim_fr,g_anim_fr*.5);
  cowLegChain(ox,oy+.44,oz,-.28,-.15,-.32,g_anim_bl,g_anim_bl*.5);
  cowLegChain(ox,oy+.44,oz, .28,-.15,-.32,g_anim_br,g_anim_br*.5);
}
