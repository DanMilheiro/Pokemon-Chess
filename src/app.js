const chessboard = document.getElementById('chessboard');

function createBoard() {
    let boardHTML = '';
    for (let row = 0; row < 8; row++) {
        boardHTML += '<div class="row">';
        for (let col = 0; col < 8; col++) {
            const squareColor = (row + col) % 2 === 0 ? 'white' : 'black';
            boardHTML += `<div class="square ${squareColor}"></div>`;
        }
        boardHTML += '</div>';
    }
    chessboard.innerHTML = boardHTML;
}

createBoard();
