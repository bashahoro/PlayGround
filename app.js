(() => {
  const cells = [...document.querySelectorAll('.cell')];
  const modeButtons = [...document.querySelectorAll('.mode-button')];
  const statusText = document.getElementById('status-text');
  const statusSub = document.getElementById('status-sub');
  const turnDot = document.getElementById('turn-dot');
  const xScore = document.getElementById('x-score');
  const oScore = document.getElementById('o-score');
  const drawScore = document.getElementById('draw-score');
  const xName = document.getElementById('x-name');
  const oName = document.getElementById('o-name');
  const soundToggle = document.getElementById('sound-toggle');
  const positionNames = ['أعلى اليمين', 'أعلى الوسط', 'أعلى اليسار', 'الوسط يمين', 'الوسط', 'الوسط يسار', 'أسفل اليمين', 'أسفل الوسط', 'أسفل اليسار'];
  const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  let board = Array(9).fill('');
  let current = 'X';
  let mode = 'friend';
  let gameOver = false;
  let computerTimer = null;
  let soundEnabled = false;
  let audioContext = null;
  let scores = { X: 0, O: 0, draws: 0 };
  try {
    const saved = JSON.parse(localStorage.getItem('tiny-wins-score') || 'null');
    if (saved && Number.isInteger(saved.X) && Number.isInteger(saved.O) && Number.isInteger(saved.draws)) scores = saved;
  } catch (_) { /* Ignore unavailable or malformed local storage. */ }

  function renderScores() {
    xScore.textContent = scores.X;
    oScore.textContent = scores.O;
    drawScore.textContent = `تعادل ${scores.draws}`;
    try { localStorage.setItem('tiny-wins-score', JSON.stringify(scores)); } catch (_) { /* Scores still work for this session. */ }
  }

  function updatePlayerNames() {
    xName.textContent = mode === 'computer' ? 'أنت' : 'اللاعب X';
    oName.textContent = mode === 'computer' ? 'الكمبيوتر' : 'اللاعب O';
  }

  function updateStatus(message, sub = '') {
    statusText.textContent = message;
    statusSub.textContent = sub;
    turnDot.textContent = current === 'X' ? '×' : '○';
    turnDot.classList.toggle('is-o', current === 'O');
    turnDot.hidden = !message;
  }

  function iconFor(mark) {
    return mark === 'X'
      ? '<svg class="mark-x" viewBox="0 0 64 64" aria-hidden="true"><path d="M15 15 49 49"/><path d="M49 15 15 49"/></svg>'
      : '<svg class="mark-o" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="21"/></svg>';
  }

  function playerLabel(mark) {
    if (mode === 'computer') return mark === 'X' ? 'أنت' : 'الكمبيوتر';
    return `اللاعب ${mark}`;
  }

  function paintBoard(winningLine = []) {
    cells.forEach((cell, index) => {
      const mark = board[index];
      cell.innerHTML = mark ? iconFor(mark) : '';
      cell.classList.toggle('mark-x', mark === 'X');
      cell.classList.toggle('mark-o', mark === 'O');
      cell.classList.toggle('winner', winningLine.includes(index));
      cell.disabled = Boolean(mark) || gameOver || (mode === 'computer' && current === 'O');
      const accessibleMark = mark === 'X' ? 'إكس' : mark === 'O' ? 'أو' : 'فارغة';
      cell.setAttribute('aria-label', `${positionNames[index]}، ${accessibleMark}${winningLine.includes(index) ? '، جزء من خط الفوز' : ''}`);
    });
  }

  function lineFor(position) {
    return wins.find(line => position[line[0]] && line.every(index => position[index] === position[line[0]]));
  }

  function playSound(kind = 'move') {
    if (!soundEnabled) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = kind === 'win' ? 660 : kind === 'draw' ? 310 : current === 'X' ? 440 : 520;
      gain.gain.setValueAtTime(.0001, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(kind === 'win' ? .06 : .035, audioContext.currentTime + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + (kind === 'win' ? .34 : .12));
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + (kind === 'win' ? .36 : .14));
    } catch (_) { /* Audio is an optional enhancement. */ }
  }

  function finishGame(winningLine) {
    gameOver = true;
    if (winningLine) {
      scores[current] += 1;
      renderScores();
      paintBoard(winningLine);
      const winner = playerLabel(current);
      updateStatus(mode === 'computer' && current === 'X' ? 'أحسنت! فزت' : `فاز ${winner}!`, 'ثلاثة على التوالي!');
      document.querySelector('.turn-status').classList.add('is-result');
      playSound('win');
    } else {
      scores.draws += 1;
      renderScores();
      paintBoard();
      updateStatus('تعادلنا!', 'مباراة جميلة');
      document.querySelector('.turn-status').classList.add('is-result');
      playSound('draw');
    }
  }

  function makeMove(index) {
    if (board[index] || gameOver) return;
    board[index] = current;
    playSound('move');
    const winningLine = lineFor(board);
    if (winningLine || board.every(Boolean)) {
      finishGame(winningLine);
      return;
    }
    current = current === 'X' ? 'O' : 'X';
    document.querySelector('.turn-status').classList.remove('is-result');
    if (mode === 'computer' && current === 'O') {
      updateStatus('دور الكمبيوتر', 'يفكر...');
      paintBoard();
      computerTimer = window.setTimeout(() => {
        computerTimer = null;
        if (gameOver || mode !== 'computer' || current !== 'O') return;
        makeMove(bestMove(board));
      }, 420);
    } else {
      const label = mode === 'computer' ? 'دورك الآن' : `دور ${current}`;
      updateStatus(label, 'اختر خانتك');
      paintBoard();
    }
  }

  function minimax(position, isMaximizing, depth = 0) {
    const line = lineFor(position);
    if (line) return position[line[0]] === 'O' ? 10 - depth : depth - 10;
    if (position.every(Boolean)) return 0;
    if (isMaximizing) {
      let best = -Infinity;
      position.forEach((spot, index) => {
        if (spot) return;
        position[index] = 'O';
        best = Math.max(best, minimax(position, false, depth + 1));
        position[index] = '';
      });
      return best;
    }
    let best = Infinity;
    position.forEach((spot, index) => {
      if (spot) return;
      position[index] = 'X';
      best = Math.min(best, minimax(position, true, depth + 1));
      position[index] = '';
    });
    return best;
  }

  function bestMove(position) {
    let bestScore = -Infinity;
    let choices = [];
    position.forEach((spot, index) => {
      if (spot) return;
      position[index] = 'O';
      const score = minimax(position, false);
      position[index] = '';
      if (score > bestScore) { bestScore = score; choices = [index]; }
      else if (score === bestScore) choices.push(index);
    });
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function newRound() {
    window.clearTimeout(computerTimer);
    computerTimer = null;
    board = Array(9).fill('');
    current = 'X';
    gameOver = false;
    document.querySelector('.turn-status').classList.remove('is-result');
    updateStatus(mode === 'computer' ? 'دورك الآن' : 'دور X', 'اختر خانتك');
    paintBoard();
  }

  cells.forEach((cell, index) => cell.addEventListener('click', () => makeMove(index)));
  modeButtons.forEach(button => button.addEventListener('click', () => {
    if (mode === button.dataset.mode) return;
    mode = button.dataset.mode;
    modeButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    updatePlayerNames();
    newRound();
  }));
  document.getElementById('new-round').addEventListener('click', newRound);
  document.getElementById('reset-score').addEventListener('click', () => {
    scores = { X: 0, O: 0, draws: 0 };
    renderScores();
  });
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    soundToggle.setAttribute('aria-label', soundEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت');
    if (soundEnabled) playSound('move');
  });

  updatePlayerNames();
  renderScores();
  updateStatus('دور X', 'اختر خانتك');
  paintBoard();
})();
