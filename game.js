// 'use strict';

var camera,
    scene,
    renderer,
    basePlane,
    avatar,
    baseTexture,
    orbitControls,
    blockCubes = [],
    mixers = []

var width,
    height;

var vAngle = 0;
var avatarInitYPos = -0.24;
var maxJumpYPos = 0.15;
var shouldBeJumping = false;
var stopAvatarAtInitPos = false;
var floatTolerance = 0.05;
var avatarInitiated = false;

var clock;

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
    // document.addEventListener('mousedown', onMouseDown);
    document.addEventListener("keydown", onKeyDown, false);

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

function initControls() {
    orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.target = avatar.position;
}

function update() {
    renderer.render(scene, camera);

    baseTexture.offset.y -= 0.025;

    if (Math.random() < 0.0025) createBarrier();

    blockCubes.forEach(function (barrier) {
        barrier.position.z += 0.01;
    })

    if (shouldBeJumping) {
        shouldBeJumping = jump();
    }

    if (mixers.length > 0) {
        for (var i = 0; i < mixers.length; i++) {
            mixers[i].update(clock.getDelta());
        }
    }

    // checkCollision();
    if (avatarInitiated) orbitControls.update();
    requestAnimationFrame(
        function () {
            update()
        }
    );
}

// function onResize() {
//     width = window.innerWidth;
//     height = window.innerHeight;
//     camera.aspect = width / height;
//     camera.updateProjectionMatrix();
//     renderer.setSize(width, height);
// }


function onKeyDown(event) {
    var keyCode = event.which;

    console.log(event.which);

    switch (keyCode) {
        case 32:
            shouldBeJumping = true;
            break;
    }
}


function jump() {
    vAngle += 0.05;
    var t = (Math.sin(this.vAngle) / 2) + 0.5;

    if (stopAvatarAtInitPos && t < floatTolerance) {
        stopAvatarAtInitPos = false;
        return false;
    }

    avatar.position.y = lerp(avatarInitYPos, maxJumpYPos, t);

    if (Math.round(avatar.position.y * 100) / 100 >= maxJumpYPos) {
        stopAvatarAtInitPos = true;
    }

    return true;
}

function createSkybox() {
    scene.background = new THREE.CubeTextureLoader()
        .setPath('assets/textures/skybox/')
        .load(['px.jpg', 'nx.jpg', 'py.jpg', 'ny.jpg', 'pz.jpg', 'nz.jpg']);
}

function createLights() {
    var l = new THREE.DirectionalLight(0xFFFFFF, 1);
    l.castShadow = true;
    scene.add(l);

    var l = new THREE.AmbientLight(0xFFFF00, 0.5);
    scene.add(l);
}

function createBarrier() {
    var geometry = new THREE.BoxGeometry(0.5, 0.05, 0.1);

    var material = new THREE.MeshPhongMaterial({
        color: 'rgb(255,255,255)',
        emissive: 'rgb(255,100,0)'
    });

    var texLoader = new THREE.TextureLoader();
    var mapTexture = texLoader.load('assets/textures/lava.jpg');

    material.map = mapTexture;
    material.bumpMap = mapTexture;

    applyMaterialTextureSettings(material, ['map', 'bumpMap'], 5, 1);

    var mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.position.y = -0.2;
    mesh.position.z = -2;

    scene.add(mesh);
    blockCubes.push(mesh);

    setTimeout(function () {
        blockCubes = arrayRemove(blockCubes, mesh);
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        mesh = undefined;
    }, 5000);

}

function createAvatar() {
    var loader = new THREE.FBXLoader();

    loader.load('assets/models/chicken.fbx', function (object) {
        object.mixer = new THREE.AnimationMixer(object);
        mixers.push(object.mixer);
        var action = object.mixer.clipAction(object.animations[8]);
        
        object.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        var scale = 0.0004;

        action.play();
        object.position.y = avatarInitYPos;
        object.position.z = 0.5;
        object.rotation.y = Math.PI;

        object.scale.set(scale, scale, scale);

        avatar = object;

        scene.add(object);

        initControls();
        avatarInitiated = true;
    },
        null,
        function (error) {
            console.log(error);
        }
    );



    // var loader = new THREE.FBXLoader();

    // loader.load('assets/models/rabbit.fbx', function (object) {
    //     // object.mixer = new THREE.AnimationMixer(object);
    //     // mixers.push(object.mixer);
    //     // var action = object.mixer.clipAction(object.animations[0]);
    //     // action.play();

    //     var texLoader = new THREE.TextureLoader();
    //     var tex = texLoader.load('assets/models/skin.jpg');

    //     var material = new THREE.MeshBasicMaterial({
    //         color: 0xFFFFFF,
    //         map: tex
    //     });

    //     applyMaterialTextureSettings(material, ['map'], 1, 1);

    //     object.traverse(function (child) {
    //         if (child.isMesh && child.name == "Rabbit") {
    //             // child.castShadow = true;
    //             // child.receiveShadow = true;
    //             child.material = material;
    //         }
    //     });

    //     var scale = 0.0002;

    //     object.scale.set(scale, scale, scale);
    //     object.position.y = avatarInitYPos;
    //     object.position.z = 0.5;
    //     object.rotation.y = Math.PI;

    //     avatar = object;

    //     scene.add(object);

    //     initControls();
    //     avatarInitiated = true;
    // },
    //     null,
    //     function (error) {
    //         console.log(error);
    //     }
    // );

    // avatar = scene.getObjectByName("avatar");

    // var geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    // var material = new THREE.MeshLambertMaterial({
    //     color: 'rgb(125,125,125)',
    //     // wireframe: true
    // });

    // var mesh = new THREE.Mesh(geometry, material);
    // mesh.castShadow = true;
    // mesh.position.y = avatarInitYPos;
    // mesh.position.z = 0.5;

    // scene.add(mesh);
    // avatar = mesh;
}

function createBasePlane() {
    var geometry = new THREE.PlaneGeometry(2, 10);
    var material = new THREE.MeshLambertMaterial({
        color: 0xFFFFFF,
        side: THREE.DoubleSide
    });

    var texLoader = new THREE.TextureLoader();
    baseTexture = texLoader.load('assets/textures/grass.jpg');

    material.map = baseTexture;
    material.bumpMap = baseTexture;

    applyMaterialTextureSettings(material, ['map', 'bumpMap'], 25, 25);

    var mesh = new THREE.Mesh(geometry, material);
    mesh.name = "basePlane";
    mesh.position.y = -0.25;
    mesh.rotation.x = Math.PI / 2;

    mesh.receiveShadow = true;

    scene.add(mesh);
    basePlane = mesh;
}

function applyMaterialTextureSettings(material, propertiesMap, tilingX, tilingY) {

    propertiesMap.forEach(function (mapProperty) {
        var tex = material[mapProperty];
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(tilingX, tilingY);
    });
}

function checkCollision() {
    blockCubes.forEach(function (cube) {
        cube.material.transparent = false;
        cube.material.opacity = 1.0;
    });

    var originPoint = avatar.position.clone();
    for (var vertexIndex = 0; vertexIndex < avatar.geometry.vertices.length; vertexIndex++) {
        var localVertex = avatar.geometry.vertices[vertexIndex].clone();
        var globalVertex = localVertex.applyMatrix4(avatar.matrix);
        var directionVector = globalVertex.sub(avatar.position);
        var ray = new THREE.Raycaster(originPoint, directionVector.clone().normalize());
        var collisionResults = ray.intersectObjects(blockCubes);

        if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
            console.log(collisionResults[0].object.name);
            collisionResults[0].object.material.transparent = true;
            collisionResults[0].object.material.opacity = 0.4;
        }
    }
}

function arrayRemove(arr, value) {
    return arr.filter(function (ele) {
        return ele != value;
    });
}

function lerp(a, b, c) {
    return a + c * (b - a);
}
