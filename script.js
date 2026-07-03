const URINALS_PER_ROW = 10;
const ROW_COUNT = 2;
const MEN_PER_PLAYER = 10;
const AI_THINKING_MS = 620;
const assetPaths = {
  human: "./assets/blue_player-removebg-preview.png",
  ai: "./assets/red_player-removebg-preview.png",
  urinal: "./assets/urinal-removebg-preview.png",
};

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
  mainMenu: document.getElementById("mainMenu"),
  pvpPanel: document.getElementById("pvpPanel"),
  gameView: document.getElementById("gameView"),
  lanes: Array.from(document.querySelectorAll(".lane")),
  redQueue: document.getElementById("redQueue"),
  blueQueue: document.getElementById("blueQueue"),
  aiModeButton: document.getElementById("aiModeButton"),
  pvpModeButton: document.getElementById("pvpModeButton"),
  pvpBackButton: document.getElementById("pvpBackButton"),
  menuButton: document.getElementById("menuButton"),
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
  mode: null,
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
      slot.innerHTML = createUrinalImage();
      slot.addEventListener("click", () => handleHumanMove(row, index));
      slot.addEventListener("dragover", handleSlotDragOver);
      slot.addEventListener("drop", (event) => handleSlotDrop(event, row, index));
      slot.addEventListener("dragleave", () => slot.classList.remove("hovering"));
      lane.appendChild(slot);
    }
  });
}

function bindControls() {
  elements.aiModeButton.addEventListener("click", openAiGame);
  elements.pvpModeButton.addEventListener("click", openPvpPanel);
  elements.pvpBackButton.addEventListener("click", showMainMenu);
  elements.menuButton.addEventListener("click", showMainMenu);
  elements.startButton.addEventListener("click", startGame);
  elements.restartButton.addEventListener("click", restartGame);
  elements.gameOverRestart.addEventListener("click", restartGame);
}

function openAiGame() {
  resetState();
  state.mode = "ai";
  state.message = "READY";
  showScreen("game");
  renderGame();
}

function openPvpPanel() {
  resetState();
  state.mode = "pvp";
  showScreen("pvp");
}

function showMainMenu() {
  resetState();
  state.mode = null;
  state.message = "READY";
  showScreen("menu");
  renderGame();
}

function showScreen(screenName) {
  elements.mainMenu.hidden = screenName !== "menu";
  elements.pvpPanel.hidden = screenName !== "pvp";
  elements.gameView.hidden = screenName !== "game";
}

function startGame() {
  if (state.mode !== "ai") {
    return;
  }

  resetState();
  state.mode = "ai";
  state.started = true;
  state.message = "BLUE TURN";
  showScreen("game");
  renderGame();
}

function restartGame() {
  if (state.mode !== "ai") {
    return;
  }

  resetState();
  state.mode = "ai";
  state.started = true;
  state.message = "BLUE TURN";
  showScreen("game");
  renderGame();
}

function resetState() {
  clearTimeout(state.aiTimer);
  state.started = false;
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
  if (state.currentPlayer === "ai" && state.mode === "ai") {
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
  if (state.mode !== "ai" || state.gameOver || state.currentPlayer !== "ai") {
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
  return state.mode === "ai" && state.started && !state.gameOver && state.currentPlayer === "human";
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
    person.innerHTML = createPersonImage(playerId);

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
        placed.innerHTML = createPersonImage(occupant);
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

function createPersonImage(playerId) {
  const player = players[playerId];
  const src = assetPaths[playerId];

  return `
    <img class="person-image" src="${src}" alt="${player.label} player" draggable="false" />
  `;
}

function createUrinalImage() {
  return `
    <img class="urinal-image" src="${assetPaths.urinal}" alt="" draggable="false" />
  `;
}
