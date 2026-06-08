export default function PlayerCard({ player, isActive, isMe, onUsePower, raceFinished }) {
  const states = [];
  if (player.hasSuperBoost) states.push("Super boost");
  if (player.hasCorrectBoost) states.push("Acerto: 13km/h");
  if (player.isSlowed) states.push("Lama");

  return (
    <article className={`player-card${isActive ? " active" : ""}${isMe ? " me" : ""}`}>
      <h2>{player.name} {isMe && <span className="you-tag">(voce)</span>}</h2>
      <p className="score-label">Pontos</p>
      <p className="score">{player.score}</p>
      <p className="speed-info">
        {player.speed.toFixed(1)} m/s
        {states.length > 0 && ` | ${states.join(" | ")}`}
      </p>
      <div className="power-slot">
        <p className="power-label">
          {player.powerLabel ? `Slot: ${player.powerLabel}${player.powerInventory.length > 1 ? ` (+${player.powerInventory.length - 1})` : ""}` : "Slot: vazio"}
        </p>
        {onUsePower && (
          <button
            className="use-power-btn"
            onClick={onUsePower}
            disabled={raceFinished || !isActive || !player.powerInventory.length}
          >
            Usar poder
          </button>
        )}
      </div>
    </article>
  );
}
