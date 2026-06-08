import { useState, useRef } from "react";
import PlayerCard from "../components/PlayerCard.jsx";
import Track from "../components/Track.jsx";
import HistoryTable from "../components/HistoryTable.jsx";
import EventLog from "../components/EventLog.jsx";

export default function GamePage({
  snapshot, playerIndex, actionError, waitingCount, disconnected,
  onSubmitAnswer, onUsePower, onNewRace,
}) {
  const [answer, setAnswer] = useState("");
  const inputRef = useRef(null);

  if (!snapshot) return <div className="loading">Carregando jogo...</div>;

  const { players, turnIndex, finishDistance, difficultyLabel, sharedHardQuestion,
    easyQuestions, sharedHardCooldownTurns, raceFinished, history, events } = snapshot;

  const myPlayer = players[playerIndex];
  const isMyTurn = turnIndex === playerIndex;
  const now = Date.now();
  const answerLocked = isMyTurn && myPlayer.answerUnlockAt > now;

  const easyHint = (() => {
    if (!isMyTurn || myPlayer.easyHintUses <= 0) return "";
    const q = easyQuestions[playerIndex];
    if (!q) return "";
    // hint is shown server-side via label; we just indicate usage remaining
    return ` (Dica disponivel: ${myPlayer.easyHintUses}x)`;
  })();

  function handleSubmit(tier) {
    if (!answer.trim()) return;
    onSubmitAnswer(tier, answer.trim());
    setAnswer("");
    inputRef.current?.focus();
  }

  const requestedNewRace = waitingCount !== null;

  return (
    <div className="game-page">
      <header className="topbar">
        <h1>MathKart</h1>
        <span className="difficulty-tag">Dificuldade: {difficultyLabel}</span>
      </header>

      <section className="scoreboard">
        {players.map((p, i) => (
          <PlayerCard
            key={i}
            player={p}
            isActive={turnIndex === i}
            isMe={playerIndex === i}
            onUsePower={playerIndex === i ? onUsePower : null}
            raceFinished={raceFinished}
          />
        ))}
      </section>

      <Track players={players} finishDistance={finishDistance} />

      <section className="question-box" data-turn={turnIndex}>
        <p className="turn-info">
          {isMyTurn ? "Sua vez!" : `Vez de ${players[turnIndex].name}`}
        </p>

        <div className="question-list">
          <article className="question-item">
            <p className="question-kind">Pergunta comum</p>
            <p className="question-text">
              {easyQuestions[isMyTurn ? playerIndex : turnIndex]?.label ?? "..."}
              {isMyTurn && myPlayer.easyHintUses > 0 && (
                <span className="hint-badge"> [dica: {myPlayer.easyHintUses}x]</span>
              )}
            </p>
            {isMyTurn && (
              <button
                className="answer-kind-btn"
                disabled={answerLocked || raceFinished}
                onClick={() => handleSubmit("easy")}
              >
                Responder comum
              </button>
            )}
          </article>

          <article className="question-item hard">
            <p className="question-kind">Pergunta dificil (compartilhada)</p>
            <p className="question-text">
              {sharedHardQuestion?.label ?? "..."}
              {sharedHardCooldownTurns > 0 && (
                <span className="cooldown-badge"> [cooldown: {sharedHardCooldownTurns} rodada(s)]</span>
              )}
            </p>
            {isMyTurn && (
              <button
                className="answer-kind-btn hard"
                disabled={answerLocked || raceFinished || sharedHardCooldownTurns > 0}
                onClick={() => handleSubmit("hard")}
              >
                Responder dificil
              </button>
            )}
          </article>
        </div>

        {isMyTurn && !raceFinished && (
          <div className="answer-area">
            <input
              ref={inputRef}
              type="number"
              className="answer-input"
              placeholder="Sua resposta"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSubmit("easy"); }}
              disabled={answerLocked}
            />
            {answerLocked && <p className="lock-info">Aguarde 1s para responder...</p>}
          </div>
        )}

        {actionError && <p className="feedback fail">{actionError}</p>}

        {raceFinished && (
          <div className="race-end">
            <p className="winner-msg">
              {players.find(p => p.position >= finishDistance)?.name ?? "?"} venceu a corrida!
            </p>
            <button className="primary-btn" onClick={onNewRace} disabled={requestedNewRace || disconnected}>
              {requestedNewRace
                ? `Aguardando o outro jogador... (${waitingCount} restante(s))`
                : "Proxima corrida"}
            </button>
          </div>
        )}

        {disconnected && <p className="feedback fail">Conexao encerrada — o outro jogador saiu.</p>}
      </section>

      <section className="panels">
        <HistoryTable history={history} />
        <EventLog events={events} />
      </section>
    </div>
  );
}
