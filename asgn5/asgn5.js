import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 250);
camera.position.set(11, 8, 15);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 1.2, 0);
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 5;
controls.maxDistance = 42;

const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const animatedObjects = [];
const clickableObjects = [];
const particles = [];
let pulseTime = 0;
let beaconLight;
let statusSprite;

function loadTexture(path, repeatX = 1, repeatY = 1) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

function createSkybox() {
  const canvasSize = 512;
  const names = [
    ['px', '#ffb85e', '#315c75'],
    ['nx', '#d5676f', '#274a66'],
    ['py', '#77bfe3', '#f7d88a'],
    ['ny', '#253447', '#1a2634'],
    ['pz', '#ef8b67', '#2e657c'],
    ['nz', '#b86888', '#22465f'],
  ];

  const urls = names.map(([label, top, bottom]) => {
    const face = document.createElement('canvas');
    face.width = canvasSize;
    face.height = canvasSize;
    const ctx = face.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasSize);
    gradient.addColorStop(0, top);
    gradient.addColorStop(1, bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    for (let i = 0; i < 34; i++) {
      const x = (i * 83 + label.charCodeAt(0) * 29) % canvasSize;
      const y = (i * 47 + label.charCodeAt(1) * 17) % Math.floor(canvasSize * 0.58);
      const r = 1.1 + (i % 3) * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 231, 184, 0.35)';
    ctx.fillRect(0, canvasSize * 0.62, canvasSize, canvasSize * 0.09);
    return face.toDataURL('image/png');
  });

  const cubeTexture = new THREE.CubeTextureLoader().load(urls);
  cubeTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = cubeTexture;
}

function addLights() {
  const ambient = new THREE.AmbientLight(0xd8eef0, 0.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d0, 1.6);
  sun.position.set(-8, 12, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -24;
  sun.shadow.camera.right = 24;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  scene.add(sun);

  const hemi = new THREE.HemisphereLight(0x8bd6ff, 0x395237, 0.55);
  scene.add(hemi);

  beaconLight = new THREE.PointLight(0x79e1ff, 3.5, 22, 1.8);
  beaconLight.position.set(0, 3.2, 0);
  beaconLight.castShadow = true;
  scene.add(beaconLight);

  const spot = new THREE.SpotLight(0xffd37a, 85, 32, Math.PI / 7, 0.35, 1.4);
  spot.position.set(7, 9, -5);
  spot.target.position.set(0, 0, 0);
  spot.castShadow = true;
  scene.add(spot, spot.target);
}

function addPrimaryShapes() {
  const stone = loadTexture('assets/stone.svg', 6, 6);
  const circuit = loadTexture('assets/circuit.svg', 1, 1);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x52614f, roughness: 0.9 });
  const stoneMat = new THREE.MeshStandardMaterial({ map: stone, roughness: 0.82 });
  const circuitMat = new THREE.MeshStandardMaterial({
    map: circuit,
    emissive: 0x17464d,
    emissiveIntensity: 0.35,
    roughness: 0.48,
  });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x9ea7aa, metalness: 0.25, roughness: 0.35 });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x85f0ff,
    emissive: 0x1b6e78,
    emissiveIntensity: 0.85,
    roughness: 0.22,
    transparent: true,
    opacity: 0.82,
  });
  const warmMat = new THREE.MeshStandardMaterial({ color: 0xe8a45c, roughness: 0.58 });

  const ground = new THREE.Mesh(new THREE.BoxGeometry(24, 0.45, 24), groundMat);
  ground.position.y = -0.25;
  ground.receiveShadow = true;
  scene.add(ground);

  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const radius = i % 2 === 0 ? 10.5 : 8.8;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.5, 2 + (i % 3) * 0.35, 16), stoneMat);
    pillar.position.set(Math.cos(angle) * radius, pillar.geometry.parameters.height / 2 - 0.03, Math.sin(angle) * radius);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 16), i % 4 === 0 ? crystalMat : metalMat);
    cap.position.set(pillar.position.x, pillar.geometry.parameters.height + 0.32, pillar.position.z);
    cap.castShadow = true;
    scene.add(cap);
    if (i % 4 === 0) animatedObjects.push({ mesh: cap, baseY: cap.position.y, spin: 0.8 + i * 0.05 });
  }

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 1.25), i === 0 ? circuitMat : warmMat);
    cube.position.set(Math.cos(angle) * 5.2, 0.28, Math.sin(angle) * 5.2);
    cube.rotation.y = -angle;
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
    if (i === 0) animatedObjects.push({ mesh: cube, baseY: cube.position.y, spin: 1.3 });
  }

  const ringGeometry = new THREE.TorusGeometry(2.1, 0.08, 12, 80);
  const ring = new THREE.Mesh(ringGeometry, crystalMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  ring.castShadow = true;
  scene.add(ring);
  animatedObjects.push({ mesh: ring, baseY: ring.position.y, spin: 0.35 });

  for (let i = 0; i < 12; i++) {
    const shard = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.15 + (i % 3) * 0.28, 5), crystalMat);
    const angle = (i / 12) * Math.PI * 2;
    shard.position.set(Math.cos(angle) * 2.7, 0.62, Math.sin(angle) * 2.7);
    shard.rotation.z = Math.sin(angle) * 0.22;
    shard.castShadow = true;
    scene.add(shard);
    animatedObjects.push({ mesh: shard, baseY: shard.position.y, spin: -0.45 });
  }
}

function loadTexturedModel() {
  const mtlLoader = new MTLLoader();
  mtlLoader.setPath('models/');
  mtlLoader.load('beacon.mtl', (materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath('models/');
    objLoader.load('beacon.obj', (model) => {
      model.position.set(-0.7, 0, -0.7);
      model.scale.set(1.65, 1.65, 1.65);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.clickable = true;
          clickableObjects.push(child);
        }
      });
      scene.add(model);
      animatedObjects.push({ mesh: model, baseY: model.position.y, spin: 0.18 });
    });
  });
}

function createStatusSprite() {
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 512;
  labelCanvas.height = 160;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(10, 20, 24, 0.72)';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#79e1ff';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);
  ctx.fillStyle = '#f6fbf7';
  ctx.font = 'bold 34px Arial';
  ctx.fillText('BEACON READY', 94, 67);
  ctx.font = '24px Arial';
  ctx.fillStyle = '#c9f2ee';
  ctx.fillText('click the tower to charge it', 74, 111);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  statusSprite = new THREE.Sprite(material);
  statusSprite.position.set(0, 5.9, 0);
  statusSprite.scale.set(4.6, 1.45, 1);
  scene.add(statusSprite);
}

function createParticles() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xf8df8b,
    emissive: 0xe9b949,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  for (let i = 0; i < 36; i++) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), material);
    particle.position.set(0, 1.5, 0);
    particle.visible = false;
    particle.castShadow = false;
    scene.add(particle);
    particles.push({
      mesh: particle,
      angle: (i / 36) * Math.PI * 2,
      radius: 0.6 + (i % 6) * 0.3,
      height: 1.4 + (i % 5) * 0.22,
    });
  }
}

function triggerPulse() {
  pulseTime = 3.2;
  particles.forEach((particle) => {
    particle.mesh.visible = true;
  });
}

function onPointerDown(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickableObjects, false);
  if (hits.length > 0) triggerPulse();
}

function updateMovement(delta) {
  const speed = 7.2 * delta;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const movement = new THREE.Vector3();
  if (keys.KeyW) movement.add(forward);
  if (keys.KeyS) movement.sub(forward);
  if (keys.KeyD) movement.add(right);
  if (keys.KeyA) movement.sub(right);

  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(speed);
    camera.position.add(movement);
    controls.target.add(movement);
  }
}

const keys = {};
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});
canvas.addEventListener('pointerdown', onPointerDown);

function resizeRendererToDisplaySize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== Math.floor(width * renderer.getPixelRatio())
    || canvas.height !== Math.floor(height * renderer.getPixelRatio());
  if (needResize) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);
  resizeRendererToDisplaySize();

  const delta = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;
  updateMovement(delta);

  animatedObjects.forEach(({ mesh, baseY, spin }, index) => {
    mesh.rotation.y += delta * spin;
    mesh.position.y = baseY + Math.sin(elapsed * 1.6 + index) * 0.06;
  });

  pulseTime = Math.max(0, pulseTime - delta);
  const pulse = pulseTime > 0 ? Math.sin(pulseTime * 12) * 0.5 + 0.5 : 0;
  beaconLight.intensity = 3.5 + pulse * 8;
  beaconLight.color.setHSL(0.52 + pulse * 0.08, 0.88, 0.58);

  particles.forEach((particle, index) => {
    if (pulseTime <= 0) {
      particle.mesh.visible = false;
      return;
    }
    const a = particle.angle + elapsed * (1.4 + (index % 4) * 0.14);
    const r = particle.radius + (3.2 - pulseTime) * 0.55;
    particle.mesh.position.set(Math.cos(a) * r, particle.height + Math.sin(elapsed * 3 + index) * 0.18, Math.sin(a) * r);
  });

  if (statusSprite) statusSprite.lookAt(camera.position);
  controls.update();
  renderer.render(scene, camera);
}

createSkybox();
addLights();
addPrimaryShapes();
loadTexturedModel();
createStatusSprite();
createParticles();
animate();
