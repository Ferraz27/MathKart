class SetupController {
  constructor(formId, errorId) {
    this.form = document.getElementById(formId);
    this.errorBox = document.getElementById(errorId);
  }

  init() {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.startGame();
    });
  }

  startGame() {
    const player1 = this.form.player1.value.trim();
    const player2 = this.form.player2.value.trim();
    const finishDistance = Number(this.form.finishDistance.value);
    const difficulty = String(this.form.difficulty.value || "medium");

    if (!player1 || !player2) {
      this.showError("Informe os nomes dos dois jogadores.");
      return;
    }

    if (player1.toLowerCase() === player2.toLowerCase()) {
      this.showError("Use nomes diferentes para os jogadores.");
      return;
    }

    if (!Number.isInteger(finishDistance) || finishDistance < 8 || finishDistance > 100) {
      this.showError("A distancia deve estar entre 8 e 100 casas.");
      return;
    }

    if (!["easy", "medium", "hard"].includes(difficulty)) {
      this.showError("Dificuldade invalida.");
      return;
    }

    const query = new URLSearchParams({
      p1: player1,
      p2: player2,
      d: String(finishDistance),
      level: difficulty
    });

    window.location.href = `jogo.html?${query.toString()}`;
  }

  showError(message) {
    this.errorBox.textContent = message;
  }
}

const setupController = new SetupController("setupForm", "setupError");
setupController.init();
