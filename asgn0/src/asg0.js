function main() {
  var canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return;
  }

  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var v1 = new Vector3([2.25, 2.25, 0]);
  drawVector(v1, 'red');
}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  var cx = canvas.width / 2;
  var cy = canvas.height / 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + v.elements[0] * 20, cy - v.elements[1] * 20);
  ctx.stroke();
}

function handleDrawEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var v1 = new Vector3([
    parseFloat(document.getElementById('v1x').value),
    parseFloat(document.getElementById('v1y').value),
    0
  ]);
  var v2 = new Vector3([
    parseFloat(document.getElementById('v2x').value),
    parseFloat(document.getElementById('v2y').value),
    0
  ]);

  drawVector(v1, 'red');
  drawVector(v2, 'blue');
}

function handleDrawOperationEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var v1x = parseFloat(document.getElementById('v1x').value);
  var v1y = parseFloat(document.getElementById('v1y').value);
  var v2x = parseFloat(document.getElementById('v2x').value);
  var v2y = parseFloat(document.getElementById('v2y').value);
  var scalar = parseFloat(document.getElementById('scalar').value);
  var operation = document.getElementById('operation').value;

  var v1 = new Vector3([v1x, v1y, 0]);
  var v2 = new Vector3([v2x, v2y, 0]);

  drawVector(v1, 'red');
  drawVector(v2, 'blue');

  if (operation === 'add') {
    var v3 = new Vector3([v1x, v1y, 0]);
    v3.add(v2);
    drawVector(v3, 'green');
  } else if (operation === 'sub') {
    var v3 = new Vector3([v1x, v1y, 0]);
    v3.sub(v2);
    drawVector(v3, 'green');
  } else if (operation === 'mul') {
    var v3 = new Vector3([v1x, v1y, 0]);
    v3.mul(scalar);
    var v4 = new Vector3([v2x, v2y, 0]);
    v4.mul(scalar);
    drawVector(v3, 'green');
    drawVector(v4, 'green');
  } else if (operation === 'div') {
    var v3 = new Vector3([v1x, v1y, 0]);
    v3.div(scalar);
    var v4 = new Vector3([v2x, v2y, 0]);
    v4.div(scalar);
    drawVector(v3, 'green');
    drawVector(v4, 'green');
  } else if (operation === 'magnitude') {
    console.log('Magnitude of v1: ' + v1.magnitude());
    console.log('Magnitude of v2: ' + v2.magnitude());
  } else if (operation === 'normalize') {
    console.log('Magnitude of v1: ' + v1.magnitude());
    console.log('Magnitude of v2: ' + v2.magnitude());
    var v3 = new Vector3([v1x, v1y, 0]);
    v3.normalize();
    var v4 = new Vector3([v2x, v2y, 0]);
    v4.normalize();
    drawVector(v3, 'green');
    drawVector(v4, 'green');
  } else if (operation === 'angle') {
    console.log('Angle between v1 and v2: ' + angleBetween(v1, v2) + ' degrees');
  } else if (operation === 'area') {
    console.log('Area of triangle: ' + areaTriangle(v1, v2));
  }
}

function angleBetween(v1, v2) {
  var dot = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();
  var cosAngle = dot / (mag1 * mag2);
  cosAngle = Math.max(-1, Math.min(1, cosAngle));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

function areaTriangle(v1, v2) {
  var cross = Vector3.cross(v1, v2);
  return cross.magnitude() / 2;
}
