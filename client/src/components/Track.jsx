const CAR_EMOJIS = ["🏎️", "🚗"];
const CAR_COLORS = ["#e63946", "#457b9d"];

export default function Track({ players, finishDistance }) {
  return (
    <section className="track-wrap">
      {players.map((player, i) => {
        const progress = Math.min(player.position / finishDistance, 1);
        return (
          <div key={i} className="track-lane">
            <span className="lane-label">{player.name}</span>
            <div className="lane-bar">
              <div
                className={`car-marker${player.hasSuperBoost ? " nitro" : ""}`}
                style={{
                  left: `calc(${progress * 100}% - 24px)`,
                  color: CAR_COLORS[i],
                  transition: "left 0.08s linear",
                }}
              >
                {CAR_EMOJIS[i]}
              </div>
              <div className="finish-flag">🏁</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
