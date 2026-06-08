import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { RaceGame } from "./game/RaceGame.js";

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// rooms: Map<roomCode, { game: RaceGame|null, players: [{socketId, name}], config }>
const rooms = new Map();

function generateCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function broadcastToRoom(roomCode, event, payload) {
  io.to(roomCode).emit(event, payload);
}

io.on("connection", (socket) => {
  let currentRoom = null;

  socket.on("create_room", ({ name, difficulty, finishDistance }) => {
    if (!name?.trim()) return socket.emit("room_error", "Informe seu nome.");

    let code;
    do { code = generateCode(); } while (rooms.has(code));

    const config = {
      player1: name.trim(),
      player2: null,
      difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
      finishDistance: Math.min(Math.max(Number(finishDistance) || 12, 8), 100) * 30,
    };

    rooms.set(code, { game: null, config, players: [{ socketId: socket.id, name: name.trim() }] });
    socket.join(code);
    currentRoom = code;
    socket.emit("room_created", { roomCode: code, playerIndex: 0 });
  });

  socket.on("join_room", ({ name, roomCode }) => {
    const code = (roomCode || "").toUpperCase().trim();
    if (!name?.trim()) return socket.emit("room_error", "Informe seu nome.");
    if (!rooms.has(code)) return socket.emit("room_error", `Sala "${code}" nao encontrada.`);

    const room = rooms.get(code);
    if (room.players.length >= 2) return socket.emit("room_error", "Sala cheia.");
    if (room.game) return socket.emit("room_error", "Jogo ja em andamento.");

    const trimmedName = name.trim();
    if (room.players[0].name.toLowerCase() === trimmedName.toLowerCase()) {
      return socket.emit("room_error", "Use um nome diferente do outro jogador.");
    }

    room.players.push({ socketId: socket.id, name: trimmedName });
    room.config.player2 = trimmedName;
    socket.join(code);
    currentRoom = code;
    socket.emit("room_joined", { roomCode: code, playerIndex: 1 });

    // Both players present — start game
    const emit = (event, payload) => broadcastToRoom(code, event, payload);
    room.game = new RaceGame(room.config, emit);
    room.game.players[0].socketId = room.players[0].socketId;
    room.game.players[1].socketId = room.players[1].socketId;
    room.game.start();
  });

  socket.on("submit_answer", ({ questionTier, answer }) => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room?.game) return;
    const result = room.game.submitAnswer(socket.id, questionTier, String(answer));
    if (!result.ok) socket.emit("action_error", result.msg);
  });

  socket.on("use_power", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room?.game) return;
    const result = room.game.usePower(socket.id);
    if (!result.ok) socket.emit("action_error", result.msg);
  });

  socket.on("request_new_race", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room?.game?.raceFinished) return;
    room.game.requestNewRace(socket.id);
  });

  socket.on("disconnect", () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.game?._stopTick?.();
    broadcastToRoom(currentRoom, "player_disconnected", { msg: "Um jogador desconectou. A sala foi encerrada." });
    rooms.delete(currentRoom);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`MathKart server listening on port ${PORT}`));
