class Camera {
  constructor() {
    this.fov = 60;
    this.eye = new Vector3([16, 1.5, 29]);
    this.at  = new Vector3([16, 1.5, 20]);
    this.up  = new Vector3([0, 1, 0]);
    this.speed = 0.07;
    this.rotSpeed = 3.0;
    this.viewMatrix = new Matrix4();
    this.projMatrix = new Matrix4();
    this.updateMatrices();
  }

  updateMatrices() {
    let e = this.eye.elements, a = this.at.elements, u = this.up.elements;
    this.viewMatrix.setLookAt(e[0],e[1],e[2], a[0],a[1],a[2], u[0],u[1],u[2]);
    this.projMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
  }

  moveForward() {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye); f.normalize(); f.mul(this.speed);
    this.eye.add(f); this.at.add(f);
    this.updateMatrices();
  }

  moveBackwards() {
    let b = new Vector3(this.eye.elements);
    b.sub(this.at); b.normalize(); b.mul(this.speed);
    this.eye.add(b); this.at.add(b);
    this.updateMatrices();
  }

  moveLeft() {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye);
    let s = Vector3.cross(this.up, f);
    s.normalize(); s.mul(this.speed);
    this.eye.add(s); this.at.add(s);
    this.updateMatrices();
  }

  moveRight() {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye);
    let s = Vector3.cross(f, this.up);
    s.normalize(); s.mul(this.speed);
    this.eye.add(s); this.at.add(s);
    this.updateMatrices();
  }

  panLeft() {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye);
    let rot = new Matrix4();
    rot.setRotate(this.rotSpeed, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let fPrime = rot.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateMatrices();
  }

  panRight() {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye);
    let rot = new Matrix4();
    rot.setRotate(-this.rotSpeed, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let fPrime = rot.multiplyVector3(f);
    this.at.set(this.eye);
    this.at.add(fPrime);
    this.updateMatrices();
  }

  panByDelta(dx, dy) {
    let f = new Vector3(this.at.elements);
    f.sub(this.eye);

    let rotY = new Matrix4();
    rotY.setRotate(-dx * 0.2, 0, 1, 0);
    f = rotY.multiplyVector3(f);

    let right = Vector3.cross(f, this.up);
    right.normalize();
    let rotX = new Matrix4();
    rotX.setRotate(-dy * 0.2, right.elements[0], right.elements[1], right.elements[2]);
    f = rotX.multiplyVector3(f);

    this.at.set(this.eye);
    this.at.add(f);
    this.updateMatrices();
  }
}
