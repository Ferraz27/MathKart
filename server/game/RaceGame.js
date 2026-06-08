import { MathQuestion } from "./MathQuestion.js";

const SPEEDS = { answering: 7, waiting: 10, superBoost: 12, correctBoost: 13 };
const POWER_CONFIG = { superBoostMs: 5000, mudMs: 5000, easyHintCount: 3, correctBoostMs: 3000 };
const LOCK_MS = 1000;
const TICK_MS = 50;

function makePlayer(name, index) {
  return {
    name, index,
    score: 0,
    position: 0,
    nitroUntil: 0,
    superBoostUntil: 0,
    correctBoostUntil: 0,
    slowedUntil: 0,
    easyHintUses: 0,
    powerInventory: [],
    questionSlots: { easy: null, hard: null },
    socketId: null,
    answerUnlockAt: 0,
  };
}

function getQuestionDifficulty(difficulty, tier) {
  const order = ["easy", "medium", "hard", "veryHard"];
  const idx = Math.max(0, order.indexOf(difficulty));
  return tier === "hard" ? order[Math.min(idx + 1, order.length - 1)] : order[idx];
}

function createQuestion(difficulty, tier) {
  return new MathQuestion(getQuestionDifficulty(difficulty, tier));
}

function playerSpeed(player, isTurn, now) {
  const base = isTurn ? SPEEDS.answering : SPEEDS.waiting;
  let speed = base;
  if (player.superBoostUntil > now) speed = Math.max(speed, SPEEDS.superBoost);
  if (player.correctBoostUntil > now) speed = Math.max(speed, SPEEDS.correctBoost);
  if (player.slowedUntil > now) speed *= 0.5;
  return speed;
}

function getPowerLabel(code) {
  if (code === "easyHint") return "Ultimo digito x3";
  if (code === "superBoost") return "Super boost 12m/s";
  if (code === "mud") return "Lama no inimigo";
  return "Desconhecido";
}

export class RaceGame {
  constructor(config, emit) {
    this.config = config;
    this.emit = emit; // fn(event, payload) — broadcasts to room
    this.players = [makePlayer(config.player1, 0), makePlayer(config.player2, 1)];
    this.turnIndex = 0;
    this.turnCount = 1;
    this.raceFinished = false;
    this.sharedHardQuestion = null;
    this.sharedHardCooldownTurns = 0;
    this.lastTickMs = Date.now();
    this.tickInterval = null;
    this.history = [];
    this.events = [];
    this.pendingNewRace = new Set();
  }

  start() {
    this._initQuestionSlots();
    this._addEvent(`Corrida iniciada. Distancia: ${this.config.finishDistance} m. Dificuldade: ${this._diffLabel()}.`);
    this._lockAnswerForCurrentPlayer();
    this._startTick();
    this.emit("game_started", this._snapshot());
  }

  _initQuestionSlots() {
    this.players.forEach(p => { p.questionSlots.easy = createQuestion(this.config.difficulty, "easy"); });
    this.sharedHardQuestion = createQuestion(this.config.difficulty, "hard");
    this.sharedHardCooldownTurns = 0;
  }

  _diffLabel() {
    if (this.config.difficulty === "easy") return "Facil";
    if (this.config.difficulty === "hard") return "Dificil";
    return "Medio";
  }

  _lockAnswerForCurrentPlayer() {
    this.players[this.turnIndex].answerUnlockAt = Date.now() + LOCK_MS;
  }

  _startTick() {
    this.lastTickMs = Date.now();
    this.tickInterval = setInterval(() => this._tick(), TICK_MS);
  }

  _stopTick() {
    if (this.tickInterval) { clearInterval(this.tickInterval); this.tickInterval = null; }
  }

  _tick() {
    const now = Date.now();
    const delta = Math.min((now - this.lastTickMs) / 1000, 0.1);
    this.lastTickMs = now;

    this.players.forEach((p, i) => {
      const speed = playerSpeed(p, i === this.turnIndex, now);
      p.position += speed * delta;
    });

    this._checkFinish();

    if (!this.raceFinished) {
      this.emit("game_state", this._snapshot());
    }
  }

  _checkFinish() {
    const finalists = this.players.filter(p => p.position >= this.config.finishDistance);
    if (!finalists.length) return;
    finalists.sort((a, b) => b.position - a.position);
    this._finishRace(finalists[0]);
  }

  _finishRace(winner) {
    if (this.raceFinished) return;
    this.raceFinished = true;
    this._stopTick();
    winner.score += 1;
    winner.position = this.config.finishDistance;
    this._addEvent(`${winner.name} cruzou a linha de chegada e marcou 1 ponto.`);
    this.emit("race_finished", { ...this._snapshot(), winnerIndex: winner.index });
  }

  submitAnswer(socketId, questionTier, answer) {
    if (this.raceFinished) return { ok: false, msg: "Corrida encerrada." };

    const player = this.players[this.turnIndex];
    if (player.socketId !== socketId) return { ok: false, msg: "Nao e sua vez." };

    const now = Date.now();
    if (player.answerUnlockAt > now) return { ok: false, msg: "Aguarde o desbloqueio." };

    if (questionTier === "hard" && this.sharedHardCooldownTurns > 0) {
      return { ok: false, msg: `Pergunta dificil em cooldown: ${this.sharedHardCooldownTurns} rodada(s).` };
    }

    const parsed = Number(answer);
    if (isNaN(parsed)) return { ok: false, msg: "Informe um numero valido." };

    const activeQuestion = questionTier === "hard" ? this.sharedHardQuestion : player.questionSlots.easy;
    const isCorrect = activeQuestion.check(parsed);
    let bonusMsg = "";

    if (isCorrect) {
      player.correctBoostUntil = Math.max(player.correctBoostUntil, now + POWER_CONFIG.correctBoostMs);
      if (questionTier === "hard") {
        bonusMsg = this._storeRandomPower(player);
        this.sharedHardCooldownTurns = 4;
        this.sharedHardQuestion = createQuestion(this.config.difficulty, "hard");
        this._addEvent(`${player.name} acertou a dificil. Cooldown global de 4 rodadas.`);
      } else {
        this._addEvent(`${player.name} acertou a pergunta comum.`);
      }
    } else {
      this._addEvent(`${player.name} errou. Turno passa para o adversario.`);
    }

    if (questionTier === "easy" && player.easyHintUses > 0 && Math.abs(activeQuestion.result) >= 10) {
      player.easyHintUses -= 1;
    }

    if (questionTier !== "hard" && this.sharedHardCooldownTurns > 0) {
      this.sharedHardCooldownTurns -= 1;
    }

    this.history.push({
      turn: this.turnCount,
      playerName: player.name,
      question: `${questionTier === "easy" ? "[Comum]" : "[Dificil]"} ${activeQuestion.label}`,
      answer: String(parsed),
      resultText: isCorrect ? "Acerto" : "Erro",
      position: `${player.position.toFixed(1)} m / ${this.config.finishDistance} m`
    });
    if (this.history.length > 20) this.history.shift();

    if (questionTier === "easy") {
      player.questionSlots.easy = createQuestion(this.config.difficulty, "easy");
    }

    this.turnCount += 1;
    this.turnIndex = (this.turnIndex + 1) % this.players.length;
    this._lockAnswerForCurrentPlayer();

    const feedback = isCorrect
      ? `Resposta correta!${bonusMsg ? " " + bonusMsg : ""}`
      : `Incorreto. Resposta era ${activeQuestion.result}.`;

    this.emit("answer_result", { socketId, isCorrect, feedback, snapshot: this._snapshot() });
    return { ok: true };
  }

  usePower(socketId) {
    if (this.raceFinished) return { ok: false, msg: "Corrida encerrada." };
    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== this.turnIndex) return { ok: false, msg: "Voce so pode usar poder na sua vez." };

    const player = this.players[playerIndex];
    if (!player.powerInventory.length) return { ok: false, msg: "Slot vazio." };

    const power = player.powerInventory.shift();
    const now = Date.now();
    let msg = "";

    if (power === "easyHint") {
      player.easyHintUses += POWER_CONFIG.easyHintCount;
      msg = `${player.name} ativou dica: ultimo digito nas proximas ${POWER_CONFIG.easyHintCount} perguntas.`;
    } else if (power === "superBoost") {
      player.superBoostUntil = Math.max(player.superBoostUntil, now + POWER_CONFIG.superBoostMs);
      msg = `${player.name} ativou super boost (12 m/s por 5s).`;
    } else {
      const opp = this.players[(playerIndex + 1) % 2];
      opp.slowedUntil = Math.max(opp.slowedUntil, now + POWER_CONFIG.mudMs);
      msg = `${player.name} jogou lama em ${opp.name} (velocidade pela metade por 5s).`;
    }

    this._addEvent(msg);
    this.emit("power_used", { msg, snapshot: this._snapshot() });
    return { ok: true };
  }

  requestNewRace(socketId) {
    this.pendingNewRace.add(socketId);
    const allSockets = this.players.map(p => p.socketId).filter(Boolean);
    if (allSockets.every(id => this.pendingNewRace.has(id))) {
      this.pendingNewRace.clear();
      this._startNewRace();
    } else {
      this.emit("new_race_pending", { waitingFor: allSockets.filter(id => !this.pendingNewRace.has(id)).length });
    }
  }

  _startNewRace() {
    this._stopTick();
    this.players.forEach(p => {
      p.position = 0;
      p.superBoostUntil = 0;
      p.correctBoostUntil = 0;
      p.slowedUntil = 0;
      p.easyHintUses = 0;
      p.powerInventory = [];
      p.questionSlots = { easy: null, hard: null };
      p.answerUnlockAt = 0;
    });
    this.raceFinished = false;
    this.turnIndex = 0;
    this.turnCount = 1;
    this._initQuestionSlots();
    this._addEvent("Nova corrida iniciada.");
    this._lockAnswerForCurrentPlayer();
    this._startTick();
    this.emit("new_race_started", this._snapshot());
  }

  _storeRandomPower(player) {
    const powers = ["easyHint", "superBoost", "mud"];
    const power = powers[Math.floor(Math.random() * powers.length)];
    player.powerInventory.push(power);
    if (player.powerInventory.length > 3) player.powerInventory.shift();
    return `${player.name} guardou: ${getPowerLabel(power)}.`;
  }

  _addEvent(text) {
    this.events.unshift(text);
    if (this.events.length > 10) this.events.pop();
  }

  _snapshot() {
    const now = Date.now();
    return {
      players: this.players.map((p, i) => ({
        name: p.name,
        index: p.index,
        score: p.score,
        position: p.position,
        speed: playerSpeed(p, i === this.turnIndex, now),
        hasSuperBoost: p.superBoostUntil > now,
        hasCorrectBoost: p.correctBoostUntil > now,
        isSlowed: p.slowedUntil > now,
        easyHintUses: p.easyHintUses,
        powerInventory: p.powerInventory,
        powerLabel: p.powerInventory[0] ? getPowerLabel(p.powerInventory[0]) : null,
        answerUnlockAt: p.answerUnlockAt,
        socketId: p.socketId,
      })),
      turnIndex: this.turnIndex,
      turnCount: this.turnCount,
      finishDistance: this.config.finishDistance,
      difficulty: this.config.difficulty,
      difficultyLabel: this._diffLabel(),
      sharedHardCooldownTurns: this.sharedHardCooldownTurns,
      sharedHardQuestion: this.sharedHardQuestion?.toJSON(),
      easyQuestions: this.players.map(p => p.questionSlots.easy?.toJSON() ?? null),
      raceFinished: this.raceFinished,
      history: this.history,
      events: this.events,
    };
  }
}
