// 'use strict';

var camera,
  scene,
  renderer,
  basePlane,
  baseTexture,
  orbitControls,
  blockCubes = [],
  fences = [],
  animationMixer,
  clock,
  canSpawnAdditionalBarriers = true;

var avatarGroup, avatarCollisionBox, avatarAnimationAction;

var width, height;

var vAngle = 0;
var barrierIndex = 0;

var isJumping = false;
var stopAvatarAtInitPos = false;
var avatarInitiated = false;

//CONSTANTS
const floatTolerance = 0.05;
const avatarModelOffset = -0.09;
const avatarGroupInitYPos = -0.15;
const avatarBoxOffset = -0.24;
const maxJumpYPos = 0.15;
const fenceInitZ = -8;
const fenceReplacementZPos = 2;

const barrierCleanupTime = 8000; //ms
const minDifficultyBarrierSpawnTime = 5000; //ms
const maxDifficultyBarrierSpawnTime = 1500; //ms
var difficultyAccumulator = 0;

const maxLives = 5;
var lives = maxLives;

var c;
var ctx;

var isGameOver = false;

const gameOverImage = new Image();

init();
initScene();
createAvatar();
buildScene();
update();

window.onload = function () {
  c = document.getElementById("uiContainer");
  ctx = c.getContext("2d");
  updateUI();
};

function init() {
  width = window.innerWidth;
  height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
  camera.position.z = 1;

  renderer = new THREE.WebGLRenderer({ antialias: true });

  renderer.setSize(width, height);
  renderer.setClearColor(0x000000);
  renderer.shadowMap.enabled = true;

  document.getElementById("webglContainer").appendChild(renderer.domElement);
  document.addEventListener("keydown", onKeyDown, false);
  window.addEventListener("resize", onResize, false);

  clock = new THREE.Clock();

  gameOverImage.src = "assets/textures/gameOver.png";
}

function initScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, 0.35);
}

function buildScene() {
  createSkybox();
  createLights();
  createBasePlane();
  // createBarrier();
  createFences();
}

function initAvatarControls() {
  orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.target = avatarGroup.position;
  orbitControls.minAzimuthAngle = -Math.PI / 2;
  orbitControls.maxAzimuthAngle = Math.PI / 2;

  orbitControls.minPolarAngle = -Math.PI / 2;
  orbitControls.maxPolarAngle = Math.PI / 2;

  orbitControls.enableDamping = false;
  orbitControls.enableZoom = false;
}

function update() {
  renderer.render(scene, camera);

  baseTexture.offset.y -= 0.025;

  fences.forEach(function (fence) {
    fence.position.z += 0.01;

    if (fence.position.z > fenceReplacementZPos) {
      fence.position.z = fenceInitZ + fenceReplacementZPos;
    }
  });

  blockCubes.forEach(function (barrier) {
    barrier.position.z += 0.01;
  });

  if (avatarInitiated) {
    if (isJumping) {
      isJumping = jump();
    }

    if (avatarAnimationAction.paused != isJumping)
      avatarAnimationAction.paused = isJumping;

    if (animationMixer) {
      animationMixer.update(clock.getDelta());
    }

    orbitControls.update();
    if (!isJumping) checkCollisions();
  }

  requestAnimationFrame(function () {
    update();
  });

  spawnBarrierUpdate();
}

function spawnBarrierUpdate() {
  if (difficultyAccumulator < 1) {
    difficultyAccumulator += clock.getDelta() / 2;
  }

  const barierSpawnTimeOut = lerp(
    minDifficultyBarrierSpawnTime,
    maxDifficultyBarrierSpawnTime,
    difficultyAccumulator
  );

  if (canSpawnAdditionalBarriers && Math.random() < 0.4) {
    canSpawnAdditionalBarriers = false;
    createBarrier();

    setTimeout(function () {
      canSpawnAdditionalBarriers = true;
    }, barierSpawnTimeOut);
  }
}

function onResize() {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  updateUI();
}

function onKeyDown(event) {
  var keyCode = event.which;

  switch (keyCode) {
    case 32:
      isJumping = true;
      break;
  }
}

function jump() {
  vAngle += 0.05;
  var t = Math.sin(this.vAngle) / 2 + 0.5;

  if (stopAvatarAtInitPos && t < floatTolerance) {
    stopAvatarAtInitPos = false;
    return false;
  }
  const y = lerp(avatarGroupInitYPos, maxJumpYPos, t);
  avatarGroup.position.y = y;
  if (Math.round(avatarGroup.position.y * 100) / 100 >= maxJumpYPos) {
    stopAvatarAtInitPos = true;
  }

  return true;
}

function createSkybox() {
  scene.background = new THREE.CubeTextureLoader()
    .setPath("assets/textures/skybox/")
    .load(["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"]);
}

function createLights() {
  var l = new THREE.DirectionalLight(0xffffff, 1);
  l.castShadow = true;
  scene.add(l);

  var l = new THREE.AmbientLight(0xffff00, 0.5);
  scene.add(l);
}

function createBarrier() {
  barrierIndex++;
  var geometry = new THREE.BoxGeometry(0.5, 0.05, 0.1);

  var material = new THREE.MeshPhongMaterial({
    color: "rgb(255,255,255)",
    emissive: "rgb(255,100,0)"
  });

  var texLoader = new THREE.TextureLoader();
  var mapTexture = texLoader.load("assets/textures/lava.jpg");

  material.map = mapTexture;
  material.bumpMap = mapTexture;

  applyMaterialTextureSettings(material, ["map", "bumpMap"], 5, 1);

  var mesh = new THREE.Mesh(geometry, material);
  mesh.name = "blockBarrier_" + barrierIndex;
  mesh.castShadow = true;
  mesh.position.y = -0.2;
  mesh.position.z = -2;

  scene.add(mesh);
  blockCubes.push(mesh);

  cleanupAfter(blockCubes, mesh, barrierCleanupTime);
}

function createAvatar() {
  var loader = new THREE.GLTFLoader();
  loader.load(
    "assets/models/chicken.gltf",
    function (gltf) {
      var object = gltf.scene;

      object.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });

      animationMixer = new THREE.AnimationMixer(object);
      avatarAnimationAction = animationMixer.clipAction(gltf.animations[0]);
      object.position.y = avatarModelOffset;
      object.rotation.y = Math.PI;

      var scale = 0.05;
      object.scale.set(scale, scale, scale);

      avatarAnimationAction.play();

      avatarGroup = new THREE.Group();
      avatarGroup.add(object);

      avatarGroup.position.y = avatarGroupInitYPos;
      avatarGroup.position.z = 0.5;

      createAvatarCollisionBox();
      initAvatarControls();
      scene.add(avatarGroup);
      avatarInitiated = true;
    },
    undefined,
    function (e) {
      console.error(e);
    }
  );
}

function cleanupAfter(arr, object, time) {
  setTimeout(function () {
    cleanup(arr, object);
  }, time);
}

function cleanup(arr, object) {
  arr = arrayRemove(arr, object);
  scene.remove(object);
  object.geometry.dispose();
  object.material.dispose();
  object = undefined;
}

function createAvatarCollisionBox() {
  var geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

  var material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0
  });
  avatarCollisionBox = new THREE.Mesh(geometry, material);
  avatarGroup.add(avatarCollisionBox);
}

function createBasePlane() {
  var geometry = new THREE.PlaneGeometry(2, 10);
  var material = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide
  });

  var texLoader = new THREE.TextureLoader();
  baseTexture = texLoader.load("assets/textures/grass.jpg");

  material.map = baseTexture;
  material.bumpMap = baseTexture;

  applyMaterialTextureSettings(material, ["map", "bumpMap"], 25, 25);

  var mesh = new THREE.Mesh(geometry, material);
  mesh.name = "basePlane";
  mesh.position.y = -0.25;
  mesh.rotation.x = Math.PI / 2;

  mesh.receiveShadow = true;

  scene.add(mesh);
  basePlane = mesh;
}

//PHYSICS
function checkCollisions() {
  console.log(blockCubes.length);

  blockCubes.forEach(function (blockCube) {
    blockCube.material.transparent = false;
    blockCube.material.opacity = 1.0;
  });

  var originPoint = avatarCollisionBox.position.clone();
  originPoint.y -= 0.2;
  originPoint.z += 0.5;

  var ray = new THREE.Raycaster(
    originPoint,
    new THREE.Vector3(0, 0, -1)
  );

  var collisionResults = ray.intersectObjects(blockCubes);
  if (collisionResults.length > 0 && collisionResults[0].distance <= floatTolerance) {
    console.log(collisionResults[0].object.name);

    cleanup(blockCubes, collisionResults[0].object);
    addDamage();
  }

  // for (
  //   var vertexIndex = 0;
  //   vertexIndex < avatarCollisionBox.geometry.vertices.length;
  //   vertexIndex++
  // ) {
  //   var localVertex = avatarCollisionBox.geometry.vertices[vertexIndex].clone();
  //   var globalVertex = localVertex.applyMatrix4(avatarCollisionBox.matrix);
  //   var directionVector = globalVertex.sub(avatarCollisionBox.position);
  //   var ray = new THREE.Raycaster(
  //     originPoint,
  //     directionVector.clone().normalize()
  //   );

  //   var collisionResults = ray.intersectObjects(blockCubes);

  //   if (
  //     collisionResults.length > 0 &&
  //     collisionResults[0].distance < directionVector.length()
  //   ) {
  //     console.log(collisionResults[0].object.name);

  //     cleanup(blockCubes, collisionResults[0].object);
  //     addDamage();

  //     collisionResults[0].object.material.transparent = true;
  //     collisionResults[0].object.material.opacity = 0.4;
  //   }
  // }
}

//UTILS
function applyMaterialTextureSettings(
  material,
  propertiesMap,
  tilingX,
  tilingY
) {
  propertiesMap.forEach(function (mapProperty) {
    var tex = material[mapProperty];
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(tilingX, tilingY);
  });
}

function arrayRemove(arr, value) {
  var index = -1;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i] === value) {
      index = i;
      break;
    }
  }


  if (index > -1) arr.splice(index, 1);
  return arr;
}

function lerp(a, b, c) {
  return a + c * (b - a);
}

//FENCES
function createFences() {
  let z = fenceInitZ;

  for (var i = 0; i < 12; i++) {
    z += 0.7;

    createFence(true, z);
    createFence(false, z);
  }
}

function createFence(right = true, z) {
  var loader = new THREE.GLTFLoader();
  loader.load(
    "assets/models/fences.gltf",
    function (gltf) {
      var object = gltf.scene;

      object.rotation.y = Math.PI * 1.5;
      object.scale.set(0.3, 0.3, 0.3);
      object.position.x = 0.7 * right ? 1 : -1;
      object.position.y = -0.25;
      object.position.z = z;

      fences.push(object);

      scene.add(object);
      // cleanupAfter(fences, object, 8000);
    },
    undefined,
    function (e) {
      console.error(e);
    }
  );
}
function addDamage() {
  if (--lives <= 0) isGameOver = true;
  updateUI();
}

//UI
function updateUI() {
  ctx.canvas.width = width;
  ctx.canvas.height = height;

  var lifePerc = lives / maxLives;

  const pos = 120;

  ctx.beginPath();
  ctx.fillStyle = "rgba(255,0,0, 1)";
  ctx.arc(pos, pos, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.fillStyle = "rgba(0,255, 0, 1)";
  ctx.moveTo(pos, pos);
  ctx.arc(pos, pos, 80, 0, Math.PI * 2 * lifePerc);
  ctx.lineTo(pos, pos);

  ctx.stroke();
  ctx.fill();
  ctx.closePath();

  if (isGameOver) {
    ctx.beginPath();


    ctx.drawImage(gameOverImage, 0, 0, width, height);

    ctx.closePath();
  }
};