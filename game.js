// 'use strict';

var camera,
  scene,
  renderer,
  basePlane,
  avatarCollisionBox,
  baseTexture,
  orbitControls,
  blockCubes = [],
  animationMixer,
  clock,
  avatarGroup,
  avatarAnimationAction;

var width, height;

var vAngle = 0;

var isJumping = false;
var stopAvatarAtInitPos = false;
var avatarInitiated = false;

//CONSTANTS
const floatTolerance = 0.05;
const avatarModelOffset = -0.09;
const avatarGroupInitYPos = -0.15;
const avatarBoxOffset = -0.24;
const maxJumpYPos = 0.15;

init();
initScene();
createAvatar();
buildScene();
update();

function init() {
  width = window.innerWidth;
  height = window.innerHeight;

  camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000);
  camera.position.z = 1;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000);
  renderer.shadowMap.enabled = true;

  document.getElementById("webgl").appendChild(renderer.domElement);
  document.addEventListener("keydown", onKeyDown, false);
  window.addEventListener("resize", onResize, false);

  clock = new THREE.Clock();
}

function initScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xffffff, 0.35);
}

function buildScene() {
  createSkybox();
  createLights();
  createBasePlane();
  createBarrier();
}

function initAvatarControls() {
  orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
  orbitControls.target = avatarGroup.position;
}

function update() {
  renderer.render(scene, camera);

  baseTexture.offset.y -= 0.025;

  if (Math.random() < 0.0025) createBarrier();

  blockCubes.forEach(function(barrier) {
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

    // checkCollisions();
  }

  requestAnimationFrame(function() {
    update();
  });
}

function onResize() {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
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
  //   avatarCollisionBox.position.y = y;
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
  mesh.castShadow = true;
  mesh.position.y = -0.2;
  mesh.position.z = -2;

  scene.add(mesh);
  blockCubes.push(mesh);

  setTimeout(function() {
    blockCubes = arrayRemove(blockCubes, mesh);
    scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    mesh = undefined;
  }, 5000);
}

function createAvatar() {
  var loader = new THREE.GLTFLoader();
  loader.load(
    "assets/models/chicken.gltf",
    function(gltf) {
      var object = gltf.scene;

      scene.add(object);

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
    function(e) {
      console.error(e);
    }
  );
}

function createAvatarCollisionBox() {
  var geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

  var material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5
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
  blockCubes.forEach(function(cube) {
    cube.material.transparent = false;
    cube.material.opacity = 1.0;
  });

  var originPoint = avatar.position.clone();

  for (
    var vertexIndex = 0;
    vertexIndex < avatar.geometry.vertices.length;
    vertexIndex++
  ) {
    var localVertex = avatar.geometry.vertices[vertexIndex].clone();
    var globalVertex = localVertex.applyMatrix4(avatar.matrix);
    var directionVector = globalVertex.sub(avatar.position);
    var ray = new THREE.Raycaster(
      originPoint,
      directionVector.clone().normalize()
    );
    var collisionResults = ray.intersectObjects(blockCubes);

    if (
      collisionResults.length > 0 &&
      collisionResults[0].distance < directionVector.length()
    ) {
      console.log(collisionResults[0].object.name);
      collisionResults[0].object.material.transparent = true;
      collisionResults[0].object.material.opacity = 0.4;
    }
  }
}

//UTILS
function applyMaterialTextureSettings(
  material,
  propertiesMap,
  tilingX,
  tilingY
) {
  propertiesMap.forEach(function(mapProperty) {
    var tex = material[mapProperty];
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(tilingX, tilingY);
  });
}

function arrayRemove(arr, value) {
  return arr.filter(function(ele) {
    return ele != value;
  });
}

function lerp(a, b, c) {
  return a + c * (b - a);
}
