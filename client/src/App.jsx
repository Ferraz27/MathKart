import { useState, useEffect } from "react";
import { socket } from "./socket.js";
import SetupPage from "./pages/SetupPage.jsx";
import GamePage from "./pages/GamePage.jsx";

export default function App() {
  const [phase, setPhase] = useState("setup"); // setup | waiting | game
  const [roomCode, setRoomCode] = useState(null);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [snapshot, setSnapshot] = useState(null);
  const [setupError, setSetupError] = useState("");
  const [actionError, setActionError] = useState("");
  const [waitingCount, setWaitingCount] = useState(null);
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on("room_created", ({ roomCode, playerIndex }) => {
      setRoomCode(roomCode);
      setPlayerIndex(playerIndex);
      setPhase("waiting");
      setSetupError("");
    });

    socket.on("room_joined", ({ roomCode, playerIndex }) => {
      setRoomCode(roomCode);
      setPlayerIndex(playerIndex);
      setSetupError("");
    });

    socket.on("room_error", (msg) => setSetupError(msg));

    socket.on("game_started", (snap) => {
      setSnapshot(snap);
      setPhase("game");
    });

    socket.on("game_state", (snap) => setSnapshot(snap));

    socket.on("answer_result", ({ snapshot }) => setSnapshot(snapshot));

    socket.on("race_finished", (snap) => setSnapshot(snap));

    socket.on("power_used", ({ snapshot }) => setSnapshot(snapshot));

    socket.on("new_race_pending", ({ waitingFor }) => setWaitingCount(waitingFor));

    socket.on("new_race_started", (snap) => {
      setSnapshot(snap);
      setWaitingCount(null);
    });

    socket.on("action_error", (msg) => {
      setActionError(msg);
      setTimeout(() => setActionError(""), 3000);
    });

    socket.on("player_disconnected", ({ msg }) => {
      setDisconnected(true);
      setActionError(msg);
    });

    return () => socket.removeAllListeners();
  }, []);

  if (phase === "setup") {
    return (
      <SetupPage
        error={setupError}
        onClearError={() => setSetupError("")}
        onCreate={(name, difficulty, finishDistance) => {
          setSetupError("");
          socket.emit("create_room", { name, difficulty, finishDistance });
        }}
        onJoin={(name, roomCode) => {
          setSetupError("");
          socket.emit("join_room", { name, roomCode });
        }}
      />
    );
  }

  if (phase === "waiting") {
    return (
      <div className="waiting-screen">
        <h1>MathKart</h1>
        <p>Sala criada com sucesso!</p>
        <p>Compartilhe o codigo com o outro jogador:</p>
        <div className="room-code">{roomCode}</div>
        <p className="waiting-hint">Aguardando o segundo jogador entrar...</p>
      </div>
    );
  }

  return (
    <GamePage
      snapshot={snapshot}
      playerIndex={playerIndex}
      actionError={actionError}
      waitingCount={waitingCount}
      disconnected={disconnected}
      onSubmitAnswer={(tier, answer) => socket.emit("submit_answer", { questionTier: tier, answer })}
      onUsePower={() => socket.emit("use_power")}
      onNewRace={() => socket.emit("request_new_race")}
    />
  );
}
