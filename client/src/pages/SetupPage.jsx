import { useState } from "react";

export default function SetupPage({ error, onClearError, onCreate, onJoin }) {
  const [tab, setTab] = useState("create"); // create | join
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [finishDistance, setFinishDistance] = useState(12);
  const [joinCode, setJoinCode] = useState("");

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), difficulty, Number(finishDistance));
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !joinCode.trim()) return;
    onJoin(name.trim(), joinCode.trim());
  }

  return (
    <div className="setup-page">
      <header className="setup-header">
        <h1>MathKart</h1>
        <p className="setup-subtitle">Corrida matematica multijogador</p>
      </header>

      <div className="setup-tabs">
        <button
          className={`tab-btn${tab === "create" ? " active" : ""}`}
          onClick={() => { setTab("create"); onClearError(); }}
        >
          Criar sala
        </button>
        <button
          className={`tab-btn${tab === "join" ? " active" : ""}`}
          onClick={() => { setTab("join"); onClearError(); }}
        >
          Entrar em sala
        </button>
      </div>

      {tab === "create" ? (
        <form className="setup-form" onSubmit={handleCreate}>
          <label>
            Seu nome
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Alice" maxLength={20} required />
          </label>

          <label>
            Dificuldade
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              <option value="easy">Facil</option>
              <option value="medium">Medio</option>
              <option value="hard">Dificil</option>
            </select>
          </label>

          <label>
            Distancia da corrida ({finishDistance} casas)
            <input
              type="range" min={8} max={100} value={finishDistance}
              onChange={e => setFinishDistance(e.target.value)}
            />
          </label>

          {error && <p className="setup-error">{error}</p>}
          <button type="submit" className="primary-btn">Criar sala</button>
        </form>
      ) : (
        <form className="setup-form" onSubmit={handleJoin}>
          <label>
            Seu nome
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Bob" maxLength={20} required />
          </label>

          <label>
            Codigo da sala
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Ex: A3BX"
              maxLength={4}
              required
            />
          </label>

          {error && <p className="setup-error">{error}</p>}
          <button type="submit" className="primary-btn">Entrar</button>
        </form>
      )}
    </div>
  );
}
