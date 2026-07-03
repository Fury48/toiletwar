const URINALS_PER_ROW = 10;
const ROW_COUNT = 2;
const MEN_PER_PLAYER = 10;
const AI_THINKING_MS = 620;

const players = {
  human: {
    id: "human",
    label: "BLUE",
    color: "#20a9e8",
    queueId: "blueQueue",
  },
  ai: {
    id: "ai",
    label: "RED",
    color: "#e34522",
    queueId: "redQueue",
  },
};

const elements = {
  shell: document.querySelector(".game-shell"),
  lanes: Array.from(document.querySelectorAll(".lane")),
  redQueue: document.getElementById("redQueue"),
  blueQueue: document.getElementById("blueQueue"),
  startButton: document.getElementById("startButton"),
  restartButton: document.getElementById("restartButton"),
  gameOverRestart: document.getElementById("gameOverRestart"),
  statusText: document.getElementById("statusText"),
  turnBadge: document.getElementById("turnBadge"),
  redRemaining: document.getElementById("redRemaining"),
  blueRemaining: document.getElementById("blueRemaining"),
  gameOverPanel: document.getElementById("gameOverPanel"),
  gameOverTitle: document.getElementById("gameOverTitle"),
};

const state = {
  started: false,
  gameOver: false,
  board: createEmptyBoard(),
  currentPlayer: "human",
  remaining: {
    human: MEN_PER_PLAYER,
    ai: MEN_PER_PLAYER,
  },
  selectedHuman: false,
  draggingHuman: false,
  message: "READY",
  lastMove: null,
  aiTimer: null,
};

buildBoard();
bindControls();
renderGame();

function createEmptyBoard() {
  return Array.from({ length: ROW_COUNT }, () =>
    Array.from({ length: URINALS_PER_ROW }, () => null),
  );
}

function buildBoard() {
  elements.lanes.forEach((lane) => {
    const row = Number(lane.dataset.row);
    lane.innerHTML = "";

    for (let index = 0; index < URINALS_PER_ROW; index += 1) {
      const slot = document.createElement("button");
      slot.type = "button";
      slot.className = "urinal-slot";
      slot.dataset.row = String(row);
      slot.dataset.index = String(index);
      slot.setAttribute("aria-label", `urinal ${row + 1}-${index + 1}`);
      slot.innerHTML = createUrinalSvg();
      slot.addEventListener("click", () => handleHumanMove(row, index));
      slot.addEventListener("dragover", handleSlotDragOver);
      slot.addEventListener("drop", (event) => handleSlotDrop(event, row, index));
      slot.addEventListener("dragleave", () => slot.classList.remove("hovering"));
      lane.appendChild(slot);
    }
  });
}

function bindControls() {
  elements.startButton.addEventListener("click", startGame);
  elements.restartButton.addEventListener("click", restartGame);
  elements.gameOverRestart.addEventListener("click", restartGame);
}

function startGame() {
  resetState();
  state.started = true;
  state.message = "BLUE TURN";
  renderGame();
}

function restartGame() {
  resetState();
  state.started = true;
  state.message = "BLUE TURN";
  renderGame();
}

function resetState() {
  clearTimeout(state.aiTimer);
  state.gameOver = false;
  state.board = createEmptyBoard();
  state.currentPlayer = "human";
  state.remaining.human = MEN_PER_PLAYER;
  state.remaining.ai = MEN_PER_PLAYER;
  state.selectedHuman = false;
  state.draggingHuman = false;
  state.lastMove = null;
  elements.shell.classList.remove("is-dragging");
  elements.gameOverPanel.hidden = true;
}

function handleSlotDragOver(event) {
  if (!canHumanAct()) {
    return;
  }

  event.preventDefault();
}

function handleSlotDrop(event, row, index) {
  event.preventDefault();

  if (!canHumanAct()) {
    return;
  }

  state.draggingHuman = false;
  elements.shell.classList.remove("is-dragging");
  handleHumanMove(row, index);
}

function handleHumanMove(row, index) {
  if (!canHumanAct()) {
    return;
  }

  const moved = submitMove("human", row, index);
  if (!moved) {
    state.selectedHuman = true;
    renderGame();
  }
}

function submitMove(playerId, row, index) {
  const problem = getMoveProblem(state.board, row, index);

  // Invalid moves are treated as the game's collision check.
  if (problem) {
    state.message = problem;
    flashCollision(row, index);
    return false;
  }

  placeMan(state.board, playerId, row, index);
  state.remaining[playerId] -= 1;
  state.lastMove = { row, index };
  state.selectedHuman = false;
  state.message = `${players[playerId].label} PLACED`;

  const opponentId = getOpponent(playerId);
  if (getAvailableMoves(state.board).length === 0) {
    finishGame(playerId, opponentId);
    return true;
  }

  state.currentPlayer = opponentId;
  if (state.currentPlayer === "ai") {
    state.message = "RED THINKING";
    renderGame();
    state.aiTimer = setTimeout(playAiTurn, AI_THINKING_MS);
    return true;
  }

  state.message = "BLUE TURN";
  renderGame();
  return true;
}

function playAiTurn() {
  if (state.gameOver || state.currentPlayer !== "ai") {
    return;
  }

  const move = chooseAiMove(state.board);
  if (!move) {
    finishGame("human", "ai");
    return;
  }

  submitMove("ai", move.row, move.index);
}

function chooseAiMove(board) {
  const moves = getAvailableMoves(board);

  if (moves.length === 0) {
    return null;
  }

  const scoredMoves = moves.map((move) => ({
    ...move,
    score: scoreAiMove(board, move),
  }));

  scoredMoves.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return Math.abs(4.5 - a.index) - Math.abs(4.5 - b.index);
  });

  return scoredMoves[0];
}

function scoreAiMove(board, move) {
  const simulated = cloneBoard(board);
  placeMan(simulated, "ai", move.row, move.index);

  // The prototype AI prefers immediate checkmate and avoids one-move traps.
  const humanReplies = getAvailableMoves(simulated);
  if (humanReplies.length === 0) {
    return 1000;
  }

  const humanCanCheckmate = humanReplies.some((reply) => {
    const replyBoard = cloneBoard(simulated);
    placeMan(replyBoard, "human", reply.row, reply.index);
    return getAvailableMoves(replyBoard).length === 0;
  });

  const edgePressure = move.index === 0 || move.index === URINALS_PER_ROW - 1 ? 0.35 : 0;
  const centerPressure = 4.5 - Math.abs(4.5 - move.index);
  return -humanReplies.length * 10 - (humanCanCheckmate ? 45 : 0) + centerPressure + edgePressure;
}

function finishGame(winnerId, loserId) {
  state.gameOver = true;
  state.currentPlayer = winnerId;
  state.message = `${players[winnerId].label} WINS`;
  elements.gameOverTitle.textContent = `${players[winnerId].label} WINS`;
  elements.gameOverPanel.hidden = false;
  renderGame();
  elements.gameOverPanel.hidden = false;
  elements.gameOverTitle.textContent = `${players[winnerId].label} WINS`;

  const losingQueue = document.getElementById(players[loserId].queueId);
  losingQueue.classList.add("checkmated");
}

function getOpponent(playerId) {
  return playerId === "human" ? "ai" : "human";
}

function canHumanAct() {
  return state.started && !state.gameOver && state.currentPlayer === "human";
}

function getMoveProblem(board, row, index) {
  if (board[row][index]) {
    return "OCCUPIED";
  }

  // Only the very first placement can ignore adjacent urinals.
  if (!hasAnyPlacedMan(board)) {
    return "";
  }

  const leftOccupied = index > 0 && board[row][index - 1];
  const rightOccupied = index < URINALS_PER_ROW - 1 && board[row][index + 1];

  if (leftOccupied || rightOccupied) {
    return "BLOCKED";
  }

  return "";
}

function isMoveLegal(board, row, index) {
  return getMoveProblem(board, row, index) === "";
}

function hasAnyPlacedMan(board) {
  return board.some((row) => row.some(Boolean));
}

function getAvailableMoves(board) {
  const moves = [];

  for (let row = 0; row < ROW_COUNT; row += 1) {
    for (let index = 0; index < URINALS_PER_ROW; index += 1) {
      if (isMoveLegal(board, row, index)) {
        moves.push({ row, index });
      }
    }
  }

  return moves;
}

function placeMan(board, playerId, row, index) {
  board[row][index] = playerId;
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function flashCollision(row, index) {
  const slot = getSlot(row, index);
  if (!slot) {
    return;
  }

  slot.classList.remove("collision");
  window.requestAnimationFrame(() => {
    slot.classList.add("collision");
    window.setTimeout(() => slot.classList.remove("collision"), 420);
  });
}

function renderGame() {
  renderQueues();
  renderBoard();
  renderHud();
}

function renderHud() {
  const current = players[state.currentPlayer];
  elements.statusText.textContent = state.message;
  elements.turnBadge.textContent = current.label;
  elements.turnBadge.className = `turn-badge ${current.id === "human" ? "blue" : "red"}`;
  elements.redRemaining.textContent = String(state.remaining.ai);
  elements.blueRemaining.textContent = String(state.remaining.human);
  elements.startButton.hidden = state.started;
  elements.restartButton.hidden = !state.started || state.gameOver;
}

function renderQueues() {
  renderQueue("ai");
  renderQueue("human");
}

function renderQueue(playerId) {
  const player = players[playerId];
  const queue = document.getElementById(player.queueId);
  const remaining = state.remaining[playerId];
  const isHumanFrontReady = playerId === "human" && canHumanAct();

  queue.classList.remove("checkmated");
  queue.innerHTML = "";

  for (let order = remaining - 1; order >= 0; order -= 1) {
    const person = document.createElement("div");
    const isFront = order === 0;
    const position = getQueuePosition(playerId, order);

    person.className = [
      "queue-person",
      isFront ? "front" : "waiting",
      isHumanFrontReady && isFront ? "ready" : "",
      state.selectedHuman && isFront && playerId === "human" ? "selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

    person.style.left = `${position.x}%`;
    person.style.top = `${position.y}%`;
    person.style.zIndex = String(80 - order);
    person.innerHTML = createPersonSvg(player.color);

    if (isHumanFrontReady && isFront) {
      person.draggable = true;
      person.setAttribute("role", "button");
      person.setAttribute("aria-label", "blue front man");
      person.addEventListener("click", () => {
        state.selectedHuman = !state.selectedHuman;
        state.message = state.selectedHuman ? "BLUE SELECTED" : "BLUE TURN";
        renderGame();
      });
      person.addEventListener("dragstart", handleQueueDragStart);
      person.addEventListener("dragend", handleQueueDragEnd);
    }

    queue.appendChild(person);
  }
}

function getQueuePosition(playerId, order) {
  if (playerId === "ai") {
    return {
      x: 85 - order * 8.4,
      y: 75 - order * 7.4,
    };
  }

  return {
    x: 84 - order * 8.3,
    y: 20 + order * 7.4,
  };
}

function handleQueueDragStart(event) {
  if (!canHumanAct()) {
    event.preventDefault();
    return;
  }

  state.draggingHuman = true;
  state.selectedHuman = true;
  elements.shell.classList.add("is-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", "human");
  renderBoard();
  renderHud();
}

function handleQueueDragEnd() {
  state.draggingHuman = false;
  elements.shell.classList.remove("is-dragging");
  renderGame();
}

function renderBoard() {
  const availableMoves = getAvailableMoves(state.board);
  const availableKeys = new Set(availableMoves.map((move) => getMoveKey(move.row, move.index)));
  const showTargets = canHumanAct() && (state.selectedHuman || state.draggingHuman);

  for (let row = 0; row < ROW_COUNT; row += 1) {
    for (let index = 0; index < URINALS_PER_ROW; index += 1) {
      const slot = getSlot(row, index);
      const occupant = state.board[row][index];
      const key = getMoveKey(row, index);
      const isLegalTarget = availableKeys.has(key);

      slot.classList.toggle("occupied", Boolean(occupant));
      slot.classList.toggle("valid-drop", showTargets && isLegalTarget);
      slot.classList.toggle("blocked-drop", showTargets && !isLegalTarget);
      slot.classList.toggle("can-target", canHumanAct());
      slot.classList.toggle(
        "last-move",
        Boolean(state.lastMove && state.lastMove.row === row && state.lastMove.index === index),
      );

      const existingPerson = slot.querySelector(".placed-person");
      if (existingPerson) {
        existingPerson.remove();
      }

      if (occupant) {
        const placed = document.createElement("div");
        placed.className = "placed-person";
        placed.innerHTML = createPersonSvg(players[occupant].color);
        slot.appendChild(placed);
      }
    }
  }
}

function getSlot(row, index) {
  return document.querySelector(`.urinal-slot[data-row="${row}"][data-index="${index}"]`);
}

function getMoveKey(row, index) {
  return `${row}:${index}`;
}

function createPersonSvg(color) {
  return `
    <svg viewBox="0 0 90 170" aria-hidden="true" focusable="false">
      <circle cx="45" cy="22" r="21" fill="${color}" />
      <rect x="14" y="52" width="62" height="78" rx="13" fill="${color}" />
      <rect x="0" y="60" width="14" height="68" rx="7" fill="${color}" />
      <rect x="76" y="60" width="14" height="68" rx="7" fill="${color}" />
      <rect x="24" y="118" width="17" height="52" rx="1.5" fill="${color}" />
      <rect x="49" y="118" width="17" height="52" rx="1.5" fill="${color}" />
      <rect x="40" y="67" width="9" height="58" fill="#ffffff" opacity="0.88" />
    </svg>
  `;
}

function createUrinalSvg() {
  return `
    <svg class="urinal-svg" viewBox="0 0 118 174" aria-hidden="true" focusable="false">
      <rect x="51" y="2" width="16" height="31" rx="3" fill="#d6d9df" stroke="#070707" stroke-width="5" />
      <rect x="45" y="31" width="28" height="12" rx="2" fill="#d6d9df" stroke="#070707" stroke-width="5" />
      <path
        d="M36 39 H82 C94 39 101 48 103 63 L111 127 C114 152 95 169 59 169 C23 169 4 152 7 127 L15 63 C17 48 24 39 36 39 Z"
        fill="#edf0f7"
        stroke="#070707"
        stroke-width="5"
        stroke-linejoin="round"
      />
      <path
        d="M39 58 H79 C88 58 93 65 94 76 L100 125 C102 142 88 153 59 153 C30 153 16 142 18 125 L24 76 C25 65 30 58 39 58 Z"
        fill="#e5e9f2"
        stroke="#070707"
        stroke-width="4.6"
        stroke-linejoin="round"
      />
      <ellipse cx="59" cy="126" rx="29" ry="22" fill="#dfe4ee" opacity="0.38" />
      <path
        d="M45 165 C45 181 73 181 73 165"
        fill="#d6d9df"
        stroke="#070707"
        stroke-width="5"
        stroke-linecap="round"
      />
    </svg>
  `;
}
