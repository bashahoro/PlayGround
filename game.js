(() => {
  const cells = [...document.querySelectorAll('.cell')];
  const turnMark = document.querySelector('.turn-mark');
  const turnLabel = document.getElementById('turn-label');
  const turnPill = document.getElementById('turn-pill');
  const hint = document.getElementById('game-hint');
  const modeButtons = [...document.querySelectorAll('.mode-button')];
  const winningLines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  const storageKey = 'little-games-tic-tac-toe-scores';

  let board = Array(9).fill('');
  let current = 'X';
  let gameOver = false;
  let thinking = false;
  let mode = 'friends';
  let round = 1;
  let scores = { X: 0, O: 0, draws: 0 };

  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored && ['X', 'O', 'draws'].every(key => Number.isInteger(stored[key]) && stored[key] >= 0)) scores = stored;
  } catch (_) { /* Start with a clean score if storage is unavailable. */ }

  function playerName(mark) {
    return mark === 'X' ? 'Player 1' : mode === 'computer' ? 'Computer' : 'Player 2';
  }

  function saveScores() {
    try { localStorage.setItem(storageKey, JSON.stringify(scores)); } catch (_) { /* The game still works without storage. */ }
  }

  function updateScoreboard() {
    document.getElementById('x-score').textContent = scores.X;
    document.getElementById('o-score').textContent = scores.O;
    document.getElementById('draw-score').textContent = scores.draws;
    document.getElementById('x-name').textContent = 'Player 1';
    document.getElementById('o-name').textContent = mode === 'computer' ? 'Computer' : 'Player 2';
    const roundText = String(round).padStart(2, '0');
    document.getElementById('round-label').textContent = `ROUND ${roundText}`;
    document.getElementById('panel-round').textContent = roundText;
  }

  function setTurn(mark) {
    current = mark;
    turnMark.textContent = mark === 'X' ? '×' : '○';
    turnMark.className = `turn-mark ${mark === 'X' ? 'x-mark' : 'o-mark'}`;
    turnPill.classList.remove('is-won', 'is-draw');
    turnLabel.textContent = mode === 'computer' && mark === 'O' ? 'Computer is thinking…' : `${playerName(mark)}'s turn`;
    hint.innerHTML = '<span class="hint-sparkle">✦</span> Three of your marks. That’s the whole plan.';
    render();
  }

  function render() {
    cells.forEach((cell, index) => {
      const mark = board[index];
      cell.classList.toggle('x', mark === 'X');
      cell.classList.toggle('o', mark === 'O');
      cell.disabled = Boolean(mark) || gameOver || thinking;
      const row = Math.floor(index / 3) + 1;
      const column = index % 3 + 1;
      cell.setAttribute('aria-label', `Row ${row}, column ${column}, ${mark ? mark.toUpperCase() : 'empty'}`);
    });
  }

  function getWinner(position) {
    for (const line of winningLines) {
      const [a, b, c] = line;
      if (position[a] && position[a] === position[b] && position[a] === position[c]) return { mark: position[a], line };
    }
    return null;
  }

  function play(index, isComputerMove = false) {
    if (gameOver || thinking || board[index] || (mode === 'computer' && current === 'O' && !isComputerMove)) return;
    board[index] = current;
    const result = getWinner(board);
    if (result) {
      gameOver = true;
      result.line.forEach(cellIndex => cells[cellIndex].classList.add('winner'));
      scores[result.mark]++;
      saveScores();
      updateScoreboard();
      turnMark.textContent = result.mark === 'X' ? '×' : '○';
      turnMark.className = `turn-mark ${result.mark === 'X' ? 'x-mark' : 'o-mark'}`;
      turnLabel.textContent = `${playerName(result.mark)} wins!`;
      turnPill.classList.add('is-won');
      hint.innerHTML = `<span class="hint-sparkle">✦</span> Three in a row. Nicely played!`;
      render();
      return;
    }
    if (board.every(Boolean)) {
      gameOver = true;
      scores.draws++;
      saveScores();
      updateScoreboard();
      turnMark.textContent = '=';
      turnMark.className = 'turn-mark';
      turnLabel.textContent = 'It’s a draw!';
      turnPill.classList.add('is-draw');
      hint.innerHTML = '<span class="hint-sparkle">✦</span> Too evenly matched. One more round?';
      render();
      return;
    }

    setTurn(current === 'X' ? 'O' : 'X');
    if (mode === 'computer' && current === 'O') {
      thinking = true;
      render();
      const move = bestComputerMove();
      thinking = false;
      if (move !== -1) play(move, true);
    }
  }

  function winningMove(mark) {
    for (let index = 0; index < board.length; index++) {
      if (board[index]) continue;
      board[index] = mark;
      const wins = Boolean(getWinner(board));
      board[index] = '';
      if (wins) return index;
    }
    return -1;
  }

  function bestComputerMove() {
    // Take a win when possible, block an immediate threat, then favor the center and corners.
    const winning = winningMove('O');
    if (winning !== -1) return winning;
    const blocking = winningMove('X');
    if (blocking !== -1) return blocking;
    const preferred = [4, 0, 2, 6, 8, 1, 3, 5, 7].filter(index => !board[index]);
    return preferred.length ? preferred[0] : -1;
  }

  function newRound(increment = true) {
    if (increment) round++;
    board = Array(9).fill('');
    gameOver = false;
    thinking = false;
    cells.forEach(cell => cell.classList.remove('winner'));
    updateScoreboard();
    setTurn('X');
  }

  cells.forEach((cell, index) => cell.addEventListener('click', () => play(index)));
  document.getElementById('new-game').addEventListener('click', () => newRound());

  modeButtons.forEach(button => button.addEventListener('click', () => {
    if (button.dataset.mode === mode) return;
    mode = button.dataset.mode;
    modeButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    newRound();
  }));

  document.getElementById('reset-scores').addEventListener('click', () => {
    scores = { X: 0, O: 0, draws: 0 };
    round = 1;
    saveScores();
    updateScoreboard();
  });

  updateScoreboard();
  setTurn('X');
})();
