const MEN_PER_PLAYER = 10;
const AI_THINKING_MS = 620;

const assetPaths = {
  human: "./assets/blue_player-removebg-preview.png",
  ai: "./assets/red_player-removebg-preview.png",
  urinal: "./assets/urinal-removebg-preview.png",
};

const topRowX = [15.4, 22.7, 30, 37.3, 44.6, 51.9, 59.2, 66.5, 73.8, 81.1, 88.4];
const bottomRowX = [15.4, 22.7, 30, 37.3, 44.6, 51.9, 59.2, 66.5, 73.8, 81.1, 88.4];

const boardSpots = [
  ...topRowX.map((x, order) => ({ id: `top-${order}`, group: "top", order, x, y: 31.5 })),
  ...bottomRowX.map((x, order) => ({ id: `bottom-${order}`, group: "bottom", order, x, y: 83.2 })),
  { id: "right-0", group: "right", order: 0, x: 95.1, y: 39.4 },
  { id: "right-1", group: "right", order: 1, x: 95.1, y: 59 },
  { id: "right-2", group: "right", order: 2, x: 95.1, y: 78.6 },
];

const boardNeighbors = buildBoardNeighbors();

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
  board: document.getElementById("board"),
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

function buildBoardNeighbors() {
  const neighbors = new Map();

  boardSpots.forEach((_, index) => neighbors.set(index, []));

  // Treat the bathroom as one continuous U-shaped row of urinals.
  const continuousPath = [
    ...getSpotIndicesByGroup("top"),
    ...getSpotIndicesByGroup("right"),
    ...getSpotIndicesByGroup("bottom").reverse(),
  ];

  for (let pathIndex = 0; pathIndex < continuousPath.length - 1; pathIndex += 1) {
    connectNeighborSpots(continuousPath[pathIndex], continuousPath[pathIndex + 1], neighbors);
  }

  return neighbors;
}

function getSpotIndicesByGroup(group) {
  return boardSpots
    .map((spot, index) => ({ ...spot, index }))
    .filter((spot) => spot.group === group)
    .sort((a, b) => a.order - b.order)
    .map((spot) => spot.index);
}

function connectNeighborSpots(firstIndex, secondIndex, neighbors) {
  neighbors.get(firstIndex).push(secondIndex);
  neighbors.get(secondIndex).push(firstIndex);
}

function createEmptyBoard() {
  return Array.from({ length: boardSpots.length }, () => null);
}

function buildBoard() {
  elements.board.innerHTML = "";

  boardSpots.forEach((spot, index) => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "urinal-slot";
    slot.dataset.index = String(index);
    slot.dataset.group = spot.group;
    slot.style.setProperty("--spot-x", `${spot.x}%`);
    slot.style.setProperty("--spot-y", `${spot.y}%`);
    slot.setAttribute("aria-label", `urinal ${spot.id}`);
    slot.innerHTML = createUrinalImage();
    slot.addEventListener("click", () => handleHumanMove(index));
    slot.addEventListener("dragover", handleSlotDragOver);
    slot.addEventListener("drop", (event) => handleSlotDrop(event, index));
    elements.board.appendChild(slot);
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

function handleSlotDrop(event, index) {
  event.preventDefault();

  if (!canHumanAct()) {
    return;
  }

  state.draggingHuman = false;
  elements.shell.classList.remove("is-dragging");
  handleHumanMove(index);
}

function handleHumanMove(index) {
  if (!canHumanAct()) {
    return;
  }

  const moved = submitMove("human", index);
  if (!moved) {
    state.selectedHuman = true;
    renderGame();
  }
}

function submitMove(playerId, index) {
  const problem = getMoveProblem(state.board, index);

  // Invalid moves are treated as the game's collision check.
  if (problem) {
    state.message = problem;
    flashCollision(index);
    return false;
  }

  placeMan(state.board, playerId, index);
  state.remaining[playerId] -= 1;
  state.lastMove = { index };
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

  submitMove("ai", move.index);
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

    return getCenterDistance(a.index) - getCenterDistance(b.index);
  });

  return scoredMoves[0];
}

function scoreAiMove(board, move) {
  const simulated = cloneBoard(board);
  placeMan(simulated, "ai", move.index);

  // The prototype AI prefers immediate checkmate and avoids one-move traps.
  const humanReplies = getAvailableMoves(simulated);
  if (humanReplies.length === 0) {
    return 1000;
  }

  const humanCanCheckmate = humanReplies.some((reply) => {
    const replyBoard = cloneBoard(simulated);
    placeMan(replyBoard, "human", reply.index);
    return getAvailableMoves(replyBoard).length === 0;
  });

  return -humanReplies.length * 10 - (humanCanCheckmate ? 45 : 0) - getCenterDistance(move.index);
}

function getCenterDistance(index) {
  const spot = boardSpots[index];
  return Math.abs(54 - spot.x) + Math.abs(58 - spot.y) * 0.55;
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

function getMoveProblem(board, index) {
  if (board[index]) {
    return "OCCUPIED";
  }

  // Only the very first placement can ignore adjacent urinals.
  if (!hasAnyPlacedMan(board)) {
    return "";
  }

  const hasOccupiedNeighbor = getAdjacentIndices(index).some((neighborIndex) => board[neighborIndex]);
  if (hasOccupiedNeighbor) {
    return "BLOCKED";
  }

  return "";
}

function isMoveLegal(board, index) {
  return getMoveProblem(board, index) === "";
}

function hasAnyPlacedMan(board) {
  return board.some(Boolean);
}

function getAdjacentIndices(index) {
  return boardNeighbors.get(index) || [];
}

function getAvailableMoves(board) {
  const moves = [];

  for (let index = 0; index < board.length; index += 1) {
    if (isMoveLegal(board, index)) {
      moves.push({ index });
    }
  }

  return moves;
}

function placeMan(board, playerId, index) {
  board[index] = playerId;
}

function cloneBoard(board) {
  return board.slice();
}

function flashCollision(index) {
  const slot = getSlot(index);
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
      x: 76,
      y: 88 - order * 9.2,
    };
  }

  return {
    x: 76,
    y: 12 + order * 9.2,
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
  const availableKeys = new Set(availableMoves.map((move) => getMoveKey(move.index)));
  const showTargets = canHumanAct() && (state.selectedHuman || state.draggingHuman);

  for (let index = 0; index < boardSpots.length; index += 1) {
    const slot = getSlot(index);
    const occupant = state.board[index];
    const key = getMoveKey(index);
    const isLegalTarget = availableKeys.has(key);

    slot.classList.toggle("occupied", Boolean(occupant));
    slot.classList.toggle("valid-drop", showTargets && isLegalTarget);
    slot.classList.toggle("blocked-drop", showTargets && !isLegalTarget);
    slot.classList.toggle("can-target", canHumanAct());
    slot.classList.toggle(
      "last-move",
      Boolean(state.lastMove && state.lastMove.index === index),
    );

    const existingPerson = slot.querySelector(".placed-person");
    if (existingPerson) {
      existingPerson.remove();
    }

    if (occupant) {
      const placed = document.createElement("div");
      placed.className = `placed-person placed-${occupant}`;
      placed.innerHTML = createPersonImage(occupant);
      slot.appendChild(placed);
    }
  }
}

function getSlot(index) {
  return document.querySelector(`.urinal-slot[data-index="${index}"]`);
}

function getMoveKey(index) {
  return String(index);
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
