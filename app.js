import * as THREE from 'https://unpkg.com/three@0.132.2/build/three.module.js';
import { STLLoader } from 'https://unpkg.com/three@0.132.2/examples/jsm/loaders/STLLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Chessboard creation
const boardGeometry = new THREE.BoxGeometry(8, 0.1, 8);
const boardMaterial = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
const board = new THREE.Mesh(boardGeometry, boardMaterial);
board.position.y = -0.05; // Adjust board height
scene.add(board);

// Light
const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Models array using the same STL files
const models = [
    // White pieces
    { file: './assets/Squirtle_Rook.stl', position: { x: -4, y: 0.5, z: -4 } }, // Rook
    { file: './assets/Charmander_Knight.stl', position: { x: -3, y: 0.5, z: -4 } }, // Knight
    { file: './assets/Bulbasaur_Bishop.stl', position: { x: -2, y: 0.5, z: -4 } }, // Bishop
    { file: './assets/Mew_Queen.stl', position: { x: -1, y: 0.5, z: -4 } }, // Queen
    { file: './assets/Mewtwo_King.stl', position: { x: 0, y: 0.5, z: -4 } }, // King
    { file: './assets/Pokeball_Pawn.stl', position: { x: 1, y: 0.5, z: -4 } }, // Pawn

    // Black pieces (using the same STL files)
    { file: './assets/Squirtle_Rook.stl', position: { x: -4, y: 0.5, z: 4 } }, // Black Rook
    { file: './assets/Charmander_Knight.stl', position: { x: -3, y: 0.5, z: 4 } }, // Black Knight
    { file: './assets/Bulbasaur_Bishop.stl', position: { x: -2, y: 0.5, z: 4 } }, // Black Bishop
    { file: './assets/Mew_Queen.stl', position: { x: -1, y: 0.5, z: 4 } }, // Black Queen
    { file: './assets/Mewtwo_King.stl', position: { x: 0, y: 0.5, z: 4 } }, // Black King
    { file: './assets/Pokeball_Pawn.stl', position: { x: 1, y: 0.5, z: 4 } }, // Black Pawn
];

// Load models
const loader = new STLLoader();
models.forEach(model => {
    loader.load(model.file, (geometry) => {
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(model.position.x, model.position.y, model.position.z);
        mesh.scale.set(0.4, 0.4, 0.4); // Scale down the models to fit
        scene.add(mesh);
        mesh.name = model.file.split('/').pop(); // Set name for interaction
    });
});

// Camera position
camera.position.z = 5;

// Raycasting for interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedPiece = null;

// Add event listener for mouse clicks
window.addEventListener('click', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        if (!selectedPiece) {
            selectedPiece = intersects[0].object; // Select the piece
        } else {
            // Move the selected piece to the clicked position
            selectedPiece.position.set(intersects[0].point.x, selectedPiece.position.y, intersects[0].point.z);
            selectedPiece = null; // Deselect the piece
        }
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Window resize handling
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
