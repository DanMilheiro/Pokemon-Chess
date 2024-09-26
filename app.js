const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5).normalize();
scene.add(light);

const loader = new THREE.STLLoader();

function loadModel(file, position) {
    loader.load(`assets/${file}`, function (geometry) {
        const material = new THREE.MeshNormalMaterial();
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        mesh.rotation.x = -Math.PI / 2; // Adjust rotation as needed
        mesh.position.set(position.x, position.y, position.z); // Adjust position
    });
}

// Load your chess pieces
loadModel('Bulbasaur_Bishop.stl', { x: -2, y: 0, z: 0 });
loadModel('Charmander_Knight.stl', { x: -1, y: 0, z: 0 });
loadModel('Mew_Queen.stl', { x: 0, y: 0, z: 0 });
loadModel('Mewtwo_King.stl', { x: 1, y: 0, z: 0 });
loadModel('Pokeball_Pawn.stl', { x: 2, y: 0, z: 0 });
loadModel('Squirtle_Rook.stl', { x: 3, y: 0, z: 0 });

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();
