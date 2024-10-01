import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let chessBoard, chessPieces = [];
let currentTurn = 'white'; // White starts first
let selectedPiece = null; // Track the currently selected piece
let highlightedSquares = []; // Store highlighted move squares
let boardState; // Tracks board positions and pieces

init();
animate();

// Define all classes first

class ChessPiece {
    constructor(mesh, team, position) {
        this.mesh = mesh;
        this.team = team;
        this.position = position;
        this.mesh.userData.team = team;
        this.mesh.rotation.y = Math.PI; // Rotate pieces to sit upright
    }

    move(newPosition) {
        this.position = newPosition;
        this.mesh.position.set(newPosition.x, newPosition.y, newPosition.z);
    }

    getLegalMoves(board) {
        return []; // To be overridden by specific pieces
    }
}

class Pawn extends ChessPiece {
    getLegalMoves(board) {
        const direction = this.team === 'white' ? 1 : -1;
        const currentPos = this.position;
        const moves = [];

        // Move forward by 1
        const forwardPos = { x: currentPos.x, y: currentPos.y, z: currentPos.z + direction };
        if (board.isPositionEmpty(forwardPos)) {
            moves.push(forwardPos);
        }

        // Capture diagonally
        const capturePositions = [
            { x: currentPos.x + 1, y: currentPos.y, z: currentPos.z + direction },
            { x: currentPos.x - 1, y: currentPos.y, z: currentPos.z + direction }
        ];
        capturePositions.forEach(pos => {
            const piece = board.getPieceAt(pos);
            if (piece && piece.team !== this.team) {
                moves.push(pos);
            }
        });

        return moves;
    }
}

class Rook extends ChessPiece {
    getLegalMoves(board) {
        const currentPos = this.position;
        const moves = [];

        // Check vertical and horizontal lines
        const directions = [
            { x: 1, z: 0 }, { x: -1, z: 0 }, // Left, right
            { x: 0, z: 1 }, { x: 0, z: -1 }  // Up, down
        ];

        directions.forEach(direction => {
            let newPos = { x: currentPos.x, y: currentPos.y, z: currentPos.z };

            while (true) {
                newPos = { x: newPos.x + direction.x, y: newPos.y, z: newPos.z + direction.z };
                if (!board.isValidPosition(newPos)) break;

                if (board.isPositionEmpty(newPos)) {
                    moves.push(newPos);
                } else {
                    const piece = board.getPieceAt(newPos);
                    if (piece && piece.team !== this.team) {
                        moves.push(newPos); // Capture opponent's piece
                    }
                    break;
                }
            }
        });

        return moves;
    }
}

class Knight extends ChessPiece {
    getLegalMoves(board) {
        const currentPos = this.position;
        const moves = [];

        const knightMoves = [
            { x: 2, z: 1 }, { x: 2, z: -1 }, { x: -2, z: 1 }, { x: -2, z: -1 },
            { x: 1, z: 2 }, { x: 1, z: -2 }, { x: -1, z: 2 }, { x: -1, z: -2 }
        ];

        knightMoves.forEach(offset => {
            const newPos = { x: currentPos.x + offset.x, y: currentPos.y, z: currentPos.z + offset.z };
            if (board.isValidPosition(newPos) && (board.isPositionEmpty(newPos) || board.getPieceAt(newPos)?.team !== this.team)) {
                moves.push(newPos);
            }
        });

        return moves;
    }
}

class Bishop extends ChessPiece {
    getLegalMoves(board) {
        const currentPos = this.position;
        const moves = [];

        const directions = [
            { x: 1, z: 1 }, { x: 1, z: -1 }, { x: -1, z: 1 }, { x: -1, z: -1 } // Diagonal directions
        ];

        directions.forEach(direction => {
            let newPos = { x: currentPos.x, y: currentPos.y, z: currentPos.z };

            while (true) {
                newPos = { x: newPos.x + direction.x, y: newPos.y, z: newPos.z + direction.z };
                if (!board.isValidPosition(newPos)) break;

                if (board.isPositionEmpty(newPos)) {
                    moves.push(newPos);
                } else {
                    const piece = board.getPieceAt(newPos);
                    if (piece && piece.team !== this.team) {
                        moves.push(newPos); // Capture opponent's piece
                    }
                    break;
                }
            }
        });

        return moves;
    }
}

class ChessBoard {
    constructor() {
        this.board = new Array(8).fill(null).map(() => new Array(8).fill(null)); // 8x8 board
    }

    addPiece(piece, position) {
        this.board[position.z][position.x] = piece;
    }

    getPieceAt(position) {
        return this.board[position.z][position.x];
    }

    isPositionEmpty(position) {
        return !this.getPieceAt(position);
    }

    isValidPosition(position) {
        return position.x >= 0 && position.x < 8 && position.z >= 0 && position.z < 8;
    }

    movePiece(piece, newPosition) {
        if (this.isMoveLegal(piece, newPosition)) {
            const targetPiece = this.getPieceAt(newPosition);
            if (targetPiece && targetPiece.team !== piece.team) {
                this.capturePiece(targetPiece); // Capture opponent's piece
            }

            this.board[piece.position.z][piece.position.x] = null; // Clear old position
            piece.move(newPosition);
            this.board[newPosition.z][newPosition.x] = piece; // Place piece in new position
        }
    }

    capturePiece(piece) {
        scene.remove(piece.mesh); // Remove piece from the scene
        chessPieces = chessPieces.filter(p => p !== piece); // Remove from pieces list
    }

    isMoveLegal(piece, newPosition) {
        const legalMoves = piece.getLegalMoves(this);
        return legalMoves.some(move => move.x === newPosition.x && move.z === newPosition.z);
    }
}

// Initialize the scene and other code logic

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // White directional light
    directionalLight.position.set(5, 10, 7.5); // Position the light
    scene.add(directionalLight);

    // Chessboard
    createChessBoard();

    // Initialize board state
    boardState = new ChessBoard();

    // Load chess pieces
    loadChessPieces();

    // Camera position
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Controls for zooming
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = true;

    // Event listener for window resize
    window.addEventListener('resize', onWindowResize, false);

    // Event listener for piece selection
    renderer.domElement.addEventListener('click', onPieceClick, false);
}

function createChessBoard() {
    const boardSize = 8;
    const squareSize = 1;
    const boardGeometry = new THREE.PlaneGeometry(boardSize * squareSize, boardSize * squareSize);
    
    const checkeredTexture = new THREE.TextureLoader().load('checkered_texture.png');
    const boardMaterial = new THREE.MeshBasicMaterial({ map: checkeredTexture, side: THREE.DoubleSide });

    chessBoard = new THREE.Mesh(boardGeometry, boardMaterial);
    chessBoard.rotation.x = -Math.PI / 2;
    scene.add(chessBoard);
}

function loadChessPieces() {
    const loader = new STLLoader();

    const pieceData = [
        // White pieces
        { name: 'Bulbasaur_Bishop', type: Bishop, team: 'white', position: { x: 2, y: 0, z: 0 } },
        { name: 'Bulbasaur_Bishop', type: Bishop, team: 'white', position: { x: 5, y: 0, z: 0 } },
        { name: 'Charmander_Knight', type: Knight, team: 'white', position: { x: 1, y: 0, z: 0 } },
        { name: 'Charmander_Knight', type: Knight, team: 'white', position: { x: 6, y: 0, z: 0 } },
        { name: 'Mewtwo_King', type: King, team: 'white', position: { x: 4, y: 0, z: 0 } },
        { name: 'Mew_Queen', type: Queen, team: 'white', position: { x: 3, y: 0, z: 0 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'white', position: { x: 0, y: 0, z: 0 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'white', position: { x: 1, y: 0, z: 1 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'white', position: { x: 2, y: 0, z: 1 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'white', position: { x: 3, y: 0, z: 1 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'white', position: { x: 4, y: 0, z: 1 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'white', position: { x: 5, y: 0, z: 1 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'white', position: { x: 6, y: 0, z: 1 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'white', position: { x: 7, y: 0, z: 1 } },

        // Black pieces
        { name: 'Squirtle_Rook', type: Rook, team: 'black', position: { x: 0, y: 0, z: 7 } },
        { name: 'Squirtle_Rook', type: Rook, team: 'black', position: { x: 7, y: 0, z: 7 } },
        { name: 'Mewtwo_King', type: King, team: 'black', position: { x: 4, y: 0, z: 7 } },
        { name: 'Mew_Queen', type: Queen, team: 'black', position: { x: 3, y: 0, z: 7 } },
        { name: 'Charmander_Knight', type: Knight, team: 'black', position: { x: 1, y: 0, z: 7 } },
        { name: 'Charmander_Knight', type: Knight, team: 'black', position: { x: 6, y: 0, z: 7 } },
        { name: 'Bulbasaur_Bishop', type: Bishop, team: 'black', position: { x: 2, y: 0, z: 7 } },
        { name: 'Bulbasaur_Bishop', type: Bishop, team: 'black', position: { x: 5, y: 0, z: 7 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'black', position: { x: 0, y: 0, z: 6 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'black', position: { x: 1, y: 0, z: 6 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'black', position: { x: 2, y: 0, z: 6 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'black', position: { x: 3, y: 0, z: 6 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'black', position: { x: 4, y: 0, z: 6 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'black', position: { x: 5, y: 0, z: 6 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'black', position: { x: 6, y: 0, z: 6 } },
        { name: 'Pokeball_Pawn', type: Pawn, team: 'black', position: { x: 7, y: 0, z: 6 } }
    ];

    pieceData.forEach(data => {
        loader.load(`assets/${data.name}.stl`, geometry => {
            const material = new THREE.MeshStandardMaterial({ color: data.team === 'white' ? 0xffffff : 0xffd700 }); // White and gold colors
            const mesh = new THREE.Mesh(geometry, material);
            mesh.scale.set(0.1, 0.1, 0.1); // Resize pieces

            const piece = new data.type(mesh, data.team, data.position);
            chessPieces.push(piece);
            boardState.addPiece(piece, data.position);
            scene.add(mesh);
        });
    });
}

function onPieceClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(chessPieces.map(p => p.mesh));

    if (intersects.length > 0) {
        const clickedPiece = chessPieces.find(piece => piece.mesh === intersects[0].object);

        if (selectedPiece) {
            if (currentTurn === clickedPiece.team) {
                clearHighlight();
                selectedPiece = clickedPiece;
                highlightMoves(selectedPiece);
            } else {
                if (boardState.isMoveLegal(selectedPiece, clickedPiece.position)) {
                    boardState.movePiece(selectedPiece, clickedPiece.position);
                    selectedPiece = null;
                    currentTurn = currentTurn === 'white' ? 'black' : 'white'; // Switch turns
                    clearHighlight();
                }
            }
        } else {
            if (clickedPiece.team === currentTurn) {
                selectedPiece = clickedPiece;
                highlightMoves(selectedPiece);
            }
        }
    } else {
        if (selectedPiece) {
            clearHighlight();
            selectedPiece = null; // Deselect if click outside
        }
    }
}

function highlightMoves(piece) {
    const legalMoves = piece.getLegalMoves(boardState);
    legalMoves.forEach(move => {
        const highlight = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.01, 0.8),
            new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 })
        );
        highlight.position.set(move.x, 0.01, move.z); // Adjust position for highlighting
        scene.add(highlight);
        highlightedSquares.push(highlight);
    });
}

function clearHighlight() {
    highlightedSquares.forEach(square => {
        scene.remove(square);
    });
    highlightedSquares = [];
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
