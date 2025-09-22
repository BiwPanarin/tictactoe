(() => {

  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const btnNew = document.getElementById('btnNew');
  const btnUndo = document.getElementById('btnUndo');
  const selPlayer = document.getElementById('playerSelect');
  const selDifficulty = document.getElementById('difficultySelect');

  // UI คะแนน/สตรีค
  const scoreEl = document.getElementById('score');
  const streakEl = document.getElementById('streak');

  // Game state
  let board, current, human, bot, history;

  // คะแนนและสตรีค (ไม่รีเซ็ตเมื่อเริ่มเกมใหม่)
  let score = 0;
  let winStreak = 0;

  const WIN_LINES = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diags
  ];

  function init() {
    board = Array(9).fill(null);
    history = [];
    human = selPlayer.value;         // "X" or "O"
    bot = human === "X" ? "O" : "X";
    current = "X";                   // X always starts
    render();
    updateStatus(chooseLang("lang-Ox-On-Play"));
    updateHUD(); // อัปเดตคะแนน/สตรีคทุกครั้งที่เริ่มเกม
    if (current === bot) botMove();
  }

  function render() {
    boardEl.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell' + (isGameOver() ? ' disabled' : '');
      cell.dataset.idx = i;
      cell.textContent = board[i] ?? '';
      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    }
  }

  function onCellClick(e) {
    const idx = parseInt(e.currentTarget.dataset.idx, 10);
    if (board[idx] || isGameOver()) return;
    if (current !== human) return;

    play(idx, human);
    if (!isGameOver()) setTimeout(botMove, 180);
  }

  function play(idx, player) {
    board[idx] = player;
    history.push(idx);
    current = other(player);
    render();

    const w = winner(board);
    if (w) {
      highlightWin(w.line);

      // คิดคะแนนตามผลแพ้ชนะ
      if (w.player === human) {

        const playerName = $("#navbarCompanyText").text()

        const scoreWin = localStorage.getItem("playerWin") || 0
        localStorage.setItem("playerWin", parseInt(scoreWin) + 1)

        const scoreLose = localStorage.getItem("botLose") || 0
        localStorage.setItem("botLose", parseInt(scoreLose) + 1)

        applyResult('win');
        updateStatus(`${chooseLang("lang-Ox-Player-Game-Over")} ${playerName} ${chooseLang("lang-Ox-Player-Win")}`);
        alertEnd(`${playerName} ${chooseLang("lang-Ox-Player-Win")}`, `${chooseLang("lang-Ox-Player-Win-Score")} ${bonusAppliedThisRound ? `<br> ${chooseLang("lang-Ox-Player-Win-Bonus")}` : ''}`);
      } else {
        
        const scoreWin = localStorage.getItem("botWin") || 0
        localStorage.setItem("botWin", parseInt(scoreWin) + 1)

        const scoreLose = localStorage.getItem("playerLose") || 0
        localStorage.setItem("playerLose", parseInt(scoreLose) + 1)

        applyResult('lose');
        updateStatus(`${chooseLang("lang-Ox-Bot-Game-Over")}`);
        alertEnd(`${chooseLang("lang-Ox-Bot-Win")}`, `${chooseLang("lang-Ox-Bot-Win-Score")}`);
      }

    } else if (isFull(board)) {
      // เสมอ = ไม่ได้/ไม่เสียคะแนน และสตรีคถูกรีเซ็ตเพื่อความชัดเจนว่าต้อง "ชนะติด" จริง ๆ
      applyResult('draw');
      updateStatus(`${chooseLang("lang-Ox-Draw-Game-Over")}`);
      alertEnd(`${chooseLang("lang-Ox-Draw")}`, `${chooseLang("lang-Ox-Draw-Sheer-Up")}`);
    } else {
      updateStatus(`${chooseLang("lang-Ox-Next-turn")} ${current}`);
    }
  }

  function alertEnd(title, text) {
    Swal.fire({
      title: title,
      html: text,
      icon: 'success',
      confirmButtonColor: "#1f5aa7ff",
      confirmButtonText: chooseLang("lang-Ox-New-Game"),
      showCancelButton: true,
      cancelButtonColor: "#aa4747ff",
      cancelButtonText: chooseLang("lang-Ox-Btn-Close")
    }).then(res => {
      if (res.isConfirmed) init();
    });
  }

  function other(p){ return p === "X" ? "O" : "X"; }
  function isFull(b){ return b.every(Boolean); }

  function winner(b) {
    for (const line of WIN_LINES) {
      const [a,b1,c] = line;
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
        return { player: b[a], line };
      }
    }
    return null;
  }

  function isGameOver(){ return !!winner(board) || isFull(board); }

  function highlightWin(line) {
    const cells = [...boardEl.children];
    for (const i of line) cells[i].classList.add('win');
    // disable further play
    cells.forEach(c => c.classList.add('disabled'));
  }

  function emptyIndices(b) {
    const res = [];
    for (let i=0;i<9;i++) if (!b[i]) res.push(i);
    return res;
  }

  // Bot logic
  function botMove() {
    if (isGameOver()) return;
    let move;
    const diff = selDifficulty.value;
    if (diff === 'easy') {
      const empties = emptyIndices(board);
      move = empties[Math.floor(Math.random()*empties.length)];
    } else {
      move = bestMove(board, bot);
    }
    play(move, bot);
  }

  // Minimax with small optimizations
  function bestMove(b, player) {
    let bestScore = -Infinity;
    let move = null;
    for (const i of emptyIndices(b)) {
      b[i] = player;
      const score = minimax(b, 0, false, player, other(player), -Infinity, Infinity);
      b[i] = null;
      if (score > bestScore) { bestScore = score; move = i; }
    }
    return move;
  }

  // scores: win = +10-depth, lose = -10+depth, draw = 0
  function minimax(b, depth, isMax, maxPlayer, minPlayer, alpha, beta) {
    const w = winner(b);
    if (w) return w.player === maxPlayer ? 10 - depth : -10 + depth;
    if (isFull(b)) return 0;

    if (isMax) {
      let best = -Infinity;
      for (const i of emptyIndices(b)) {
        b[i] = maxPlayer;
        const val = minimax(b, depth+1, false, maxPlayer, minPlayer, alpha, beta);
        b[i] = null;
        best = Math.max(best, val);
        alpha = Math.max(alpha, val);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const i of emptyIndices(b)) {
        b[i] = minPlayer;
        const val = minimax(b, depth+1, true, maxPlayer, minPlayer, alpha, beta);
        b[i] = null;
        best = Math.min(best, val);
        beta = Math.min(beta, val);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function updateStatus(text) { statusEl.textContent = `${chooseLang("lang-Ox-Status-Update")} ${text}`; }

  // จัดการคะแนน/สตรีค + โบนัส
  let bonusAppliedThisRound = false;
  function applyResult(result) {
    bonusAppliedThisRound = false;

    if (result === 'win') {
      score += 1;
      winStreak += 1;

      if (winStreak === 3) {
        score += 1;               // โบนัส +1
        bonusAppliedThisRound = true;
        winStreak = 0;            // รีเซ็ตการนับหลังรับโบนัส
      }

    } else if (result === 'lose') {
      score -= 1;
      winStreak = 0;              // แพ้ = สตรีคหาย

    } else if (result === 'draw') {
      // เสมอ: ไม่ได้/ไม่เสียคะแนน
      // เพื่อให้ "ชนะติด" หมายถึงชนะต่อเนื่องจริง ๆ รีเซ็ตสตรีค
      winStreak = 0;
    }

    updateHUD();
  }

  // อัปเดต UI คะแนน/สตรีค
  function updateHUD() {
    if (scoreEl) scoreEl.textContent = `${chooseLang("lang-Ox-Your-Score")} ${score}`;
    if (streakEl) streakEl.textContent = `${chooseLang("lang-Ox-Your-Streak")} ${winStreak}`;
  }

  // Undo 1 time (ย้อนทีละ 1 ช่อง)
  btnUndo.addEventListener('click', () => {
    if (history.length === 0 || isGameOver()) return;
    const last = history.pop();
    board[last] = null;
    current = other(current);
    // ถ้าเป็นเทิร์นของบอทหลัง undo ให้ undo อีกครั้งเพื่อย้อนตาของบอทด้วย (ย้อน 2 ครั้ง)
    if (current === bot && history.length > 0) {
      const last2 = history.pop();
      board[last2] = null;
      current = other(current);
    }
    render();
    updateStatus(`ตาถัดไป: ${current}`);
  });

  btnNew.addEventListener('click', init);
  selPlayer.addEventListener('change', init);
  selDifficulty.addEventListener('change', init);

  // start
  // init();

  $(document).ready(function () {
    setTimeout(function () {
      $('#modal-loading').modal('hide');
    }, timeout());
  });

})();
