class Player {
  constructor(name, index) {
    this.name = name;
    this.index = index;
    this.score = 0;
    this.position = 0;
    this.nitroUntil = 0;
    this.superBoostUntil = 0;
    this.correctBoostUntil = 0;
    this.slowedUntil = 0;
    this.easyHintUses = 0;
    this.powerInventory = [];
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

  activateCorrectBoost(durationMs, now = Date.now()) {
    this.correctBoostUntil = Math.max(this.correctBoostUntil, now + durationMs);
  }

  hasCorrectBoost(now = Date.now()) {
    return this.correctBoostUntil > now;
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
    this.correctBoostUntil = 0;
    this.slowedUntil = 0;
    this.easyHintUses = 0;
    this.powerInventory = [];
    this.questionSlots = {
      easy: null,
      hard: null
    };
  }
}

class MathQuestion {
  constructor(difficulty = "medium") {
    this.kind = "expression";
    this.difficulty = difficulty;
    this.result = 0;
    this.label = "";
    this.generate();
  }

  randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  randomIntFrom(min, max) {
    if (max < min) {
      return min;
    }

    return this.randomInt(min, max);
  }

  pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  getSymbol(op) {
    if (op === "*") {
      return "x";
    }

    return op;
  }

  applyOperation(a, b, op) {
    if (op === "+") {
      return a + b;
    }

    if (op === "-") {
      return a - b;
    }

    if (op === "*") {
      return a * b;
    }

    return a / b;
  }

  createExactDivision(maxNumber) {
    const divisor = this.randomIntFrom(2, Math.min(maxNumber, 12));
    const quotient = this.randomIntFrom(1, Math.max(1, Math.floor(maxNumber / divisor)));
    return {
      a: divisor * quotient,
      b: divisor,
      result: quotient
    };
  }

  createSingleOpQuestion(ops, maxNumber, allowNegative = false) {
    const op = this.pick(ops);
    let a = this.randomInt(0, maxNumber);
    let b = this.randomInt(0, maxNumber);

    if (op === "/") {
      const exact = this.createExactDivision(maxNumber);
      a = exact.a;
      b = exact.b;
      return {
        label: `${a} / ${b} = ?`,
        result: exact.result
      };
    }

    if (op === "-" && !allowNegative && b > a) {
      [a, b] = [b, a];
    }

    return {
      label: `${a} ${this.getSymbol(op)} ${b} = ?`,
      result: this.applyOperation(a, b, op)
    };
  }

  evaluateWithoutParentheses(a, op1, b, op2, c) {
    const highPriority = ["*", "/"];
    if (highPriority.includes(op2) && !highPriority.includes(op1)) {
      const right = this.applyOperation(b, c, op2);
      return this.applyOperation(a, right, op1);
    }

    const left = this.applyOperation(a, b, op1);
    return this.applyOperation(left, c, op2);
  }

  createEasyQuestion() {
    // Easy: one immediate operation, numbers up to 20, only add/sub.
    return this.createSingleOpQuestion(["+", "-"], 20, false);
  }

  createMediumQuestion() {
    // Medium: add/sub/mul, numbers up to 50, no parentheses, up to 2 operations.
    const useTwoOps = Math.random() < 0.55;
    if (!useTwoOps) {
      return this.createSingleOpQuestion(["+", "-", "*"], 50, false);
    }

    const a = this.randomInt(0, 50);
    const b = this.randomInt(0, 50);
    const c = this.randomInt(0, 50);
    const op1 = this.pick(["+", "-", "*"]);
    const op2 = this.pick(["+", "-", "*"]);
    const result = this.evaluateWithoutParentheses(a, op1, b, op2, c);

    return {
      label: `${a} ${this.getSymbol(op1)} ${b} ${this.getSymbol(op2)} ${c} = ?`,
      result
    };
  }

  createHardQuestion() {
    // Hard: mixed operations, up to 2 calculation stages, optional simple parentheses, numbers up to 100.
    const useTwoOps = Math.random() < 0.75;
    if (!useTwoOps) {
      const op = this.pick(["+", "-", "*", "/"]);
      if (op === "*") {
        const oneDigitFactor = this.randomInt(1, 9);
        const otherFactor = this.randomInt(0, 100);
        const swap = Math.random() < 0.5;
        const a = swap ? oneDigitFactor : otherFactor;
        const b = swap ? otherFactor : oneDigitFactor;
        return {
          label: `${a} x ${b} = ?`,
          result: a * b
        };
      }

      if (op === "/") {
        const exact = this.createExactDivision(100);
        return {
          label: `${exact.a} / ${exact.b} = ?`,
          result: exact.result
        };
      }

      let a = this.randomInt(0, 100);
      let b = this.randomInt(0, 100);
      if (op === "-" && b > a) {
        [a, b] = [b, a];
      }

      return {
        label: `${a} ${this.getSymbol(op)} ${b} = ?`,
        result: this.applyOperation(a, b, op)
      };
    }

    const op1 = this.pick(["+", "-", "*", "/"]);
    const op2Pool = op1 === "*" ? ["+", "-", "/"] : ["+", "-", "*", "/"];
    const op2 = this.pick(op2Pool);
    const useParentheses = Math.random() < 0.5;

    let a = this.randomInt(0, 100);
    let b = this.randomInt(0, 100);
    let c = this.randomInt(1, 100);

    if (useParentheses) {
      if (op1 === "/") {
        const exact = this.createExactDivision(100);
        a = exact.a;
        b = exact.b;
      } else if (op1 === "*") {
        const oneDigitFactor = this.randomInt(1, 9);
        const otherFactor = this.randomInt(0, 100);
        const swap = Math.random() < 0.5;
        a = swap ? oneDigitFactor : otherFactor;
        b = swap ? otherFactor : oneDigitFactor;
      } else if (op1 === "-" && b > a) {
        [a, b] = [b, a];
      }

      const first = this.applyOperation(a, b, op1);
      if (op2 === "/") {
        const divisors = [];
        const absFirst = Math.abs(first);
        for (let i = 1; i <= Math.min(100, absFirst || 1); i += 1) {
          if (absFirst % i === 0) {
            divisors.push(i);
          }
        }
        c = divisors.length > 0 ? this.pick(divisors) : 1;
      }

      const result = this.applyOperation(first, c, op2);
      return {
        label: `(${a} ${this.getSymbol(op1)} ${b}) ${this.getSymbol(op2)} ${c} = ?`,
        result
      };
    }

    if (op1 === "/") {
      const exact = this.createExactDivision(100);
      a = exact.a;
      b = exact.b;
    } else if (op1 === "*") {
      const oneDigitFactor = this.randomInt(1, 9);
      const otherFactor = this.randomInt(0, 100);
      const swap = Math.random() < 0.5;
      a = swap ? oneDigitFactor : otherFactor;
      b = swap ? otherFactor : oneDigitFactor;
    } else if (op1 === "-" && b > a) {
      [a, b] = [b, a];
    }

    if (op2 === "/") {
      c = this.randomIntFrom(2, 12);

      if (op1 === "+" || op1 === "-") {
        const quotient = this.randomIntFrom(1, Math.max(1, Math.floor(100 / c)));
        b = quotient * c;
        if (op1 === "-") {
          a = this.randomIntFrom(b, 100);
        }
      } else if (op1 === "*") {
        const factor = this.randomIntFrom(1, Math.max(1, Math.floor(100 / c)));
        a = factor * c;
      } else {
        b = this.randomIntFrom(2, 10);
        c = this.randomIntFrom(2, 10);
        const k = this.randomIntFrom(1, Math.max(1, Math.floor(100 / (b * c))));
        a = b * c * k;
      }
    }

    if (op2 === "*") {
      const oneDigitFactor = this.randomInt(1, 9);
      const swap = Math.random() < 0.5;
      b = swap ? oneDigitFactor : b;
      c = swap ? c : oneDigitFactor;
    }

    const result = this.evaluateWithoutParentheses(a, op1, b, op2, c);
    return {
      label: `${a} ${this.getSymbol(op1)} ${b} ${this.getSymbol(op2)} ${c} = ?`,
      result
    };
  }

  createVeryHardQuestion() {
    // Very hard: exactly 3 stages, mixed ops including exact division, parentheses required.
    const ops = ["+", "-", "*", "/"];
    let op1 = this.pick(ops);
    let op2 = this.pick(ops);
    let op3 = this.pick(ops);

    if (![op1, op2, op3].includes("/")) {
      const indexToReplace = this.randomInt(1, 3);
      if (indexToReplace === 1) {
        op1 = "/";
      } else if (indexToReplace === 2) {
        op2 = "/";
      } else {
        op3 = "/";
      }
    }

    let a = this.randomInt(0, 100);
    let b = this.randomInt(1, 100);
    let c = this.randomInt(1, 100);
    let d = this.randomInt(1, 100);

    if (op1 === "/") {
      const exact = this.createExactDivision(100);
      a = exact.a;
      b = exact.b;
    } else if (op1 === "-" && b > a) {
      [a, b] = [b, a];
    }

    let first = this.applyOperation(a, b, op1);
    if (op2 === "/") {
      const absFirst = Math.abs(first);
      if (absFirst <= 1) {
        c = 1;
      } else {
        const divisors = [];
        for (let i = 1; i <= Math.min(100, absFirst); i += 1) {
          if (absFirst % i === 0) {
            divisors.push(i);
          }
        }
        c = divisors.length > 0 ? this.pick(divisors) : 1;
      }
    }

    const second = this.applyOperation(first, c, op2);

    if (op3 === "/") {
      const absSecond = Math.abs(second);
      if (absSecond <= 1) {
        d = 1;
      } else {
        const divisors = [];
        for (let i = 1; i <= Math.min(100, absSecond); i += 1) {
          if (absSecond % i === 0) {
            divisors.push(i);
          }
        }
        d = divisors.length > 0 ? this.pick(divisors) : 1;
      }
    }

    const result = this.applyOperation(second, d, op3);
    return {
      label: `((${a} ${this.getSymbol(op1)} ${b}) ${this.getSymbol(op2)} ${c}) ${this.getSymbol(op3)} ${d} = ?`,
      result
    };
  }

  generate() {
    let question;

    if (this.difficulty === "easy") {
      question = this.createEasyQuestion();
    } else if (this.difficulty === "medium") {
      question = this.createMediumQuestion();
    } else if (this.difficulty === "hard") {
      question = this.createHardQuestion();
    } else {
      question = this.createVeryHardQuestion();
    }

    this.result = question.result;
    this.label = question.label;
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
    this.sharedHardQuestion = null;
    this.sharedHardCooldownTurns = 0;

    this.speeds = {
      answering: 7,
      waiting: 10,
      superBoost: 12,
      correctBoost: 13
    };

    this.powerConfig = {
      superBoostMs: 5000,
      mudMs: 5000,
      easyHintCount: 3,
      correctBoostMs: 3000
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

    const hardOnCooldown = this.sharedHardCooldownTurns > 0;
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
      if (player.hasCorrectBoost(now)) {
        states.push("Acerto: 13 km/h");
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

    if (player.hasCorrectBoost(now)) {
      speed = Math.max(speed, this.speeds.correctBoost);
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

  getQuestionDifficulty(tier) {
    const levelOrder = ["easy", "medium", "hard", "veryHard"];
    const currentIndex = Math.max(0, levelOrder.indexOf(this.difficulty));

    if (tier === "hard") {
      return levelOrder[Math.min(currentIndex + 1, levelOrder.length - 1)];
    }

    return levelOrder[currentIndex];
  }

  initializeQuestionSlots() {
    this.players.forEach((player) => {
      player.questionSlots.easy = this.createQuestion("easy");
    });

    this.sharedHardQuestion = this.createQuestion("hard");
    this.sharedHardCooldownTurns = 0;
  }

  createQuestion(tier) {
    const questionDifficulty = this.getQuestionDifficulty(tier);
    return new MathQuestion(questionDifficulty);
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
    const hardQ = this.sharedHardQuestion;
    const hardCooldown = this.sharedHardCooldownTurns;

    this.el.questionEasyText.textContent = `${easyQ.toString()}${this.getEasyHintText(player, easyQ)}`;
    this.el.questionHardText.textContent = hardCooldown > 0
      ? `${hardQ.toString()} (Cooldown global: ${hardCooldown} rodada(s))`
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
    if (questionTier === "hard" && this.sharedHardCooldownTurns > 0) {
      this.showFeedback(`Pergunta dificil em cooldown global: faltam ${this.sharedHardCooldownTurns} rodada(s).`, false);
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
    const activeQuestion = questionTier === "hard" ? this.sharedHardQuestion : player.questionSlots.easy;
    const isCorrect = activeQuestion.check(answer);
    let bonusMessage = "";

    if (isCorrect) {
      player.activateCorrectBoost(this.powerConfig.correctBoostMs, now);

      if (questionTier === "hard") {
        bonusMessage = this.storeRandomPower(player);
        this.sharedHardCooldownTurns = 4;
        this.sharedHardQuestion = this.createQuestion("hard");
        this.showFeedback(`Resposta correta! ${bonusMessage}`, true);
        this.addEvent(`${player.name} acertou a pergunta dificil compartilhada. Cooldown global de 4 rodadas ativado.`);
      } else {
        this.showFeedback(`Resposta correta! ${player.name} acertou a pergunta comum.`, true);
        this.addEvent(`${player.name} acertou a pergunta comum.`);
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

    if (questionTier !== "hard" && this.sharedHardCooldownTurns > 0) {
      this.sharedHardCooldownTurns -= 1;
    }

    this.appendHistoryRow({
      turn: this.turnCount,
      playerName: player.name,
      question: `${questionTier === "easy" ? "[Comum]" : "[Dificil]"} ${activeQuestion.toString()}`,
      answer: String(answer),
      resultText: isCorrect ? "Acerto" : "Erro",
      position: `${player.position.toFixed(1)} m / ${this.finishDistance} m`
    });

    if (questionTier === "easy") {
      player.questionSlots.easy = this.createQuestion("easy");
    }

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
    finishDistance: Number.isInteger(d) && d >= 8 && d <= 100 ? d * 30 : 360,
    difficulty: validDifficulty
  };
}

const raceGame = new RaceGame(getGameConfigFromQuery());
raceGame.init();
