class Player {
  constructor(name, index) {
    this.name = name;
    this.index = index;
    this.score = 0;
    this.position = 0;
    this.nitroUntil = 0;
    this.superBoostUntil = 0;
    this.slowedUntil = 0;
    this.easyHintUses = 0;
    this.powerInventory = [];
    this.hardQuestionCooldown = 0;
    this.questionSlots = {
      easy: null,
      hard: null
    };
  }

  hasNitro(now = Date.now()) {
    return this.nitroUntil > now;
  }

  activateNitro(durationMs, now = Date.now()) {
    this.nitroUntil = Math.max(this.nitroUntil, now + durationMs);
  }

  activateSuperBoost(durationMs, now = Date.now()) {
    this.superBoostUntil = Math.max(this.superBoostUntil, now + durationMs);
  }

  hasSuperBoost(now = Date.now()) {
    return this.superBoostUntil > now;
  }

  applyMud(durationMs, now = Date.now()) {
    this.slowedUntil = Math.max(this.slowedUntil, now + durationMs);
  }

  isSlowed(now = Date.now()) {
    return this.slowedUntil > now;
  }

  grantEasyHintUses(count) {
    this.easyHintUses += count;
  }

  move(steps) {
    this.position += steps;
  }

  resetForNewRace() {
    this.position = 0;
    this.nitroUntil = 0;
    this.superBoostUntil = 0;
    this.slowedUntil = 0;
    this.easyHintUses = 0;
    this.powerInventory = [];
    this.hardQuestionCooldown = 0;
    this.questionSlots = {
      easy: null,
      hard: null
    };
  }
}

class MathQuestion {
  constructor(allowedKinds, difficulty = "medium") {
    this.kind = "add";
    this.difficulty = difficulty;
    this.a = 0;
    this.b = 0;
    this.result = 0;
    this.label = "";
    this.generate(allowedKinds);
  }

  randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  isMediumWithThreeDigits() {
    return this.difficulty === "medium" && Math.random() < 0.65;
  }

  generate(allowedKinds) {
    const pool = Array.isArray(allowedKinds) && allowedKinds.length > 0 ? allowedKinds : ["add", "sub"];
    this.kind = pool[Math.floor(Math.random() * pool.length)];

    if (this.kind === "add") {
      if (this.isMediumWithThreeDigits()) {
        this.a = this.randomInt(100, 999);
        this.b = this.randomInt(100, 999);
      } else {
        this.a = Math.floor(Math.random() * 26);
        this.b = Math.floor(Math.random() * 26);
      }
      this.result = this.a + this.b;
      this.label = `${this.a} + ${this.b} = ?`;
      return;
    }

    if (this.kind === "sub") {
      if (this.isMediumWithThreeDigits()) {
        this.a = this.randomInt(100, 999);
        this.b = this.randomInt(100, 999);
      } else {
        this.a = Math.floor(Math.random() * 31);
        this.b = Math.floor(Math.random() * 31);
      }

      if (this.difficulty !== "medium" && this.b > this.a) {
        [this.a, this.b] = [this.b, this.a];
      }

      this.result = this.a - this.b;
      this.label = `${this.a} - ${this.b} = ?`;
      return;
    }

    if (this.kind === "mul") {
      this.a = 2 + Math.floor(Math.random() * 10);
      this.b = 2 + Math.floor(Math.random() * 10);
      this.result = this.a * this.b;
      this.label = `${this.a} x ${this.b} = ?`;
      return;
    }

    if (this.kind === "div") {
      this.b = this.difficulty === "medium" ? this.randomInt(2, 25) : 2 + Math.floor(Math.random() * 9);
      this.result = this.isMediumWithThreeDigits() ? this.randomInt(100, 999) : 2 + Math.floor(Math.random() * 12);
      this.a = this.b * this.result;
      this.label = `${this.a} / ${this.b} = ?`;
      return;
    }

    if (this.kind === "pow") {
      this.a = 2 + Math.floor(Math.random() * 7);
      this.b = 2 + Math.floor(Math.random() * 3);
      this.result = this.a ** this.b;
      this.label = `${this.a} ^ ${this.b} = ?`;
      return;
    }

    const rootBase = 2 + Math.floor(Math.random() * 12);
    this.a = rootBase * rootBase;
    this.result = rootBase;
    this.label = `raiz(${this.a}) = ?`;
  }

  toString() {
    return this.label;
  }

  check(answer) {
    return Number(answer) === this.result;
  }
}

class RaceGame {
  constructor(config) {
    this.players = [new Player(config.player1, 0), new Player(config.player2, 1)];
    this.finishDistance = config.finishDistance;
    this.difficulty = config.difficulty;
    this.turnIndex = 0;
    this.turnCount = 1;
    this.raceFinished = false;
    this.animationFrameId = null;
    this.lastFrameMs = 0;
    this.answerUnlockTimeoutId = null;
    this.answerUnlockIntervalId = null;
    this.isAnswerLocked = false;

    this.speeds = {
      answering: 7,
      waiting: 10,
      superBoost: 12
    };

    this.powerConfig = {
      superBoostMs: 5000,
      mudMs: 5000,
      easyHintCount: 3
    };

    this.el = {
      lanes: Array.from(document.querySelectorAll(".track-lane")),
      playerCards: [document.getElementById("playerCard0"), document.getElementById("playerCard1")],
      playerNames: [document.getElementById("playerName0"), document.getElementById("playerName1")],
      laneLabels: [document.getElementById("laneLabel0"), document.getElementById("laneLabel1")],
      playerScores: [document.getElementById("playerScore0"), document.getElementById("playerScore1")],
      playerNitro: [document.getElementById("playerNitro0"), document.getElementById("playerNitro1")],
      playerPower: [document.getElementById("playerPower0"), document.getElementById("playerPower1")],
      usePowerBtns: [document.getElementById("usePower0"), document.getElementById("usePower1")],
      cars: [document.getElementById("car0"), document.getElementById("car1")],
      turnInfo: document.getElementById("turnInfo"),
      questionEasyText: document.getElementById("questionEasyText"),
      questionHardText: document.getElementById("questionHardText"),
      questionBox: document.getElementById("questionBox"),
      difficultyTag: document.getElementById("difficultyTag"),
      answerForm: document.getElementById("answerForm"),
      answerInput: document.getElementById("answerInput"),
      answerEasyBtn: document.getElementById("answerEasyBtn"),
      answerHardBtn: document.getElementById("answerHardBtn"),
      lockInfo: document.getElementById("lockInfo"),
      feedback: document.getElementById("feedback"),
      historyBody: document.getElementById("historyBody"),
      eventList: document.getElementById("eventList"),
      nextRaceBtn: document.getElementById("nextRaceBtn")
    };
  }

  init() {
    this.players.forEach((player, idx) => {
      this.el.playerNames[idx].textContent = player.name;
      this.el.laneLabels[idx].textContent = player.name;
    });

    this.el.answerForm.addEventListener("submit", (event) => {
      event.preventDefault();
    });

    this.el.answerEasyBtn.addEventListener("click", () => {
      this.handleAnswer("easy");
    });

    this.el.answerHardBtn.addEventListener("click", () => {
      this.handleAnswer("hard");
    });

    this.el.usePowerBtns[0].addEventListener("click", () => {
      this.usePlayerPower(0);
    });

    this.el.usePowerBtns[1].addEventListener("click", () => {
      this.usePlayerPower(1);
    });

    this.el.nextRaceBtn.addEventListener("click", () => {
      this.startNewRace();
    });

    this.el.difficultyTag.textContent = `Dificuldade: ${this.getDifficultyLabel()}`;
    this.initializeQuestionSlots();

    this.updateAllUI();
    this.renderCurrentPlayerQuestions();
    this.lockAnswerForOneSecond();
    this.startMovementLoop();
    this.addEvent(`Corrida iniciada. Distancia para vencer: ${this.finishDistance} m. Dificuldade ${this.getDifficultyLabel()}.`);
  }

  get currentPlayer() {
    return this.players[this.turnIndex];
  }

  updateAllUI() {
    this.updateScores();
    this.updatePositions();
    this.updateTurnStyles();
    this.updatePlayerStateLabels();
    this.updatePowerSlots();
  }

  getPowerLabel(powerCode) {
    if (powerCode === "easyHint") {
      return "Ultimo digito x3";
    }

    if (powerCode === "superBoost") {
      return "Super boost 12m/s";
    }

    if (powerCode === "mud") {
      return "Lama no inimigo";
    }

    return "Desconhecido";
  }

  updatePowerSlots() {
    this.players.forEach((player, idx) => {
      const firstPower = player.powerInventory[0] || null;
      const queueSize = player.powerInventory.length;
      this.el.playerPower[idx].textContent = firstPower
        ? `Slot: ${this.getPowerLabel(firstPower)}${queueSize > 1 ? ` (+${queueSize - 1})` : ""}`
        : "Slot: vazio";

      const canUseNow = !this.raceFinished && idx === this.turnIndex && queueSize > 0;
      this.el.usePowerBtns[idx].disabled = !canUseNow;
    });
  }

  updateScores() {
    this.players.forEach((player, idx) => {
      this.el.playerScores[idx].textContent = String(player.score);
    });
  }

  updatePositions() {
    this.players.forEach((player, idx) => {
      const progress = Math.min(player.position / this.finishDistance, 1);
      const lane = this.el.lanes[idx];
      const car = this.el.cars[idx];

      if (!lane || !car) {
        return;
      }

      const finishLine = lane.querySelector(".finish-line");
      if (!finishLine) {
        return;
      }

      const startLeftPx = 8;
      const carWidth = car.offsetWidth || 46;
      const finishLeftPx = finishLine.offsetLeft;
      const finishWidth = finishLine.offsetWidth || 8;

      // At 100%, the car nose is slightly after the finish line for visual consistency.
      const endLeftPx = Math.max(startLeftPx, finishLeftPx - carWidth + finishWidth + 2);
      const leftPx = startLeftPx + (endLeftPx - startLeftPx) * progress;
      car.style.left = `${leftPx}px`;
    });
  }

  updateTurnStyles() {
    this.el.playerCards.forEach((card, idx) => {
      card.classList.toggle("active", idx === this.turnIndex);
    });

    const current = this.currentPlayer;
    this.el.turnInfo.textContent = `Vez de ${current.name}`;

    this.el.questionBox.classList.toggle("turn-p1", this.turnIndex === 0);
    this.el.questionBox.classList.toggle("turn-p2", this.turnIndex === 1);
    this.updatePowerSlots();
  }

  syncQuestionButtonsState() {
    if (this.raceFinished) {
      this.el.answerEasyBtn.disabled = true;
      this.el.answerHardBtn.disabled = true;
      return;
    }

    const hardOnCooldown = this.currentPlayer.hardQuestionCooldown > 0;
    this.el.answerEasyBtn.disabled = this.isAnswerLocked;
    this.el.answerHardBtn.disabled = this.isAnswerLocked || hardOnCooldown;
  }

  updatePlayerStateLabels(now = Date.now()) {
    this.players.forEach((player, idx) => {
      const speed = this.getPlayerSpeed(idx, now);
      const states = [];
      if (player.hasSuperBoost(now)) {
        states.push("Super boost");
      }
      if (player.isSlowed(now)) {
        states.push("Lama");
      }
      if (player.easyHintUses > 0) {
        states.push(`Dica facil x${player.easyHintUses}`);
      }

      this.el.playerNitro[idx].textContent = `Velocidade: ${speed.toFixed(1)} m/s | ${states.length > 0 ? states.join(" | ") : "Sem efeito"}`;
      this.el.cars[idx].classList.toggle("nitro", player.hasSuperBoost(now));
    });
  }

  getPlayerSpeed(playerIndex, now = Date.now()) {
    const player = this.players[playerIndex];
    const baseSpeed = playerIndex === this.turnIndex ? this.speeds.answering : this.speeds.waiting;
    let speed = baseSpeed;

    if (player.hasSuperBoost(now)) {
      speed = Math.max(speed, this.speeds.superBoost);
    }

    if (player.isSlowed(now)) {
      speed *= 0.5;
    }

    return speed;
  }

  startMovementLoop() {
    this.stopMovementLoop();
    this.lastFrameMs = performance.now();

    const tick = (timestamp) => {
      if (this.raceFinished) {
        return;
      }

      const now = Date.now();
      const deltaSeconds = Math.min((timestamp - this.lastFrameMs) / 1000, 0.06);
      this.lastFrameMs = timestamp;

      this.players.forEach((player, idx) => {
        const speed = this.getPlayerSpeed(idx, now);
        player.move(speed * deltaSeconds);
      });

      this.updatePositions();
      this.updatePlayerStateLabels(now);
      this.checkRaceFinish();

      if (!this.raceFinished) {
        this.animationFrameId = window.requestAnimationFrame(tick);
      }
    };

    this.animationFrameId = window.requestAnimationFrame(tick);
  }

  stopMovementLoop() {
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  checkRaceFinish() {
    const finalists = this.players.filter((player) => player.position >= this.finishDistance);
    if (finalists.length === 0) {
      return;
    }

    finalists.sort((a, b) => b.position - a.position);
    this.finishRace(finalists[0]);
  }

  getDifficultyLabel() {
    if (this.difficulty === "easy") {
      return "Facil";
    }

    if (this.difficulty === "hard") {
      return "Dificil";
    }

    return "Medio";
  }

  getQuestionPoolsByDifficulty() {
    if (this.difficulty === "easy") {
      return {
        easy: ["add"],
        hard: ["sub"]
      };
    }

    if (this.difficulty === "hard") {
      return {
        easy: ["mul", "div"],
        hard: ["pow", "root"]
      };
    }

    return {
      easy: ["add", "sub"],
      hard: ["mul", "div"]
    };
  }

  initializeQuestionSlots() {
    this.players.forEach((player) => {
      player.questionSlots.easy = this.createQuestion("easy");
      player.questionSlots.hard = this.createQuestion("hard");
    });
  }

  createQuestion(tier) {
    const pools = this.getQuestionPoolsByDifficulty();
    const targetPool = tier === "hard" ? pools.hard : pools.easy;
    return new MathQuestion(targetPool, this.difficulty);
  }

  getEasyHintText(player, question) {
    if (!question || player.easyHintUses <= 0) {
      return "";
    }

    const absResult = Math.abs(question.result);
    if (absResult < 10) {
      return "";
    }

    const digit = absResult % 10;
    return ` (Dica: ultimo digito = ${digit})`;
  }

  renderCurrentPlayerQuestions() {
    const player = this.currentPlayer;
    const easyQ = player.questionSlots.easy;
    const hardQ = player.questionSlots.hard;
    const hardCooldown = player.hardQuestionCooldown;

    this.el.questionEasyText.textContent = `${easyQ.toString()}${this.getEasyHintText(player, easyQ)}`;
    this.el.questionHardText.textContent = hardCooldown > 0
      ? `${hardQ.toString()} (Cooldown: ${hardCooldown} pergunta(s))`
      : hardQ.toString();
    this.el.answerInput.value = "";
    this.syncQuestionButtonsState();
  }

  lockAnswerForOneSecond() {
    this.clearLockTimers();

    const lockMs = 1000;
    const unlockAt = Date.now() + lockMs;
    this.isAnswerLocked = true;
    this.el.answerInput.disabled = true;
    this.syncQuestionButtonsState();

    const refreshLockText = () => {
      const remainingMs = Math.max(0, unlockAt - Date.now());
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      this.el.lockInfo.textContent = remainingMs > 0 ? `Aguarde ${remainingSeconds}s para responder...` : "Pode responder.";
    };

    refreshLockText();
    this.answerUnlockIntervalId = window.setInterval(refreshLockText, 120);

    this.answerUnlockTimeoutId = window.setTimeout(() => {
      this.clearLockTimers();
      this.isAnswerLocked = false;
      this.el.answerInput.disabled = false;
      this.syncQuestionButtonsState();
      this.el.lockInfo.textContent = "Pode responder.";
      this.el.answerInput.focus();
    }, lockMs);
  }

  clearLockTimers() {
    if (this.answerUnlockTimeoutId !== null) {
      window.clearTimeout(this.answerUnlockTimeoutId);
      this.answerUnlockTimeoutId = null;
    }

    if (this.answerUnlockIntervalId !== null) {
      window.clearInterval(this.answerUnlockIntervalId);
      this.answerUnlockIntervalId = null;
    }
  }

  getRandomPower() {
    const powers = ["easyHint", "superBoost", "mud"];
    const idx = Math.floor(Math.random() * powers.length);
    return powers[idx];
  }

  storeRandomPower(player) {
    const power = this.getRandomPower();
    player.powerInventory.push(power);

    // Keep queue bounded to avoid unlimited stacking in long matches.
    if (player.powerInventory.length > 3) {
      player.powerInventory.shift();
    }

    return `${player.name} guardou no slot: ${this.getPowerLabel(power)}.`;
  }

  usePlayerPower(playerIndex) {
    if (this.raceFinished) {
      return;
    }

    if (playerIndex !== this.turnIndex) {
      this.showFeedback("Voce so pode usar poder na sua vez.", false);
      return;
    }

    const player = this.players[playerIndex];
    if (player.powerInventory.length === 0) {
      this.showFeedback("Seu slot de poder esta vazio.", false);
      return;
    }

    const power = player.powerInventory.shift();
    const now = Date.now();
    let message = "";

    if (power === "easyHint") {
      player.grantEasyHintUses(this.powerConfig.easyHintCount);
      message = `${player.name} ativou dica: ultimo digito nas proximas ${this.powerConfig.easyHintCount} perguntas faceis.`;
    } else if (power === "superBoost") {
      player.activateSuperBoost(this.powerConfig.superBoostMs, now);
      message = `${player.name} ativou super boost (12 m/s por 5s).`;
    } else {
      const opponent = this.players[(player.index + 1) % this.players.length];
      opponent.applyMud(this.powerConfig.mudMs, now);
      message = `${player.name} ativou lama e reduziu a velocidade de ${opponent.name} pela metade por 5s.`;
    }

    this.showFeedback(message, true);
    this.addEvent(message);
    this.renderCurrentPlayerQuestions();
    this.updateAllUI();
  }

  handleAnswer(questionTier) {
    if (this.raceFinished) {
      return;
    }

    if (this.el.answerInput.disabled) {
      this.showFeedback("Aguarde o desbloqueio da pergunta.", false);
      return;
    }

    const player = this.currentPlayer;
    if (questionTier === "hard" && player.hardQuestionCooldown > 0) {
      this.showFeedback(`Pergunta dificil em cooldown: faltam ${player.hardQuestionCooldown} pergunta(s).`, false);
      return;
    }

    const rawValue = this.el.answerInput.value.trim();
    if (rawValue === "") {
      this.showFeedback("Informe um numero para responder.", false);
      return;
    }

    const answer = Number(rawValue);
    if (Number.isNaN(answer)) {
      this.showFeedback("Informe um numero valido.", false);
      return;
    }

    const now = Date.now();
    const activeQuestion = player.questionSlots[questionTier];
    const isCorrect = activeQuestion.check(answer);
    let bonusMessage = "";

    if (isCorrect) {
      if (questionTier === "hard") {
        bonusMessage = this.storeRandomPower(player);
        this.showFeedback(`Resposta correta! ${bonusMessage}`, true);
        this.addEvent(`${player.name} acertou a pergunta dificil e ganhou poder no slot.`);
      } else {
        this.showFeedback(`Resposta correta! ${player.name} acertou a pergunta facil.`, true);
        this.addEvent(`${player.name} acertou a pergunta facil.`);
      }
    } else {
      this.showFeedback(`Resposta incorreta. A resposta era ${activeQuestion.result}.`, false);
      this.addEvent(`${player.name} errou. Turno passa para o adversario.`);
    }

    if (questionTier === "easy" && player.easyHintUses > 0) {
      const absResult = Math.abs(activeQuestion.result);
      if (absResult >= 10) {
        player.easyHintUses -= 1;
      }
    }

    if (questionTier === "hard") {
      player.hardQuestionCooldown = 5;
    } else if (player.hardQuestionCooldown > 0) {
      player.hardQuestionCooldown -= 1;
    }

    this.appendHistoryRow({
      turn: this.turnCount,
      playerName: player.name,
      question: `${questionTier === "easy" ? "[Facil]" : "[Dificil]"} ${activeQuestion.toString()}`,
      answer: String(answer),
      resultText: isCorrect ? "Acerto" : "Erro",
      position: `${player.position.toFixed(1)} m / ${this.finishDistance} m`
    });

    player.questionSlots[questionTier] = this.createQuestion(questionTier);

    this.updateAllUI();

    this.turnCount += 1;
    this.turnIndex = (this.turnIndex + 1) % this.players.length;
    this.updateTurnStyles();
    this.renderCurrentPlayerQuestions();
    this.lockAnswerForOneSecond();
    this.updatePlayerStateLabels();
  }

  appendHistoryRow(data) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${data.turn}</td>
      <td>${data.playerName}</td>
      <td>${data.question}</td>
      <td>${data.answer}</td>
      <td>${data.resultText}</td>
      <td>${data.position}</td>
    `;

    this.el.historyBody.appendChild(row);

    while (this.el.historyBody.rows.length > 12) {
      this.el.historyBody.deleteRow(0);
    }
  }

  addEvent(text) {
    const item = document.createElement("li");
    item.textContent = text;
    this.el.eventList.prepend(item);

    while (this.el.eventList.children.length > 8) {
      this.el.eventList.removeChild(this.el.eventList.lastElementChild);
    }
  }

  finishRace(winner) {
    if (this.raceFinished) {
      return;
    }

    this.raceFinished = true;
    this.stopMovementLoop();
    this.clearLockTimers();
    winner.score += 1;
    winner.position = this.finishDistance;
    this.updatePositions();
    this.updateScores();
    this.updatePlayerStateLabels();
    this.showFeedback(`${winner.name} venceu a corrida!`, true);
    this.addEvent(`${winner.name} cruzou a linha de chegada e marcou 1 ponto.`);

    this.isAnswerLocked = true;
    this.el.answerInput.disabled = true;
    this.syncQuestionButtonsState();
    this.el.usePowerBtns[0].disabled = true;
    this.el.usePowerBtns[1].disabled = true;
    this.el.lockInfo.textContent = "";
    this.el.nextRaceBtn.classList.remove("hidden");
  }

  startNewRace() {
    this.players.forEach((player) => {
      player.resetForNewRace();
    });

    this.raceFinished = false;
    this.turnIndex = 0;
    this.turnCount = 1;

    this.clearLockTimers();
    this.isAnswerLocked = false;
    this.el.answerInput.disabled = false;
    this.el.nextRaceBtn.classList.add("hidden");

    this.initializeQuestionSlots();

    this.addEvent("Nova corrida iniciada.");
    this.updateAllUI();
    this.renderCurrentPlayerQuestions();
    this.lockAnswerForOneSecond();
    this.startMovementLoop();
    this.showFeedback("", true);
  }

  showFeedback(message, isSuccess) {
    this.el.feedback.textContent = message;
    this.el.feedback.classList.toggle("ok", isSuccess);
    this.el.feedback.classList.toggle("fail", !isSuccess && message !== "");
  }
}

function getGameConfigFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const p1 = (params.get("p1") || "Jogador 1").trim();
  const p2 = (params.get("p2") || "Jogador 2").trim();
  const d = Number(params.get("d") || 12);
  const level = String(params.get("level") || "medium").toLowerCase();
  const validDifficulty = ["easy", "medium", "hard"].includes(level) ? level : "medium";

  return {
    player1: p1 || "Jogador 1",
    player2: p2 || "Jogador 2",
    finishDistance: Number.isInteger(d) && d >= 8 && d <= 25 ? d * 30 : 360,
    difficulty: validDifficulty
  };
}

const raceGame = new RaceGame(getGameConfigFromQuery());
raceGame.init();
