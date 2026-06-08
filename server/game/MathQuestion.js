export class MathQuestion {
  constructor(difficulty = "medium") {
    this.difficulty = difficulty;
    this.result = 0;
    this.label = "";
    this.generate();
  }

  randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  randomIntFrom(min, max) {
    if (max < min) return min;
    return this.randomInt(min, max);
  }

  pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  getSymbol(op) {
    return op === "*" ? "x" : op;
  }

  applyOperation(a, b, op) {
    if (op === "+") return a + b;
    if (op === "-") return a - b;
    if (op === "*") return a * b;
    return a / b;
  }

  createExactDivision(maxNumber) {
    const divisor = this.randomIntFrom(2, Math.min(maxNumber, 12));
    const quotient = this.randomIntFrom(1, Math.max(1, Math.floor(maxNumber / divisor)));
    return { a: divisor * quotient, b: divisor, result: quotient };
  }

  createSingleOpQuestion(ops, maxNumber, allowNegative = false) {
    const op = this.pick(ops);
    let a = this.randomInt(0, maxNumber);
    let b = this.randomInt(0, maxNumber);

    if (op === "/") {
      const exact = this.createExactDivision(maxNumber);
      return { label: `${exact.a} / ${exact.b} = ?`, result: exact.result };
    }

    if (op === "-" && !allowNegative && b > a) [a, b] = [b, a];
    return { label: `${a} ${this.getSymbol(op)} ${b} = ?`, result: this.applyOperation(a, b, op) };
  }

  evaluateWithoutParentheses(a, op1, b, op2, c) {
    const highPriority = ["*", "/"];
    if (highPriority.includes(op2) && !highPriority.includes(op1)) {
      return this.applyOperation(a, this.applyOperation(b, c, op2), op1);
    }
    return this.applyOperation(this.applyOperation(a, b, op1), c, op2);
  }

  createEasyQuestion() {
    return this.createSingleOpQuestion(["+", "-"], 20, false);
  }

  createMediumQuestion() {
    if (Math.random() >= 0.55) return this.createSingleOpQuestion(["+", "-", "*"], 50, false);
    const a = this.randomInt(0, 50), b = this.randomInt(0, 50), c = this.randomInt(0, 50);
    const op1 = this.pick(["+", "-", "*"]), op2 = this.pick(["+", "-", "*"]);
    return {
      label: `${a} ${this.getSymbol(op1)} ${b} ${this.getSymbol(op2)} ${c} = ?`,
      result: this.evaluateWithoutParentheses(a, op1, b, op2, c)
    };
  }

  createHardQuestion() {
    if (Math.random() >= 0.75) {
      const op = this.pick(["+", "-", "*", "/"]);
      if (op === "*") {
        const f1 = this.randomInt(1, 9), f2 = this.randomInt(0, 100);
        const swap = Math.random() < 0.5;
        const a = swap ? f1 : f2, b = swap ? f2 : f1;
        return { label: `${a} x ${b} = ?`, result: a * b };
      }
      if (op === "/") {
        const exact = this.createExactDivision(100);
        return { label: `${exact.a} / ${exact.b} = ?`, result: exact.result };
      }
      let a = this.randomInt(0, 100), b = this.randomInt(0, 100);
      if (op === "-" && b > a) [a, b] = [b, a];
      return { label: `${a} ${this.getSymbol(op)} ${b} = ?`, result: this.applyOperation(a, b, op) };
    }

    const op1 = this.pick(["+", "-", "*", "/"]);
    const op2Pool = op1 === "*" ? ["+", "-", "/"] : ["+", "-", "*", "/"];
    const op2 = this.pick(op2Pool);
    const useParens = Math.random() < 0.5;

    let a = this.randomInt(0, 100), b = this.randomInt(0, 100), c = this.randomInt(1, 100);

    if (useParens) {
      if (op1 === "/") { const e = this.createExactDivision(100); a = e.a; b = e.b; }
      else if (op1 === "*") { const f = this.randomInt(1, 9); const o = this.randomInt(0, 100); a = Math.random() < 0.5 ? f : o; b = Math.random() < 0.5 ? o : f; }
      else if (op1 === "-" && b > a) [a, b] = [b, a];
      const first = this.applyOperation(a, b, op1);
      if (op2 === "/") {
        const divs = []; const abs = Math.abs(first);
        for (let i = 1; i <= Math.min(100, abs || 1); i++) if (abs % i === 0) divs.push(i);
        c = divs.length ? this.pick(divs) : 1;
      }
      return { label: `(${a} ${this.getSymbol(op1)} ${b}) ${this.getSymbol(op2)} ${c} = ?`, result: this.applyOperation(first, c, op2) };
    }

    if (op1 === "/") { const e = this.createExactDivision(100); a = e.a; b = e.b; }
    else if (op1 === "*") { const f = this.randomInt(1, 9); const o = this.randomInt(0, 100); a = Math.random() < 0.5 ? f : o; b = Math.random() < 0.5 ? o : f; }
    else if (op1 === "-" && b > a) [a, b] = [b, a];
    if (op2 === "/") {
      c = this.randomIntFrom(2, 12);
      if (op1 === "+" || op1 === "-") { const q = this.randomIntFrom(1, Math.max(1, Math.floor(100 / c))); b = q * c; if (op1 === "-") a = this.randomIntFrom(b, 100); }
      else if (op1 === "*") { const f = this.randomIntFrom(1, Math.max(1, Math.floor(100 / c))); a = f * c; }
    }
    if (op2 === "*") { const f = this.randomInt(1, 9); c = f; }
    return { label: `${a} ${this.getSymbol(op1)} ${b} ${this.getSymbol(op2)} ${c} = ?`, result: this.evaluateWithoutParentheses(a, op1, b, op2, c) };
  }

  createVeryHardQuestion() {
    const ops = ["+", "-", "*", "/"];
    let op1 = this.pick(ops), op2 = this.pick(ops), op3 = this.pick(ops);
    if (![op1, op2, op3].includes("/")) {
      const i = this.randomInt(1, 3);
      if (i === 1) op1 = "/"; else if (i === 2) op2 = "/"; else op3 = "/";
    }

    let a = this.randomInt(0, 100), b = this.randomInt(1, 100), c = this.randomInt(1, 100), d = this.randomInt(1, 100);
    if (op1 === "/") { const e = this.createExactDivision(100); a = e.a; b = e.b; }
    else if (op1 === "-" && b > a) [a, b] = [b, a];

    const first = this.applyOperation(a, b, op1);
    if (op2 === "/") {
      const abs = Math.abs(first); const divs = [];
      for (let i = 1; i <= Math.min(100, abs <= 1 ? 1 : abs); i++) if (abs % i === 0) divs.push(i);
      c = divs.length ? this.pick(divs) : 1;
    }
    const second = this.applyOperation(first, c, op2);
    if (op3 === "/") {
      const abs = Math.abs(second); const divs = [];
      for (let i = 1; i <= Math.min(100, abs <= 1 ? 1 : abs); i++) if (abs % i === 0) divs.push(i);
      d = divs.length ? this.pick(divs) : 1;
    }
    return {
      label: `((${a} ${this.getSymbol(op1)} ${b}) ${this.getSymbol(op2)} ${c}) ${this.getSymbol(op3)} ${d} = ?`,
      result: this.applyOperation(second, d, op3)
    };
  }

  generate() {
    let q;
    if (this.difficulty === "easy") q = this.createEasyQuestion();
    else if (this.difficulty === "medium") q = this.createMediumQuestion();
    else if (this.difficulty === "hard") q = this.createHardQuestion();
    else q = this.createVeryHardQuestion();
    this.result = q.result;
    this.label = q.label;
  }

  check(answer) {
    return Number(answer) === this.result;
  }

  toJSON() {
    return { label: this.label };
  }
}
